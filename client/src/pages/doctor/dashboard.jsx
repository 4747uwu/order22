import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import WorklistTable from '../../components/common/WorklistTable/WorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import CreateTypistModal from '../../components/doctor/CreateTypistModal'; // ✅ NEW IMPORT
import api from '../../services/api';
import { RefreshCw, FileText, Eye, Clock, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react'; // ✅ ADD UserPlus
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { currentUser, currentOrganizationContext } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [currentView, setCurrentView] = useState('all');
  const [selectedStudies, setSelectedStudies] = useState([]);

  // ✅ NEW: Typist modal state
  const [showTypistModal, setShowTypistModal] = useState(false);

  // ✅ ADD: API VALUES STATE (separate from local study counts)
  const [apiValues, setApiValues] = useState({
    total: 0,
    pending: 0,
    inprogress: 0,
    completed: 0
  });

  const intervalRef = useRef(null);

  // ✅ USE: API values for tab counts
  const tabCounts = useMemo(() => ({
    all: apiValues.total,
    pending: apiValues.pending,
    inprogress: apiValues.inprogress,
    completed: apiValues.completed
  }), [apiValues]);

  // Column configuration (doctor-specific)
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
    reportedDate: { visible: true, order: 12, label: 'Report Date' },
    reportedBy: { visible: false, order: 13, label: 'Reported By' },
    accession: { visible: false, order: 14, label: 'Accession' },
    seenBy: { visible: false, order: 15, label: 'Seen By' },
    actions: { visible: true, order: 16, label: 'Actions' },
    assignedDoctor: { visible: false, order: 17, label: 'Assignment' } // Hide assignment for doctor
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('doctorWorklistColumnConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return { ...getDefaultColumnConfig(), ...parsedConfig };
      }
    } catch (error) {
      console.warn('Error loading doctor column config:', error);
    }
    return getDefaultColumnConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem('doctorWorklistColumnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.warn('Error saving doctor column config:', error);
    }
  }, [columnConfig]);

  // API endpoints
  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'pending': return '/doctor/studies/pending';
      case 'inprogress': return '/doctor/studies/inprogress';
      case 'completed': return '/doctor/studies/completed';
      default: return '/doctor/studies';
    }
  }, [currentView]);

  const fetchStudies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = getApiEndpoint();
      const params = { ...filters, category: currentView === 'all' ? undefined : currentView };
      
      console.log('🔍 DOCTOR: Fetching studies from:', endpoint, 'with params:', params);
      
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        // ✅ USE SAME PATTERN AS ASSIGNER DASHBOARD
        const rawStudies = response.data.data || [];
        console.log('📦 DOCTOR: Raw studies received:', rawStudies.length);
        
        // ✅ FORMAT STUDIES IN FRONTEND USING STUDY FORMATTER
        const formattedStudies = formatStudiesForWorklist(rawStudies);
        console.log('✨ DOCTOR: Formatted studies:', formattedStudies.length);
        
        setStudies(formattedStudies);
      }
    } catch (err) {
      console.error('❌ Error fetching doctor studies:', err);
      setError('Failed to fetch studies.');
      setStudies([]);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, currentView]);

  // ✅ Fetch analytics AND set API values
  const fetchAnalytics = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      console.log('🔍 DOCTOR ANALYTICS: Fetching with params:', params);
      
      const response = await api.get('/doctor/values', { params });
      if (response.data.success) {
        // ✅ SET API VALUES for tab counts
        setApiValues({
          total: response.data.total || 0,
          pending: response.data.pending || 0,
          inprogress: response.data.inprogress || 0,
          completed: response.data.completed || 0
        });

        console.log('📊 DOCTOR API VALUES UPDATED:', {
          total: response.data.total,
          pending: response.data.pending,
          inprogress: response.data.inprogress,
          completed: response.data.completed
        });
      }
    } catch (error) {
      console.error('Error fetching doctor analytics:', error);
      setApiValues({ total: 0, pending: 0, inprogress: 0, completed: 0 });
    }
  }, [searchFilters]);

  // ✅ Initial data fetch
  useEffect(() => {
    fetchStudies(searchFilters);
    fetchAnalytics(searchFilters);
  }, [fetchStudies, fetchAnalytics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing doctor dashboard data...');
      fetchStudies(searchFilters);
      fetchAnalytics(searchFilters);
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStudies, fetchAnalytics, searchFilters]);

  // ✅ Handlers with proper analytics refresh (same as assigner)
  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 DOCTOR SEARCH: New search params:', searchParams);
    setSearchFilters(searchParams);
    fetchAnalytics(searchParams);
  }, [fetchAnalytics]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 DOCTOR FILTER CHANGE:', filters);
    setSearchFilters(filters);
    fetchAnalytics(filters);
  }, [fetchAnalytics]);
  
  const handleViewChange = useCallback((view) => {
    console.log(`📊 DOCTOR TAB CHANGE: ${currentView} -> ${view}`);
    setCurrentView(view);
    setSelectedStudies([]);
    
    // ✅ PRESERVE IMPORTANT FILTERS when switching tabs (same as assigner)
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
        // Category (update to new view)
        category: view === 'all' ? undefined : view
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
    console.log('🔄 DOCTOR MANUAL REFRESH');
    fetchStudies(searchFilters);
    fetchAnalytics(searchFilters);
  }, [fetchStudies, fetchAnalytics, searchFilters]);

  // Doctor-specific handlers
  const handleOpenReport = useCallback((study) => {
    console.log('📝 Opening report for study:', study._id);
    toast.success('Opening report editor...');
    // Navigate to report creation/editing page
  }, []);

  const handleViewDicom = useCallback((study) => {
    console.log('🖼️ Opening DICOM viewer for study:', study._id);
    toast.success('Opening DICOM viewer...');
    // Navigate to DICOM viewer
  }, []);

  // ✅ NEW: Typist-related handlers
  const handleCreateTypist = useCallback(() => {
    console.log('👥 Opening create typist modal');
    setShowTypistModal(true);
  }, []);

  const handleTypistCreated = useCallback((newTypist) => {
    console.log('✅ Typist created successfully:', newTypist);
    toast.success(`Typist ${newTypist.fullName} created and linked to your account`);
    // You can add additional logic here like refreshing a typist list
  }, []);

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

  // ✅ UPDATED: Additional actions for navbar (added Create Typist)
  const additionalActions = [
    {
      label: 'Templates',
      icon: FileText,
      onClick: () => navigate('/doctor/templates'),
      variant: 'secondary',
      tooltip: 'Manage report templates'
    },
    {
      label: 'Create Typist',
      icon: UserPlus,
      onClick: handleCreateTypist,
      variant: 'secondary',
      tooltip: 'Create a typist to assist with report typing',
      disabled: false
    },
    {
      label: 'Create Report',
      icon: FileText,
      onClick: () => handleOpenReport(selectedStudies[0]),
      variant: 'primary',
      tooltip: 'Create new report',
      disabled: selectedStudies.length !== 1
    },
    {
      label: 'DICOM Viewer',
      icon: Eye,
      onClick: () => handleViewDicom(selectedStudies[0]),
      variant: 'secondary',
      tooltip: 'Open DICOM viewer',
      disabled: selectedStudies.length !== 1
    }
  ];

  console.log('🔍 DOCTOR DASHBOARD DEBUG:', {
    studies: studies.length,
    apiValues,
    tabCounts,
    currentView,
    searchFilters
  });

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navbar
        title="Doctor Dashboard"
        subtitle={`${currentOrganizationContext || 'Organization View'} • My Cases`}
        showOrganizationSelector={false}
        onRefresh={handleRefresh}
        additionalActions={additionalActions}
        notifications={0}
      />
      
      <Search
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        loading={loading}
        totalStudies={tabCounts.all}
        currentCategory={currentView}
      />

      <div className="flex-1 min-h-0 p-0 px-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-400 h-full flex flex-col">
          
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <h2 className="text-sm font-bold text-black uppercase tracking-wide">
                MY WORKLIST
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

            {/* ✅ Tab counts using API values */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              {[
                { key: 'all', label: 'All', count: tabCounts.all, icon: FileText },
                { key: 'pending', label: 'Pending', count: tabCounts.pending, icon: Clock },
                { key: 'inprogress', label: 'In Progress', count: tabCounts.inprogress, icon: AlertCircle },
                { key: 'completed', label: 'Completed', count: tabCounts.completed, icon: CheckCircle2 }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleViewChange(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r border-gray-300 last:border-r-0 transition-colors ${
                      currentView === tab.key
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
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
              onAssignDoctor={() => {}} // Disabled for doctor
            />
          </div>
        </div>
      </div>

      {/* ✅ NEW: Create Typist Modal */}
      <CreateTypistModal
        isOpen={showTypistModal}
        onClose={() => setShowTypistModal(false)}
        onSuccess={handleTypistCreated}
        doctorInfo={currentUser}
      />
    </div>
  );
};

export default DoctorDashboard;