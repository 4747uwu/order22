import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import WorklistTable from '../../components/common/WorklistTable/WorklistTable';
import ColumnConfigurator from '../../components/common/WorklistTable/ColumnConfigurator';
import api from '../../services/api';
import { Building, Palette, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatStudiesForWorklist } from '../../utils/studyFormatter';
import { useNavigate } from 'react-router-dom';

// ✅ HEADER COLOR PRESETS (same as admin)
const HEADER_COLOR_PRESETS = [
  { name: 'Dark Gray', gradient: 'from-gray-800 via-gray-900 to-black', textColor: 'text-white' },
  { name: 'Blue', gradient: 'from-blue-700 via-blue-800 to-blue-900', textColor: 'text-white' },
  { name: 'Green', gradient: 'from-green-700 via-green-800 to-green-900', textColor: 'text-white' },
  { name: 'Purple', gradient: 'from-purple-700 via-purple-800 to-purple-900', textColor: 'text-white' },
  { name: 'Red', gradient: 'from-red-700 via-red-800 to-red-900', textColor: 'text-white' },
  { name: 'Indigo', gradient: 'from-indigo-700 via-indigo-800 to-indigo-900', textColor: 'text-white' },
  { name: 'Teal', gradient: 'from-teal-700 via-teal-800 to-teal-900', textColor: 'text-white' },
  { name: 'Orange', gradient: 'from-orange-700 via-orange-800 to-orange-900', textColor: 'text-white' },
  { name: 'Pink', gradient: 'from-pink-700 via-pink-800 to-pink-900', textColor: 'text-white' },
  { name: 'Cyan', gradient: 'from-cyan-700 via-cyan-800 to-cyan-900', textColor: 'text-white' }
];

// ✅ HEADER COLOR PICKER COMPONENT
const HeaderColorPicker = ({ isOpen, onClose, currentColor, onSelectColor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-gray-300">
        <div className="px-6 py-4 border-b-2 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <h2 className="text-lg font-bold">Choose Header Color</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 gap-3">
            {HEADER_COLOR_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelectColor(preset);
                  onClose();
                }}
                className={`relative px-4 py-3 rounded-lg transition-all border-2 ${
                  currentColor.name === preset.name 
                    ? 'border-gray-900 scale-105 shadow-lg' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
              >
                <div className={`h-8 rounded bg-gradient-to-r ${preset.gradient} flex items-center justify-center ${preset.textColor} text-sm font-bold`}>
                  {preset.name}
                </div>
                {currentColor.name === preset.name && (
                  <div className="absolute top-1 right-1 bg-white rounded-full p-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600 fill-current" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LabDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // ✅ PAGINATION STATE
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
  
  // ✅ CATEGORY VALUES (3 categories only)
  const [categoryValues, setCategoryValues] = useState({
    all: 0,
    pending: 0,
    inprogress: 0,
    completed: 0
  });

  // ✅ HEADER COLOR STATE
  const [headerColor, setHeaderColor] = useState(() => {
    const saved = localStorage.getItem('labWorklistTableHeaderColor');
    return saved ? JSON.parse(saved) : HEADER_COLOR_PRESETS[1]; // Default to Blue
  });
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ✅ COLUMN CONFIGURATION
  const getDefaultColumnConfig = () => ({
    checkbox: { visible: false, order: 1, label: 'Select' },
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
    assignedRadiologist: { visible: true, order: 14, label: 'Radiologist' }, // ✅ CHANGED from 'radiologist' to 'assignedRadiologist'
    caseStatus: { visible: true, order: 15, label: 'Status' },
    actions: { visible: true, order: 16, label: 'Actions' }
  });

  const [columnConfig, setColumnConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('labWorklistColumnConfig');
      if (saved) {
        return { ...getDefaultColumnConfig(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Error loading lab column config:', error);
    }
    return getDefaultColumnConfig();
  });

  useEffect(() => {
    try {
      localStorage.setItem('labWorklistColumnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.warn('Error saving lab column config:', error);
    }
  }, [columnConfig]);

  // ✅ ENDPOINT MAPPING
  const getApiEndpoint = useCallback(() => {
    switch (currentView) {
      case 'pending': return '/lab/studies/pending';
      case 'inprogress': return '/lab/studies/inprogress';
      case 'completed': return '/lab/studies/completed';
      default: return '/lab/studies';
    }
  }, [currentView]);

  // ✅ FETCH STUDIES WITH PAGINATION
  const fetchStudies = useCallback(async (filters = {}, page = null, limit = null) => {
    setLoading(true);
    setError(null);
    
    const requestPage = page !== null ? page : pagination.currentPage;
    const requestLimit = limit !== null ? limit : pagination.recordsPerPage;
    
    try {
      const endpoint = getApiEndpoint();
      const activeFilters = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      const params = { 
        ...activeFilters,
        page: requestPage,
        limit: requestLimit
      };
      delete params.category;
      
      console.log('🔍 [Lab] Fetching studies:', {
        endpoint,
        params,
        currentView,
        labId: currentUser.lab
      });
      
      const response = await api.get(endpoint, { params });
      
      if (response.data.success) {
        const rawStudies = response.data.data || [];
        const formattedStudies = formatStudiesForWorklist(rawStudies);
        setStudies(formattedStudies);
        
        // ✅ UPDATE PAGINATION
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        
        console.log('✅ [Lab] Studies fetched:', {
          raw: rawStudies.length,
          formatted: formattedStudies.length,
          pagination: response.data.pagination
        });
      }
    } catch (err) {
      console.error('❌ [Lab] Error fetching studies:', err);
      setError('Failed to fetch studies.');
      setStudies([]);
      toast.error('Failed to fetch studies');
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint, searchFilters, currentView, pagination.currentPage, pagination.recordsPerPage, currentUser.lab]);

  // ✅ FETCH ANALYTICS
  const fetchAnalytics = useCallback(async (filters = {}) => {
    try {
      const params = Object.keys(filters).length > 0 ? filters : searchFilters;
      
      const response = await api.get('/lab/values', { params });
      if (response.data.success) {
        setCategoryValues({
          all: response.data.total || 0,
          pending: response.data.pending || 0,
          inprogress: response.data.inprogress || 0,
          completed: response.data.completed || 0
        });
      }
    } catch (error) {
      console.error('Error fetching lab analytics:', error);
      setCategoryValues({ all: 0, pending: 0, inprogress: 0, completed: 0 });
    }
  }, [searchFilters]);

  // ✅ INITIAL DATA FETCH
  useEffect(() => {
    const savedFilters = localStorage.getItem('labDashboardFilters');
    
    let defaultFilters = {
      dateFilter: 'today',
      dateType: 'createdAt',
      modality: 'all',
      priority: 'all'
    };
    
    if (savedFilters) {
      try {
        defaultFilters = JSON.parse(savedFilters);
      } catch (error) {
        console.warn('Error loading saved filters:', error);
      }
    }
    
    setSearchFilters(defaultFilters);
    fetchStudies(defaultFilters, 1, 50);
    fetchAnalytics(defaultFilters);
  }, []);

  // ✅ SAVE FILTERS
  useEffect(() => {
    if (Object.keys(searchFilters).length > 0) {
      try {
        localStorage.setItem('labDashboardFilters', JSON.stringify(searchFilters));
      } catch (error) {
        console.warn('Error saving filters:', error);
      }
    }
  }, [searchFilters]);

  // ✅ FETCH WHEN VIEW CHANGES
  useEffect(() => {
    if (Object.keys(searchFilters).length === 0) {
      return;
    }
    
    console.log(`🔄 [Lab] View changed to: ${currentView}`);
    fetchStudies(searchFilters, 1, pagination.recordsPerPage);
  }, [currentView]);

  // ✅ HANDLERS
  const handlePageChange = useCallback((newPage) => {
    console.log(`📄 [Lab] Changing page: ${pagination.currentPage} -> ${newPage}`);
    fetchStudies(searchFilters, newPage, pagination.recordsPerPage);
  }, [fetchStudies, searchFilters, pagination.recordsPerPage]);

  const handleRecordsPerPageChange = useCallback((newLimit) => {
    console.log(`📊 [Lab] Changing limit: ${pagination.recordsPerPage} -> ${newLimit}`);
    fetchStudies(searchFilters, 1, newLimit);
  }, [fetchStudies, searchFilters]);

  const handleSearch = useCallback((searchParams) => {
    console.log('🔍 [Lab] NEW SEARCH:', searchParams);
    
    const cleanedParams = { ...searchParams };
    if (!cleanedParams.search || cleanedParams.search.trim() === '') {
      delete cleanedParams.search;
    }
    
    setSearchFilters(cleanedParams);
    fetchStudies(cleanedParams, 1, pagination.recordsPerPage);
    fetchAnalytics(cleanedParams);
  }, [fetchStudies, fetchAnalytics, pagination.recordsPerPage]);

  const handleFilterChange = useCallback((filters) => {
    console.log('🔍 [Lab] FILTER CHANGE:', filters);
    
    const cleanedFilters = { ...filters };
    if (!cleanedFilters.search || cleanedFilters.search.trim() === '') {
      delete cleanedFilters.search;
    }
    
    setSearchFilters(cleanedFilters);
    fetchStudies(cleanedFilters, 1, pagination.recordsPerPage);
    fetchAnalytics(cleanedFilters);
  }, [fetchStudies, fetchAnalytics, pagination.recordsPerPage]);

  const handleViewChange = useCallback((view) => {
    console.log(`📊 [Lab] TAB CHANGE: ${currentView} -> ${view}`);
    setCurrentView(view);
  }, [currentView]);

  const handleRefresh = useCallback(() => {
    console.log('🔄 [Lab] Manual refresh');
    fetchStudies(searchFilters, pagination.currentPage, pagination.recordsPerPage);
    fetchAnalytics(searchFilters);
  }, [fetchStudies, fetchAnalytics, searchFilters, pagination.currentPage, pagination.recordsPerPage]);

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

  const handleSelectColor = useCallback((color) => {
    setHeaderColor(color);
    localStorage.setItem('labWorklistTableHeaderColor', JSON.stringify(color));
    toast.success(`Header color changed to ${color.name}`, {
      duration: 2000,
      position: 'top-center'
    });
  }, []);

  // Check if user has lab access
  if (!currentUser?.lab) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Lab Access</h1>
          <p className="text-gray-600">You don't have access to any laboratory. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  // ✅ CATEGORY TABS (3 categories only)
  const categoryTabs = [
    { key: 'all', label: 'All', count: categoryValues.all },
    { key: 'pending', label: 'Pending', count: categoryValues.pending },
    { key: 'inprogress', label: 'In Progress', count: categoryValues.inprogress },
    { key: 'completed', label: 'Completed', count: categoryValues.completed }
  ];

  const additionalActions = [
    {
      label: 'Branding',
      icon: Palette,
      onClick: () => navigate('/lab/branding'),
      variant: 'secondary',
      tooltip: 'Configure report branding'
    }
  ];

  return (
    <div className="h-screen bg-blue-50 flex flex-col">
      <Navbar
        title="Lab Dashboard"
        subtitle={`${currentUser.lab?.name || 'Lab'} • Study Management`}
        showOrganizationSelector={false}
        onRefresh={handleRefresh}
        additionalActions={additionalActions}
        theme="lab"
      />
      
      <Search
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        loading={loading}
        totalStudies={categoryValues.all}
        currentCategory={currentView}
        theme="lab"
        initialFilters={searchFilters}
      />

      <div className="flex-1 min-h-0 p-0 px-0">
        <div className="bg-white rounded-lg shadow-sm border border-blue-100 h-full flex flex-col">
          
          {/* ✅ COMPACT WORKLIST HEADER WITH CATEGORY TABS */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center space-x-3">
              <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Lab Worklist
              </h2>
              <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md font-medium">
                {studies.length} loaded
              </span>
            </div>

            {/* ✅ COMPACT MODERN CATEGORY TABS */}
            <div className="flex-1 mx-4 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 min-w-max">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleViewChange(tab.key)}
                    className={`group relative px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 ${
                      currentView === tab.key
                        ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{tab.label}</span>
                      <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
                        currentView === tab.key 
                          ? 'bg-white text-blue-600' 
                          : 'bg-white text-blue-600'
                      }`}>
                        {tab.count}
                      </span>
                    </div>
                    
                    {/* Active indicator */}
                    {currentView === tab.key && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowColorPicker(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border border-blue-300 rounded-lg transition-all shadow-sm"
                title="Change table header color"
              >
                <Palette className="w-4 h-4" />
                <span>Header Color</span>
              </button>
              <ColumnConfigurator
                columnConfig={columnConfig}
                onColumnChange={handleColumnChange}
                onResetToDefault={handleResetColumns}
                theme="lab"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <WorklistTable
              studies={studies}
              loading={loading}
              columnConfig={columnConfig}
              pagination={pagination}
              onPageChange={handlePageChange}
              onRecordsPerPageChange={handleRecordsPerPageChange}
              theme="lab"
              headerColor={headerColor}
              userRole={currentUser?.role || 'viewer'}
              userRoles={currentUser?.roles || []}
            />
          </div>
        </div>
      </div>

      {showColorPicker && (
        <HeaderColorPicker
          isOpen={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          currentColor={headerColor}
          onSelectColor={handleSelectColor}
        />
      )}
    </div>
  );
};

export default LabDashboard;