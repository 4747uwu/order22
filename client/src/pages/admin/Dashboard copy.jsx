import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import WorklistTable from '../../components/common/WorklistTable/WorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import api from '../../services/api';
import { RefreshCw, Plus, Shield, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter'; // ✅ ADD STUDY FORMATTER
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

  // ✅ ADD: API VALUES STATE (like assigner dashboard)
  const [apiValues, setApiValues] = useState({
    total: 0,
    pending: 0,
    inprogress: 0,
    completed: 0
  });

  // ✅ USE API VALUES for tab counts (instead of local calculation)
  const statusCounts = useMemo(() => ({
    all: apiValues.total,
    pending: apiValues.pending,
    inprogress: apiValues.inprogress,
    completed: apiValues.completed
  }), [apiValues]);

  // Column configuration
  const getDefaultColumnConfig = () => ({
    checkbox: { visible: true, order: 1, label: 'Select' },
    workflowStatus: { visible: true, order: 2, label: 'Status' },
    patientId: { visible: true, order: 3, label: 'Patient ID' },
    patientName: { visible: true, order: 4, label: 'Patient Name' },
    ageGender: { visible: true, order: 5, label: 'Age/Sex' },
    studyDescription: { visible: true, order: 6, label: 'Description' },
    seriesCount: { visible: true, order: 7, label: 'Series' },
    modality: { visible: true, order: 8, label: 'Modality' },
    location: { visible: true, order: 9, label: 'Location' },
    studyDate: { visible: true, order: 10, label: 'Study Date' },
    uploadDate: { visible: false, order: 11, label: 'Upload Date' },
    reportedDate: { visible: true, order: 12, label: 'Reported Date' },
    reportedBy: { visible: false, order: 13, label: 'Reported By' },
    verifiedDate: { visible: true, order: 14, label: 'Verified Date' }, // ✅ ADD VERIFICATION COLUMNS
    verifiedBy: { visible: false, order: 15, label: 'Verified By' },
    verificationStatus: { visible: true, order: 16, label: 'Verification' },
    accession: { visible: false, order: 17, label: 'Accession' },
    seenBy: { visible: false, order: 18, label: 'Seen By' },
    actions: { visible: true, order: 19, label: 'Actions' },
    assignedDoctor: { visible: true, order: 20, label: 'Assign Doctor' }
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('adminWorklistColumnConfig'); // ✅ SEPARATE CONFIG KEY
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
      localStorage.setItem('adminWorklistColumnConfig', JSON.stringify(columnConfig)); // ✅ SEPARATE CONFIG KEY
    } catch (error) {
      console.warn('Error saving admin column config:', error);
    }
  }, [columnConfig]);

  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'pending': return '/admin/studies/pending';
      case 'inprogress': return '/admin/studies/inprogress';
      case 'completed': return '/admin/studies/completed';
      default: return '/admin/studies';
    }
  }, [currentView]);

  // ✅ FIX: Handle raw studies from backend with proper category handling
  const fetchStudies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = getApiEndpoint(); // This already gets the right endpoint based on currentView
      const activeFilters = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      // ✅ FIX: Don't pass category param since endpoints are already status-specific
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
        
        // ✅ UPDATED: Format raw populated studies (like doctor dashboard)
        const formattedStudies = formatStudiesForWorklist(rawStudies);
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
  }, [getApiEndpoint, searchFilters]); // ✅ REMOVE: currentView from dependencies since getApiEndpoint handles it

  // ✅ ADD: Fetch analytics for API values
  const fetchAnalytics = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      console.log('🔍 [Admin] Fetching analytics with params:', params);
      
      const response = await api.get('/admin/values', { params });
      if (response.data.success) {
        setApiValues({
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          inprogress: response.data.inprogress || 0,
          completed: response.data.completed || 0
        });

        console.log('📊 [Admin] API VALUES UPDATED:', {
          total: response.data.total,
          pending: response.data.pending,
          inprogress: response.data.inprogress,
          completed: response.data.completed
        });
      }
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      setApiValues({ total: 0, pending: 0, inprogress: 0, completed: 0 });
    }
  }, [searchFilters]);

  // ✅ ADD: Fetch available assignees
  const fetchAvailableAssignees = useCallback(async () => {
    try {
      const response = await api.get('/admin/available-assignees'); // Admin endpoint
      if (response.data.success) {
        setAvailableAssignees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  }, []);

  // ✅ UPDATED: Initial data fetch with today as default
  useEffect(() => {
    // ✅ SET DEFAULT FILTERS ON MOUNT
    const defaultFilters = {
      dateFilter: 'today', // ✅ CHANGED: Use today as default
      dateType: 'createdAt',
      modality: 'all',
      labId: 'all',
      priority: 'all',
      limit: 50
    };
    
    setSearchFilters(defaultFilters);
    fetchStudies(defaultFilters);
    fetchAnalytics(defaultFilters);
    fetchAvailableAssignees();
  }, []); // ✅ Empty dependency array for initial mount only

  // ✅ FIX: Add useEffect to fetch studies when currentView changes (like doctor dashboard)
  useEffect(() => {
    console.log(`🔄 [Admin] currentView changed to: ${currentView}`);
    fetchStudies(searchFilters);
  }, [currentView, fetchStudies]); // ✅ ADD: currentView dependency

  // Handlers
  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 [Admin] NEW SEARCH PARAMS:', searchParams);
    setSearchFilters(searchParams);
    
    // ✅ IMMEDIATE: Fetch studies and analytics with new params
    fetchStudies(searchParams);
    fetchAnalytics(searchParams);
  }, [fetchStudies, fetchAnalytics]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 [Admin] FILTER CHANGE:', filters);
    setSearchFilters(filters);
    
    // ✅ IMMEDIATE: Fetch studies and analytics with new filters
    fetchStudies(filters);
    fetchAnalytics(filters);
  }, [fetchStudies, fetchAnalytics]);
  
  // ✅ FIX: Update the handleViewChange to be simpler (like doctor dashboard)
  const handleViewChange = useCallback((view) => {
    console.log(`📊 [Admin] TAB CHANGE: ${currentView} -> ${view}`);
    setCurrentView(view);
    setSelectedStudies([]);
    
    // ✅ PRESERVE IMPORTANT FILTERS when switching tabs (same as doctor dashboard)
    setSearchFilters(prevFilters => {
      const preservedFilters = {
        // Date filters
        dateFilter: prevFilters.dateFilter,
        dateType: prevFilters.dateType,
        customDateFrom: prevFilters.customDateFrom,
        customDateTo: prevFilters.customDateTo,
        // Other filters
        modality: prevFilters.modality,
        labId: prevFilters.labId,
        priority: prevFilters.priority,
        // Pagination
        limit: prevFilters.limit,
        // Remove category since endpoints handle this
      };
      
      // Remove undefined values
      const cleanedFilters = Object.fromEntries(
        Object.entries(preservedFilters).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      // ✅ IMMEDIATELY refresh analytics with preserved filters
      fetchAnalytics(cleanedFilters);
      return cleanedFilters;
    });
  }, [currentView, fetchAnalytics]);

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
    fetchAnalytics(searchFilters);
    fetchAvailableAssignees();
  }, [fetchStudies, fetchAnalytics, fetchAvailableAssignees, searchFilters]);

  const handleCreateStudy = useCallback(() => {
    console.log('Create new study');
    toast.success('Study creation feature coming soon');
  }, []);

  // ✅ ADD: Assignment handlers (like assigner dashboard)
  const handleAssignmentSubmit = useCallback(async (assignmentData) => {
    try {
      const { study, assignedToIds, assigneeRole, priority, notes, dueDate } = assignmentData;
      
      console.log('🔄 [Admin] Submitting assignment:', {
        studyId: study._id,
        assignedToIds,
        assigneeRole,
        priority
      });
      
      const response = await api.post(`/admin/update-study-assignments/${study._id}`, {
        assignedToIds,
        assigneeRole,
        priority,
        notes,
        dueDate
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchStudies(searchFilters);
        fetchAnalytics(searchFilters);
      }
    } catch (error) {
      console.error('Admin assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to update assignments');
    }
  }, [fetchStudies, searchFilters, fetchAnalytics]);

  // ✅ COLUMN CONFIGURATION HANDLERS
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

  // ✅ UPDATED: Navbar additional actions with system overview
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

  return (
    <div className="h-screen bg-teal-50 flex flex-col"> {/* ✅ UPDATED: Teal background */}
      {/* ✅ NAVBAR WITH TEAL THEME */}
      <Navbar
        title="Admin Dashboard"
        subtitle={`${currentOrganizationContext === 'global' ? 'Global View' : currentOrganizationContext || 'Organization View'} • PACS Administration`}
        showOrganizationSelector={true}
        onRefresh={handleRefresh}
        additionalActions={additionalActions}
        notifications={0}
        theme="admin" // ✅ ADMIN THEME
      />
      
      {/* ✅ SEARCH WITH TEAL ACCENTS */}
      <Search
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        loading={loading}
        totalStudies={statusCounts.all}
        currentCategory={currentView}
        theme="admin" // ✅ ADMIN THEME
      />

      {/* ✅ MAIN WORKLIST AREA WITH TEAL THEME */}
      <div className="flex-1 min-h-0 p-0 px-0">
        <div className="bg-white rounded-lg shadow-sm border border-teal-100 h-full flex flex-col"> {/* ✅ UPDATED: Teal border */}
          
          {/* ✅ UPDATED: WORKLIST HEADER WITH TEAL THEME */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-teal-200 bg-white rounded-t-lg"> {/* ✅ UPDATED: Teal border */}
            <div className="flex items-center space-x-3">
              <h2 className="text-sm font-bold text-teal-800 uppercase tracking-wide"> {/* ✅ UPDATED: Teal text */}
                ADMIN WORKLIST
              </h2>
              <span className="text-xs text-teal-700 bg-white px-2 py-1 rounded border border-teal-200"> {/* ✅ UPDATED: Teal theme */}
                {studies.length} studies loaded
              </span>
              {selectedStudies.length > 0 && (
                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                  {selectedStudies.length} selected
                </span>
              )}
            </div>

            {/* ✅ UPDATED: MIDDLE SECTION - CATEGORY TABS WITH TEAL THEME */}
            <div className="flex items-center border border-teal-300 rounded-md overflow-hidden bg-white"> {/* ✅ UPDATED: Teal border */}
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'pending', label: 'Pending', count: statusCounts.pending },
                { key: 'inprogress', label: 'In Progress', count: statusCounts.inprogress },
                { key: 'completed', label: 'Completed', count: statusCounts.completed }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleViewChange(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium border-r border-teal-300 last:border-r-0 transition-colors ${
                    currentView === tab.key
                      ? 'bg-teal-600 text-white' // ✅ UPDATED: Teal active
                      : 'bg-white text-teal-700 hover:bg-teal-50' // ✅ UPDATED: Teal hover
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            
            {/* Right section remains the same */}
            <div className="flex items-center space-x-2">
              <ColumnConfigurator
                columnConfig={columnConfig}
                onColumnChange={handleColumnChange}
                onResetToDefault={handleResetColumns}
                theme="admin"
              />
            </div>
          </div>

          {/* Worklist table remains the same */}
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
              theme="admin"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;