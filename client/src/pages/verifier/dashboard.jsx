import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import UnifiedWorklistTable from '../../components/common/WorklistTable/UnifiedWorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import api from '../../services/api';
import { 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  XCircle,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter';

// ✅ UTILITY: Resolve visible columns from user object
const resolveUserVisibleColumns = (user) => {
  if (!user) return [];
  
  // ✅ Primary source: visibleColumns array (from database)
  if (user.visibleColumns && Array.isArray(user.visibleColumns)) {
    return user.visibleColumns;
  }
  
  return [];
};

const VerifierDashboard = () => {
  const { currentUser, currentOrganizationContext } = useAuth();
  
  // ✅ PAGINATION STATE - Single source of truth
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 50,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // State management
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [currentView, setCurrentView] = useState('all');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [availableAssignees, setAvailableAssignees] = useState({ radiologists: [], verifiers: [] });

  // ✅ SIMPLIFIED: Only 3 status categories
  const [apiValues, setApiValues] = useState({
    total: 0,
    verified: 0,
    rejected: 0
  });

  const intervalRef = useRef(null);

  // ✅ SIMPLIFIED: Only 3 tab counts
  const tabCounts = useMemo(() => ({
    all: apiValues.total,
    verified: apiValues.verified,
    rejected: apiValues.rejected
  }), [apiValues]);

  // ✅ COMPUTE visible columns from user
  const visibleColumns = useMemo(() => {
    return resolveUserVisibleColumns(currentUser);
  }, [currentUser?.visibleColumns, currentUser?.accountRoles, currentUser?.primaryRole]);

  // ✅ GET USER ROLES for UnifiedWorklistTable
  const userRoles = useMemo(() => {
    if (!currentUser) return [];
    
    // Multi-role support: use accountRoles array if available
    if (currentUser.accountRoles && Array.isArray(currentUser.accountRoles)) {
      return currentUser.accountRoles;
    }
    
    // Fallback to single role
    if (currentUser.role) {
      return [currentUser.role];
    }
    
    return [];
  }, [currentUser?.accountRoles, currentUser?.role]);

  console.log('🎯 Verifier Dashboard Visible Columns:', {
    total: visibleColumns.length,
    columns: visibleColumns,
    user: {
      primaryRole: currentUser?.primaryRole,
      accountRoles: currentUser?.accountRoles,
      visibleColumns: currentUser?.visibleColumns
    }
  });

  // ✅ SIMPLIFIED: Verifier-specific column configuration (kept for localStorage compatibility)
  const getDefaultColumnConfig = () => ({
    checkbox: { visible: true, order: 1, label: 'Select' },
    workflowStatus: { visible: true, order: 2, label: 'Status' },
    patientId: { visible: true, order: 3, label: 'Patient ID' },
    patientName: { visible: true, order: 4, label: 'Patient Name' },
    ageGender: { visible: true, order: 5, label: 'Age/Sex' },
    modality: { visible: true, order: 6, label: 'Modality' },
    studyDate: { visible: true, order: 7, label: 'Study Date' },
    reportedDate: { visible: true, order: 8, label: 'Report Date' },
    reportedBy: { visible: true, order: 9, label: 'Reported By' },
    verifiedDate: { visible: true, order: 10, label: 'Verified Date' },
    verifiedBy: { visible: true, order: 11, label: 'Verified By' },
    verificationStatus: { visible: true, order: 12, label: 'Verification' },
    actions: { visible: true, order: 13, label: 'Actions' },
    // Hidden columns
    studyDescription: { visible: false, order: 14, label: 'Description' },
    seriesCount: { visible: false, order: 15, label: 'Series' },
    location: { visible: false, order: 16, label: 'Location' },
    uploadDate: { visible: false, order: 17, label: 'Upload Date' },
    accession: { visible: false, order: 18, label: 'Accession' },
    seenBy: { visible: false, order: 19, label: 'Seen By' },
    assignedDoctor: { visible: false, order: 20, label: 'Assignment' }
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('verifierWorklistColumnConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return { ...getDefaultColumnConfig(), ...parsedConfig };
      }
    } catch (error) {
      console.warn('Error loading verifier column config:', error);
    }
    return getDefaultColumnConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem('verifierWorklistColumnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.warn('Error saving verifier column config:', error);
    }
  }, [columnConfig]);

  // ✅ SIMPLIFIED: API endpoints for only 3 categories
  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'verified': return '/verifier/studies/verified';
      case 'rejected': return '/verifier/studies/rejected';
      default: return '/verifier/studies';
    }
  }, [currentView]);

  // ✅ FETCH STUDIES WITH PAGINATION AND FORMATTING
  const fetchStudies = useCallback(async (filters = {}, page = null, limit = null) => {
    setLoading(true);
    setError(null);
    
    const requestPage = page !== null ? page : pagination.currentPage;
    const requestLimit = limit !== null ? limit : pagination.recordsPerPage;
    
    try {
      const endpoint = getApiEndpoint();
      const params = { 
        ...filters,
        page: requestPage,
        limit: requestLimit,
        category: currentView === 'all' ? undefined : currentView 
      };
      
      console.log('🔍 VERIFIER: Fetching studies from:', endpoint, 'with params:', params);
      
      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        const rawStudies = response.data.data || [];
        
        // ✅ FORMAT STUDIES BEFORE SETTING STATE
        const formattedStudies = formatStudiesForWorklist(rawStudies);
        console.log('✅ VERIFIER: Formatted studies:', {
          raw: rawStudies.length,
          formatted: formattedStudies.length,
          sample: formattedStudies[0]
        });
        
        setStudies(formattedStudies);
        
        if (response.data.pagination) {
          setPagination({
            currentPage: response.data.pagination.currentPage,
            totalPages: response.data.pagination.totalPages,
            totalRecords: response.data.pagination.totalRecords,
            recordsPerPage: response.data.pagination.limit,
            hasNextPage: response.data.pagination.hasNextPage,
            hasPrevPage: response.data.pagination.hasPrevPage
          });
        }
      }
    } catch (err) {
      console.error('❌ Error fetching verifier studies:', err);
      setError('Failed to fetch studies.');
      setStudies([]);
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, currentView, pagination.currentPage, pagination.recordsPerPage]);

  // ✅ SIMPLIFIED: Fetch analytics for 3 categories
  const fetchAnalytics = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      console.log('🔍 VERIFIER ANALYTICS: Fetching with params:', params);
      
      const response = await api.get('/verifier/values', { params });
      if (response.data.success) {
        setApiValues({
          total: response.data.total || 0,
          verified: response.data.verified || 0,
          rejected: response.data.rejected || 0
        });

        console.log('📊 VERIFIER API VALUES UPDATED:', {
          total: response.data.total,
          verified: response.data.verified,
          rejected: response.data.rejected
        });
      }
    } catch (error) {
      console.error('Error fetching verifier analytics:', error);
      setApiValues({ total: 0, verified: 0, rejected: 0 });
    }
  }, [searchFilters]);

  // ✅ INITIAL DATA FETCH WITH TODAY AS DEFAULT
  useEffect(() => {
    const defaultFilters = {
      dateFilter: 'today',
      dateType: 'createdAt',
      modality: 'all',
      priority: 'all'
    };
    
    setSearchFilters(defaultFilters);
    fetchStudies(defaultFilters, 1, 50);
    fetchAnalytics(defaultFilters);
  }, []);

  // ✅ FETCH STUDIES WHEN CURRENT VIEW CHANGES
  useEffect(() => {
    console.log(`🔄 [Verifier] currentView changed to: ${currentView}`);
    fetchStudies(searchFilters, 1, pagination.recordsPerPage);
  }, [currentView]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing verifier dashboard data...');
      fetchStudies(searchFilters, pagination.currentPage, pagination.recordsPerPage);
      fetchAnalytics(searchFilters);
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStudies, fetchAnalytics, searchFilters, pagination.currentPage, pagination.recordsPerPage]);

  // ✅ HANDLE PAGE CHANGE
  const handlePageChange = useCallback((newPage) => {
    console.log(`📄 [Verifier] Changing page: ${pagination.currentPage} -> ${newPage}`);
    fetchStudies(searchFilters, newPage, pagination.recordsPerPage);
  }, [fetchStudies, searchFilters, pagination.currentPage, pagination.recordsPerPage]);

  // ✅ HANDLE RECORDS PER PAGE CHANGE
  const handleRecordsPerPageChange = useCallback((newLimit) => {
    console.log(`📊 [Verifier] Changing limit: ${pagination.recordsPerPage} -> ${newLimit}`);
    fetchStudies(searchFilters, 1, newLimit);
  }, [fetchStudies, searchFilters]);

  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 [Verifier] NEW SEARCH:', searchParams);
    setSearchFilters(searchParams);
    fetchStudies(searchParams, 1, pagination.recordsPerPage);
    fetchAnalytics(searchParams);
  }, [fetchStudies, fetchAnalytics, pagination.recordsPerPage]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 [Verifier] FILTER CHANGE:', filters);
    setSearchFilters(filters);
    fetchStudies(filters, 1, pagination.recordsPerPage);
    fetchAnalytics(filters);
  }, [fetchStudies, fetchAnalytics, pagination.recordsPerPage]);
  
  const handleViewChange = useCallback((view) => {
    console.log(`📊 [Verifier] VIEW CHANGE: ${currentView} -> ${view}`);
    setCurrentView(view);
    setSelectedStudies([]);
  }, [currentView]);

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
    console.log('🔄 [Verifier] MANUAL REFRESH');
    fetchStudies(searchFilters, pagination.currentPage, pagination.recordsPerPage);
    fetchAnalytics(searchFilters);
  }, [fetchStudies, fetchAnalytics, searchFilters, pagination.currentPage, pagination.recordsPerPage]);

  // ✅ Handle verification completion
  const handleVerifyComplete = useCallback(() => {
    // Refresh data after verification
    fetchStudies(searchFilters, pagination.currentPage, pagination.recordsPerPage);
    fetchAnalytics(searchFilters);
    toast.success('Study verification completed');
  }, [fetchStudies, fetchAnalytics, searchFilters, pagination.currentPage, pagination.recordsPerPage]);

  const handleUpdateStudyDetails = useCallback(async (formData) => {
    try {
      const response = await api.put(`/admin/studies/${formData.studyId}/update-details`, formData);
      
      if (response.data.success) {
        toast.success('Study details updated successfully');
        fetchStudies(searchFilters, pagination.currentPage, pagination.recordsPerPage);
        fetchAnalytics(searchFilters);
      } else {
        toast.error('Failed to update study details');
      }
    } catch (error) {
      console.error('Error updating study details:', error);
      toast.error('Error updating study details');
    }
  }, [fetchStudies, searchFilters, fetchAnalytics, pagination.currentPage, pagination.recordsPerPage]);

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

  // ✅ SIMPLIFIED: Only basic actions needed for verification
  const additionalActions = [
    {
      label: 'View Reports',
      icon: FileText,
      onClick: () => {
        if (selectedStudies.length === 1) {
          const study = studies.find(s => s._id === selectedStudies[0]);
          // Open report modal or navigate to report view
          console.log('View report for study:', study);
        }
      },
      variant: 'secondary',
      tooltip: 'View report content',
      disabled: selectedStudies.length !== 1
    }
  ];

  console.log('🔍 VERIFIER DASHBOARD DEBUG:', {
    studies: studies.length,
    apiValues,
    tabCounts,
    currentView,
    searchFilters,
    visibleColumns: visibleColumns.length,
    userRoles
  });

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navbar
        title="Verifier Dashboard"
        subtitle={`${currentOrganizationContext || 'Organization View'} • Report Verification`}
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
          
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-3">
              <h2 className="text-xs font-bold text-black uppercase tracking-wider flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>VERIFICATION WORKLIST</span>
              </h2>
              <span className="text-[10px] text-gray-600 bg-white px-2 py-0.5 rounded-md font-medium">
                {studies.length} loaded
              </span>
              {selectedStudies.length > 0 && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium border border-blue-200">
                  {selectedStudies.length} selected
                </span>
              )}
            </div>

            {/* ✅ SIMPLIFIED: Only 3 tabs with modern styling */}
            <div className="flex-1 mx-4 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 min-w-max">
                {[
                  { key: 'all', label: 'All Reports', count: tabCounts.all, icon: FileText },
                  { key: 'verified', label: 'Verified', count: tabCounts.verified, icon: CheckCircle },
                  { key: 'rejected', label: 'Rejected', count: tabCounts.rejected, icon: XCircle }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleViewChange(tab.key)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                        ${currentView === tab.key
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className={`
                        ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold
                        ${currentView === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700'
                        }
                      `}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
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
            <UnifiedWorklistTable
              studies={studies}
              loading={loading}
              selectedStudies={selectedStudies}
              onSelectAll={handleSelectAll}
              onSelectStudy={handleSelectStudy}
              onPatienIdClick={(patientId, study) => console.log('Patient clicked:', patientId)}
              availableAssignees={availableAssignees}
              onUpdateStudyDetails={handleUpdateStudyDetails}
              pagination={pagination}
              onPageChange={handlePageChange}
              onRecordsPerPageChange={handleRecordsPerPageChange}
              // ✅ MULTI-ROLE PROPS
              visibleColumns={visibleColumns}
              userRole={currentUser?.primaryRole || currentUser?.role || 'verifier'}
              userRoles={userRoles}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;