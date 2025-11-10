import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import WorklistTable from '../../components/common/WorklistTable/WorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import api from '../../services/api';
import { RefreshCw, UserCheck, Users2, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter';

const AssignerDashboard = () => {
  const { currentUser, currentOrganizationContext } = useAuth();
  
  // State management
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [currentView, setCurrentView] = useState('all');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [assignmentModal, setAssignmentModal] = useState({ show: false, study: null });
  const [bulkAssignModal, setBulkAssignModal] = useState({ show: false });
  const [availableAssignees, setAvailableAssignees] = useState({ radiologists: [], verifiers: [] });
  const [analytics, setAnalytics] = useState(null);

  // ✅ API VALUES STATE (separate from local study counts)
  const [apiValues, setApiValues] = useState({
    total: 0,
    pending: 0,
    inprogress: 0,
    completed: 0
  });

  const intervalRef = useRef(null);

  // ✅ USE API VALUES for tab counts (like admin dashboard)
  const statusCounts = useMemo(() => ({
    all: apiValues.total,
    pending: apiValues.pending,
    inprogress: apiValues.inprogress,
    completed: apiValues.completed
  }), [apiValues]);

  // Column configuration (same as before)
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
    accession: { visible: false, order: 14, label: 'Accession' },
    seenBy: { visible: false, order: 15, label: 'Seen By' },
    actions: { visible: true, order: 16, label: 'Actions' },
    assignedDoctor: { visible: true, order: 17, label: 'Assignment' }
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('assignerWorklistColumnConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return { ...getDefaultColumnConfig(), ...parsedConfig };
      }
    } catch (error) {
      console.warn('Error loading assignor column config:', error);
    }
    return getDefaultColumnConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem('assignerWorklistColumnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.warn('Error saving assignor column config:', error);
    }
  }, [columnConfig]);

  // ✅ UPDATED: API endpoints (like admin dashboard)
  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'pending': return '/admin/studies/pending';
      case 'inprogress': return '/admin/studies/inprogress';
      case 'completed': return '/admin/studies/completed';
      default: return '/admin/studies';
    }
  }, [currentView]);

  // ✅ UPDATED: fetchStudies (like admin dashboard)
  const fetchStudies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = getApiEndpoint();
      const activeFilters = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      // ✅ Don't pass category param since endpoints are already status-specific
      const params = { ...activeFilters };
      delete params.category;
      
      console.log('🔍 [Assignor] Fetching studies with params:', {
        endpoint,
        params,
        currentView,
        searchFilters,
        passedFilters: filters
      });
      
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        const rawStudies = response.data.data || [];
        const formattedStudies = formatStudiesForWorklist(rawStudies);
        setStudies(formattedStudies);
        
        console.log('✅ [Assignor] Studies fetched:', {
          raw: rawStudies.length,
          formatted: formattedStudies.length,
          endpoint,
          appliedParams: params,
          currentView
        });
      }
    } catch (err) {
      console.error('❌ [Assignor] Error fetching studies:', err);
      setError('Failed to fetch studies.');
      setStudies([]);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, searchFilters]);

  // ✅ UPDATED: Fetch analytics (like admin dashboard)
  const fetchAnalytics = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      console.log('🔍 [Assignor] Fetching analytics with params:', params);
      
      const response = await api.get('/admin/values', { params });
      if (response.data.success) {
        setAnalytics(response.data);
        
        setApiValues({
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          inprogress: response.data.inprogress || 0,
          completed: response.data.completed || 0
        });

        console.log('📊 [Assignor] API VALUES UPDATED:', {
          total: response.data.total,
          pending: response.data.pending,
          inprogress: response.data.inprogress,
          completed: response.data.completed
        });
      }
    } catch (error) {
      console.error('Error fetching assignor analytics:', error);
      setAnalytics(null);
      setApiValues({ total: 0, pending: 0, inprogress: 0, completed: 0 });
    }
  }, [searchFilters]);

  const fetchAvailableAssignees = useCallback(async () => {
    try {
      const response = await api.get('/assigner/available-assignees');
      if (response.data.success) {
        setAvailableAssignees(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  }, []);

  // ✅ UPDATED: Initial data fetch (like admin dashboard)
  useEffect(() => {
    const defaultFilters = {
      dateFilter: 'today',
      dateType: 'createdAt',
      modality: 'all',
      labId: 'all',
      priority: 'all',
      assigneeRole: 'all',
      limit: 50
    };
    
    setSearchFilters(defaultFilters);
    fetchStudies(defaultFilters);
    fetchAnalytics(defaultFilters);
    fetchAvailableAssignees();
  }, []);

  // ✅ ADD: Auto-fetch when view changes (like admin dashboard)
  useEffect(() => {
    if (Object.keys(searchFilters).length > 0) {
      console.log(`🔄 [Assignor] View changed to: ${currentView}, refetching studies...`);
      fetchStudies(searchFilters);
    }
  }, [currentView, fetchStudies]);

  // ✅ REMOVE: Auto-refresh interval (admin dashboard doesn't have this)

  // ✅ UPDATED: Handlers (like admin dashboard)
  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 [Assignor] NEW SEARCH PARAMS:', searchParams);
    setSearchFilters(searchParams);
    
    fetchStudies(searchParams);
    fetchAnalytics(searchParams);
  }, [fetchStudies, fetchAnalytics]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 [Assignor] FILTER CHANGE:', filters);
    setSearchFilters(filters);
    
    fetchStudies(filters);
    fetchAnalytics(filters);
  }, [fetchStudies, fetchAnalytics]);
  
  // ✅ UPDATED: handleViewChange (like admin dashboard)
  const handleViewChange = useCallback((view) => {
    console.log(`📊 [Assignor] TAB CHANGE: ${currentView} -> ${view}`);
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
        assigneeRole: prevFilters.assigneeRole,
        limit: prevFilters.limit,
      };
      
      const cleanedFilters = Object.fromEntries(
        Object.entries(preservedFilters).filter(([_, value]) => value !== undefined && value !== '')
      );
      
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

  // ✅ UPDATED: handleRefresh (like admin dashboard)
  const handleRefresh = useCallback(() => {
    console.log('🔄 [Assignor] Manual refresh');
    fetchStudies(searchFilters);
    fetchAnalytics(searchFilters);
    fetchAvailableAssignees();
  }, [fetchStudies, fetchAnalytics, fetchAvailableAssignees, searchFilters]);

  // Assignment handlers (same as before)
  const handleAssignStudy = useCallback((study) => {
    setAssignmentModal({ show: true, study });
  }, []);

  const handleBulkAssign = useCallback(() => {
    if (selectedStudies.length === 0) {
      toast.error('Please select studies to assign');
      return;
    }
    setBulkAssignModal({ show: true });
  }, [selectedStudies]);

  const handleAssignmentSubmit = useCallback(async (assignmentData) => {
    try {
      const { study, assignedToIds, assigneeRole, priority, notes, dueDate } = assignmentData;
      
      console.log('🔄 [Assignor] Submitting assignment:', {
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
        setAssignmentModal({ show: false, study: null });
        fetchStudies(searchFilters);
        fetchAnalytics(searchFilters);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to update assignments');
    }
  }, [fetchStudies, searchFilters, fetchAnalytics]);

  const handleBulkAssignmentSubmit = useCallback(async (assignmentData) => {
    try {
      const { assignedTo, assigneeRole, priority, notes, dueDate } = assignmentData;
      
      const response = await api.post('/assigner/bulk-assign', {
        studyIds: selectedStudies,
        assignedTo,
        assigneeRole,
        priority,
        notes,
        dueDate
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setBulkAssignModal({ show: false });
        setSelectedStudies([]);
        fetchStudies(searchFilters);
        fetchAnalytics(searchFilters);
      }
    } catch (error) {
      console.error('Bulk assignment error:', error);
      toast.error(error.response?.data?.message || 'Failed to bulk assign studies');
    }
  }, [selectedStudies, fetchStudies, searchFilters, fetchAnalytics]);

  // Column configuration handlers
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

  // Additional actions for navbar
  const additionalActions = [
    {
      label: 'Bulk Assign',
      icon: Users2,
      onClick: handleBulkAssign,
      variant: 'primary',
      tooltip: 'Assign selected studies',
      disabled: selectedStudies.length === 0
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      onClick: () => console.log('Show analytics modal'),
      variant: 'secondary',
      tooltip: 'View assignment analytics'
    }
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navbar
        title="Assignor Dashboard"
        subtitle={`${currentOrganizationContext === 'global' ? 'Global View' : currentOrganizationContext || 'Organization View'} • Case Assignment`}
        showOrganizationSelector={false}
        onRefresh={handleRefresh}
        additionalActions={additionalActions}
        notifications={analytics?.overview?.overdueStudies || 0}
      />
      
      <Search
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        loading={loading}
        totalStudies={statusCounts.all} // ✅ Use API values like admin dashboard
        currentCategory={currentView}
        analytics={analytics}
      />

      <div className="flex-1 min-h-0 p-0 px-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-400 h-full flex flex-col">
          
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <h2 className="text-sm font-bold text-black uppercase tracking-wide">
                ASSIGNMENT WORKLIST
              </h2>
              <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                {studies.length} studies loaded
              </span>
              {selectedStudies.length > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  {selectedStudies.length} selected
                </span>
              )}
            </div>

            {/* ✅ UPDATED: Use statusCounts like admin dashboard */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'pending', label: 'Pending', count: statusCounts.pending },
                { key: 'inprogress', label: 'In Progress', count: statusCounts.inprogress },
                { key: 'completed', label: 'Completed', count: statusCounts.completed }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleViewChange(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium border-r border-gray-300 last:border-r-0 transition-colors ${
                    currentView === tab.key
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <ColumnConfigurator
                columnConfig={columnConfig}
                onColumnChange={handleColumnChange}
                onResetToDefault={handleResetColumns}
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
              onAssignDoctor={handleAssignStudy}
              availableAssignees={availableAssignees}
              onAssignmentSubmit={handleAssignmentSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignerDashboard;