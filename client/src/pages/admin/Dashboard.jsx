import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import WorklistTable from '../../components/common/WorklistTable/WorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import api from '../../services/api';
import { RefreshCw, Plus, Shield, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { currentUser, currentOrganizationContext } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [currentView, setCurrentView] = useState('all');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [availableAssignees, setAvailableAssignees] = useState({ radiologists: [], verifiers: [] });

  // ✅ CATEGORY-BASED API VALUES
  const [categoryValues, setCategoryValues] = useState({
    all: 0,
    created: 0,
    history_created: 0,
    unassigned: 0,
    assigned: 0,
    pending: 0,
    draft: 0,
    verification_pending: 0,
    final: 0,
    urgent: 0,
    reprint_need: 0
  });

  // Column configuration
  const getDefaultColumnConfig = () => ({
    checkbox: { visible: true, order: 1, label: 'Select' },
    bharatPacsId: { visible: true, order: 2, label: 'BP ID' },
    centerName: { visible: true, order: 3, label: 'Center' },
    patientName: { visible: true, order: 4, label: 'Patient Name' },
    patientId: { visible: true, order: 5, label: 'Patient ID' },
    ageGender: { visible: true, order: 6, label: 'Age/Sex' },
    modality: { visible: true, order: 7, label: 'Modality' },
    seriesCount: { visible: true, order: 8, label: 'Series' },
    accessionNumber: { visible: true, order: 9, label: 'Acc. No.' },
    referralDoctor: { visible: false, order: 10, label: 'Referral Dr.' },
    clinicalHistory: { visible: false, order: 11, label: 'History' },
    studyTime: { visible: true, order: 12, label: 'Study Time' },
    uploadTime: { visible: true, order: 13, label: 'Upload Time' },
    radiologist: { visible: true, order: 14, label: 'Radiologist' },
    caseStatus: { visible: true, order: 15, label: 'Status' },
    actions: { visible: true, order: 16, label: 'Actions' }
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('adminWorklistColumnConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return { ...getDefaultColumnConfig(), ...parsedConfig };
      }
    } catch (error) {
      console.warn('Error loading admin column config:', error);
    }
    return getDefaultColumnConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem('adminWorklistColumnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.warn('Error saving admin column config:', error);
    }
  }, [columnConfig]);

  // ✅ CATEGORY-BASED ENDPOINT MAPPING
  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'created': return '/admin/studies/category/created';
      case 'history_created': return '/admin/studies/category/history-created';
      case 'unassigned': return '/admin/studies/category/unassigned';
      case 'assigned': return '/admin/studies/category/assigned';
      case 'pending': return '/admin/studies/category/pending';
      case 'draft': return '/admin/studies/category/draft';
      case 'verification_pending': return '/admin/studies/category/verification-pending';
      case 'final': return '/admin/studies/category/final';
      case 'urgent': return '/admin/studies/category/urgent';
      case 'reprint_need': return '/admin/studies/category/reprint-need';
      default: return '/admin/studies';
    }
  }, [currentView]);

  // ✅ FETCH STUDIES BY CATEGORY
  const fetchStudies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = getApiEndpoint();
      const activeFilters = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      const params = { ...activeFilters };
      delete params.category; // Remove category since endpoints handle this
    
      console.log('🔍 [Admin] Fetching studies with params:', {
        endpoint,
        params,
        currentView,
        searchFilters,
        passedFilters: filters
      });
      
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        const rawStudies = response.data.data || [];
        console.log('🔍 [Admin] Raw studies fetched:', rawStudies);
        
        const formattedStudies = formatStudiesForWorklist(rawStudies);
        console.log(formattedStudies);
        setStudies(formattedStudies);
        
        console.log('✅ [Admin] Studies fetched:', {
          raw: rawStudies.length,
          formatted: formattedStudies.length,
          endpoint,
          appliedParams: params,
          currentView
        });
      }
    } catch (err) {
      console.error('❌ [Admin] Error fetching studies:', err);
      setError('Failed to fetch studies.');
      setStudies([]);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, searchFilters, currentView]);

  // ✅ FETCH CATEGORY VALUES
  const fetchCategoryValues = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      console.log('🔍 [Admin] Fetching category values with params:', params);
      
      const response = await api.get('/admin/category-values', { params });
      if (response.data.success) {
        setCategoryValues({
          all: response.data.all || 0,
          created: response.data.created || 0,
          history_created: response.data.history_created || 0,
          unassigned: response.data.unassigned || 0,
          assigned: response.data.assigned || 0,
          pending: response.data.pending || 0,
          draft: response.data.draft || 0,
          verification_pending: response.data.verification_pending || 0,
          final: response.data.final || 0,
          urgent: response.data.urgent || 0,
          reprint_need: response.data.reprint_need || 0
        });

        console.log('📊 [Admin] CATEGORY VALUES UPDATED:', response.data);
      }
    } catch (error) {
      console.error('Error fetching category values:', error);
      setCategoryValues({
        all: 0, created: 0, history_created: 0, unassigned: 0, assigned: 0,
        pending: 0, draft: 0, verification_pending: 0, final: 0, urgent: 0, reprint_need: 0
      });
    }
  }, [searchFilters]);

  // ✅ FETCH AVAILABLE ASSIGNEES
  const fetchAvailableAssignees = useCallback(async () => {
    try {
      const response = await api.get('/assigner/available-assignees');
      console.log(response)
      if (response.data.success) {
        setAvailableAssignees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  }, []);

  // ✅ INITIAL DATA FETCH WITH TODAY AS DEFAULT
  useEffect(() => {
    const defaultFilters = {
      dateFilter: 'today',
      dateType: 'createdAt',
      modality: 'all',
      labId: 'all',
      priority: 'all',
      limit: 50
    };
    
    setSearchFilters(defaultFilters);
    fetchStudies(defaultFilters);
    fetchCategoryValues(defaultFilters);
    fetchAvailableAssignees();
  }, []);

  // ✅ FETCH STUDIES WHEN CURRENT VIEW CHANGES
  useEffect(() => {
    console.log(`🔄 [Admin] currentView changed to: ${currentView}`);
    fetchStudies(searchFilters);
  }, [currentView, fetchStudies]);

  // Handlers
  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 [Admin] NEW SEARCH PARAMS:', searchParams);
    setSearchFilters(searchParams);
    
    fetchStudies(searchParams);
    fetchCategoryValues(searchParams);
  }, [fetchStudies, fetchCategoryValues]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 [Admin] FILTER CHANGE:', filters);
    setSearchFilters(filters);
    
    fetchStudies(filters);
    fetchCategoryValues(filters);
  }, [fetchStudies, fetchCategoryValues]);
  
  // ✅ HANDLE VIEW CHANGE
  const handleViewChange = useCallback((view) => {
    console.log(`📊 [Admin] CATEGORY CHANGE: ${currentView} -> ${view}`);
    setCurrentView(view);
    setSelectedStudies([]);
    
    setSearchFilters(prevFilters => {
      const preservedFilters = {
        dateFilter: prevFilters.dateFilter,
        dateType: prevFilters.dateType,
        customDateFrom: prevFilters.customDateFrom,
        customDateTo: prevFilters.customDateTo,
        modality: prevFilters.modality,
        labId: prevFilters.labId,
        priority: prevFilters.priority,
        limit: prevFilters.limit,
      };
      
      const cleanedFilters = Object.fromEntries(
        Object.entries(preservedFilters).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      fetchCategoryValues(cleanedFilters);
      return cleanedFilters;
    });
  }, [currentView, fetchCategoryValues]);

  const handleSelectAll = useCallback((checked) => {
    setSelectedStudies(checked ? studies.map(study => study._id) : []);
  }, [studies]);

  const handleSelectStudy = useCallback((studyId) => {
    setSelectedStudies(prev => 
      prev.includes(studyId) 
        ? prev.filter(id => id !== studyId) 
        : [...prev, studyId]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 [Admin] Manual refresh');
    fetchStudies(searchFilters);
    fetchCategoryValues(searchFilters);
    fetchAvailableAssignees();
  }, [fetchStudies, fetchCategoryValues, fetchAvailableAssignees, searchFilters]);

  const handleCreateStudy = useCallback(() => {
    console.log('Create new study');
    toast.success('Study creation feature coming soon');
  }, []);

  const handleAssignmentSubmit = useCallback(async (assignmentData) => {
    try {
      const { study, assignedToIds, assigneeRole, priority, notes, dueDate } = assignmentData;
      
      console.log('🔄 [Admin] Submitting assignment:', {
        studyId: study._id,
        assignedToIds,
        assigneeRole,
        priority
      });
      
      const response = await api.post(`/assigner/update-study-assignments/${study._id}`, {
        assignedToIds,
        assigneeRole,
        priority,
        notes,
        dueDate
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchStudies(searchFilters);
        fetchCategoryValues(searchFilters);
      }
    } catch (error) {
      console.error('Admin assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to update assignments');
    }
  }, [fetchStudies, searchFilters, fetchCategoryValues]);

  const handleColumnChange = useCallback((columnKey, visible) => {
    setColumnConfig(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        visible
      }
    }));
  }, []);

  const handleResetColumns = useCallback(() => {
    const defaultConfig = getDefaultColumnConfig();
    setColumnConfig(defaultConfig);
  }, []);

  const handleUpdateStudyDetails = useCallback(async (formData) => {
    try {
      console.log('🔄 Updating study details:', formData);
      
      const response = await api.put(`/admin/studies/${formData.studyId}/details`, {
        patientName: formData.patientName,
        patientAge: formData.patientAge,
        patientGender: formData.patientGender,
        studyName: formData.studyName,
        referringPhysician: formData.referringPhysician,
        accessionNumber: formData.accessionNumber,
        clinicalHistory: formData.clinicalHistory
      });

      if (response.data.success) {
        toast.success('Study details updated successfully');
        fetchStudies(searchFilters);
        fetchCategoryValues(searchFilters);
      }
    } catch (error) {
      console.error('Error updating study details:', error);
      toast.error(error.response?.data?.message || 'Failed to update study details');
      throw error;
    }
  }, [fetchStudies, searchFilters, fetchCategoryValues]);

  const handleToggleStudyLock = useCallback(async (studyId, shouldLock) => {
    try {
      // Refresh studies after lock toggle
      await fetchStudies();
    } catch (error) {
      console.error('Lock toggle failed:', error);
    }
  }, [fetchStudies]);

  const additionalActions = [
    {
      label: 'System Overview',
      icon: Database,
      onClick: () => navigate('/admin/system-overview'),
      variant: 'secondary',
      tooltip: 'View comprehensive system overview'
    },
    {
      label: 'Admin Panel',
      icon: Shield,
      onClick: () => console.log('Open admin panel'),
      variant: 'primary',
      tooltip: 'Open admin panel'
    },
    {
      label: 'Create Study',
      icon: Plus,
      onClick: handleCreateStudy,
      variant: 'success',
      tooltip: 'Create a new study'
    }
  ];

  // ✅ CATEGORY TABS CONFIGURATION
  const categoryTabs = [
    { key: 'all', label: 'All', count: categoryValues.all, color: 'bg-gray-100 text-gray-800' },
    { key: 'created', label: 'Created', count: categoryValues.created, color: 'bg-blue-100 text-blue-800' },
    { key: 'history_created', label: 'History Created', count: categoryValues.history_created, color: 'bg-cyan-100 text-cyan-800' },
    { key: 'unassigned', label: 'Unassigned', count: categoryValues.unassigned, color: 'bg-orange-100 text-orange-800' },
    { key: 'assigned', label: 'Assigned', count: categoryValues.assigned, color: 'bg-purple-100 text-purple-800' },
    { key: 'pending', label: 'Pending', count: categoryValues.pending, color: 'bg-yellow-100 text-yellow-800' },
    { key: 'draft', label: 'Draft', count: categoryValues.draft, color: 'bg-amber-100 text-amber-800' },
    { key: 'verification_pending', label: 'Verification', count: categoryValues.verification_pending, color: 'bg-indigo-100 text-indigo-800' },
    { key: 'final', label: 'Final', count: categoryValues.final, color: 'bg-green-100 text-green-800' },
    { key: 'urgent', label: 'Urgent', count: categoryValues.urgent, color: 'bg-red-100 text-red-800' },
    { key: 'reprint_need', label: 'Reprint', count: categoryValues.reprint_need, color: 'bg-pink-100 text-pink-800' }
  ];

  return (
    <div className="h-screen bg-teal-50 flex flex-col">
      <Navbar
        title="Admin Dashboard"
        subtitle={`${currentOrganizationContext === 'global' ? 'Global View' : currentOrganizationContext || 'Organization View'} • PACS Administration`}
        showOrganizationSelector={true}
        onRefresh={handleRefresh}
        additionalActions={additionalActions}
        notifications={0}
        theme="admin"
      />
      
      <Search
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        loading={loading}
        totalStudies={categoryValues.all}
        currentCategory={currentView}
        theme="admin"
      />

      <div className="flex-1 min-h-0 p-0 px-0">
        <div className="bg-white rounded-lg shadow-sm border border-teal-100 h-full flex flex-col">
          
          {/* ✅ WORKLIST HEADER WITH CATEGORY TABS */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-teal-200 bg-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wide">
                ADMIN WORKLIST
              </h2>
              <span className="text-xs text-teal-700 bg-white px-2 py-1 rounded border border-teal-200">
                {studies.length} studies loaded
              </span>
              {selectedStudies.length > 0 && (
                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                  {selectedStudies.length} selected
                </span>
              )}
            </div>

            {/* ✅ CATEGORY TABS - SCROLLABLE */}
            <div className="flex-1 mx-4 overflow-x-auto">
              <div className="flex items-center space-x-1 min-w-max">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleViewChange(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                      currentView === tab.key
                        ? 'bg-teal-600 text-white shadow-md scale-105'
                        : `${tab.color} hover:shadow-sm`
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-bold ${
                      currentView === tab.key 
                        ? 'bg-white text-teal-600' 
                        : 'bg-white bg-opacity-50'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <ColumnConfigurator
                columnConfig={columnConfig}
                onColumnChange={handleColumnChange}
                onResetToDefault={handleResetColumns}
                theme="admin"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <WorklistTable
              studies={studies}
              loading={loading}
              columnConfig={columnConfig}
              selectedStudies={selectedStudies}
              onSelectAll={handleSelectAll}
              onSelectStudy={handleSelectStudy}
              onPatienIdClick={(patientId, study) => console.log('Patient clicked:', patientId)}
              onAssignDoctor={(study) => console.log('Assign doctor:', study._id)}
              availableAssignees={availableAssignees}
              onAssignmentSubmit={handleAssignmentSubmit}
              onUpdateStudyDetails={handleUpdateStudyDetails} // ✅ NEW
              userRole={currentUser?.role || 'viewer'} // ✅ PASS USER ROLE
              onToggleStudyLock={handleToggleStudyLock} // ✅ PASS LOCK HANDLER
              theme="admin"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;