import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { 
    Search as SearchIcon, 
    X, 
    RefreshCw,
    ChevronDown,
    Filter,
    UserPlus,
    Building,
    Users,
    Shield,
    Crown
} from 'lucide-react';

const Search = ({ 
    onSearch, 
    onFilterChange, 
    loading = false,
    totalStudies = 0,
    currentCategory = 'all',
    analytics = null,
    theme = 'default' // ✅ ADD: Theme support
}) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        category: currentCategory,
        modality: 'all',
        labId: 'all',
        priority: 'all',
        assigneeRole: 'all',
        dateFilter: 'today',
        dateType: 'createdAt',
        customDateFrom: '',
        customDateTo: '',
        limit: 50
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);

    // Check if user is admin or assignor
    const isAdmin = currentUser?.role === 'admin';
    const isAssignor = currentUser?.role === 'assignor';
    const isGreenTheme = theme === 'adminn'; // ✅ Green theme for admin

    // Check user permissions for creating entities
    const canCreateDoctor = ['super_admin', 'admin', 'group_id'].includes(currentUser?.role);
    const canCreateLab = ['super_admin', 'admin'].includes(currentUser?.role);
    const canCreateUser = ['super_admin', 'admin', 'group_id'].includes(currentUser?.role);

    // ✅ ENHANCED: Extended date options
    const dateOptions = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'tomorrow', label: 'Tomorrow' },
        { value: 'last2days', label: 'Last 2 Days' },
        { value: 'last7days', label: 'Last 7 Days' },
        { value: 'last30days', label: 'Last 30 Days' },
        { value: 'thisWeek', label: 'This Week' },
        { value: 'lastWeek', label: 'Last Week' },
        { value: 'thisMonth', label: 'This Month' },
        { value: 'lastMonth', label: 'Last Month' },
        { value: 'last3months', label: 'Last 3 Months' },
        { value: 'last6months', label: 'Last 6 Months' },
        { value: 'thisYear', label: 'This Year' },
        { value: 'lastYear', label: 'Last Year' },
        { value: 'custom', label: 'Custom Range' }
    ];

    // ✅ THEME COLORS
    const themeColors = isGreenTheme ? {
        primary: 'teal-600',
        primaryHover: 'teal-700',
        primaryLight: 'teal-50',
        border: 'teal-300',
        borderLight: 'teal-200',
        text: 'teal-700',
        textSecondary: 'teal-600',
        background: 'teal-50',
        focus: 'focus:ring-teal-500 focus:border-teal-500'
    } : {
        primary: 'black',
        primaryHover: 'gray-800',
        primaryLight: 'gray-50',
        border: 'gray-300',
        borderLight: 'gray-200',
        text: 'gray-700',
        textSecondary: 'gray-600',
        background: 'gray-50',
        focus: 'focus:ring-black focus:border-black'
    };

    // Handle search input change with debouncing
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
        
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        const newTimeout = setTimeout(() => {
            handleSearch(value);
        }, 300);
        
        setSearchTimeout(newTimeout);
    }, [searchTimeout]);

    // Execute search
    const handleSearch = useCallback((term = searchTerm) => {
        const searchParams = {
            search: term.trim() || undefined,
            ...filters
        };
        
        Object.keys(searchParams).forEach(key => {
            if (searchParams[key] === '' || searchParams[key] === 'all' || searchParams[key] === undefined) {
                delete searchParams[key];
            }
        });
        
        onSearch?.(searchParams);
    }, [searchTerm, filters, onSearch]);

    // Handle filter changes
    const handleFilterChange = useCallback((key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        
        const searchParams = {
            search: searchTerm.trim() || undefined,
            ...newFilters
        };
        
        Object.keys(searchParams).forEach(key => {
            if (searchParams[key] === '' || searchParams[key] === 'all' || searchParams[key] === undefined) {
                delete searchParams[key];
            }
        });
        
        onSearch?.(searchParams);
        onFilterChange?.(newFilters);
    }, [filters, searchTerm, onSearch, onFilterChange]);

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        setSearchTerm('');
        const defaultFilters = {
            category: 'all',
            modality: 'all',
            labId: 'all',
            priority: 'all',
            assigneeRole: 'all',
            dateFilter: 'today',
            dateType: 'createdAt',
            customDateFrom: '',
            customDateTo: '',
            limit: 50
        };
        setFilters(defaultFilters);
        onSearch?.(defaultFilters);
        onFilterChange?.(defaultFilters);
    }, [onSearch, onFilterChange]);

    const handleRefresh = useCallback(() => {
        handleSearch();
    }, [handleSearch]);

    // Admin action handlers
    const handleCreateDoctor = useCallback(() => {
        navigate('/admin/create-doctor');
    }, [navigate]);

    const handleCreateLab = useCallback(() => {
        navigate('/admin/create-lab');
    }, [navigate]);

    const handleCreateUser = useCallback(() => {
        navigate('/admin/create-user');
    }, [navigate]);

    // Options
    const modalityOptions = [
        { value: 'all', label: 'All' },
        { value: 'CT', label: 'CT' },
        { value: 'MR', label: 'MRI' },
        { value: 'CR', label: 'CR' },
        { value: 'DX', label: 'DX' },
        { value: 'PR', label: 'PR' }
    ];

    const priorityOptions = [
        { value: 'all', label: 'All' },
        { value: 'STAT', label: 'STAT' },
        { value: 'URGENT', label: 'Urgent' },
        { value: 'NORMAL', label: 'Normal' }
    ];

    const hasActiveFilters = searchTerm || Object.values(filters).some(v => v !== 'all' && v !== 'today' && v !== 'createdAt' && v !== '' && v !== 50);

    return (
        <div className={`bg-white border-b ${themeColors.border} px-3 py-2.5`}>
            {/* ✅ MAIN SEARCH ROW */}
            <div className="flex items-center gap-2">
                
                {/* ✅ SEARCH INPUT */}
                <div className="flex-1 relative max-w-md">
                    <SearchIcon className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 text-${themeColors.textSecondary}`} size={14} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search patients, IDs..."
                        className={`w-full pl-8 pr-6 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} transition-colors`}
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => handleSearchChange('')}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-${themeColors.textSecondary} hover:text-${themeColors.text} p-0.5`}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* ✅ QUICK FILTERS */}
                <div className="flex items-center gap-1">
                    <select
                        value={filters.modality}
                        onChange={(e) => handleFilterChange('modality', e.target.value)}
                        className={`px-2 py-1.5 text-xs border border-${themeColors.border} rounded bg-white text-${themeColors.text} ${themeColors.focus} min-w-16`}
                    >
                        {modalityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.priority}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        className={`px-2 py-1.5 text-xs border border-${themeColors.border} rounded bg-white text-${themeColors.text} ${themeColors.focus} min-w-16`}
                    >
                        {priorityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* ASSIGNOR-SPECIFIC FILTER */}
                    {isAssignor && (
                        <select
                            value={filters.assigneeRole}
                            onChange={(e) => handleFilterChange('assigneeRole', e.target.value)}
                            className={`px-2 py-1.5 text-xs border border-${themeColors.border} rounded bg-white text-${themeColors.text} ${themeColors.focus} min-w-20`}
                        >
                            <option value="all">All Roles</option>
                            <option value="radiologist">Radiologist</option>
                            <option value="verifier">Verifier</option>
                        </select>
                    )}
                </div>

                {/* ✅ ENHANCED: TIME FILTERS WITH MORE OPTIONS */}
                <div className="flex items-center gap-1">
                    {/* Quick date buttons for most common options */}
                    {['Today', 'Yesterday', '7 Days', '30 Days'].map((period) => {
                        const isActive = 
                            (period === 'Today' && filters.dateFilter === 'today') ||
                            (period === 'Yesterday' && filters.dateFilter === 'yesterday') ||
                            (period === '7 Days' && filters.dateFilter === 'last7days') ||
                            (period === '30 Days' && filters.dateFilter === 'last30days');
                        
                        const value = 
                            period === 'Today' ? 'today' :
                            period === 'Yesterday' ? 'yesterday' :
                            period === '7 Days' ? 'last7days' :
                            'last30days';

                        return (
                            <button
                                key={period}
                                onClick={() => {
                                    console.log(`🔍 [Search] QUICK DATE FILTER: ${period} -> ${value}`);
                                    handleFilterChange('dateFilter', value);
                                }}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    isActive
                                        ? isGreenTheme 
                                            ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                            : 'bg-black text-white hover:bg-gray-800'
                                        : isGreenTheme
                                            ? 'text-teal-600 hover:bg-teal-50 border border-teal-300'
                                            : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {period}
                            </button>
                        );
                    })}
                    
                    {/* ✅ ENHANCED: More options dropdown */}
                    <div className="relative">
                        <select
                            value={filters.dateFilter || 'today'}
                            onChange={(e) => {
                                console.log(`🔍 [Search] DROPDOWN DATE FILTER: ${e.target.value}`);
                                handleFilterChange('dateFilter', e.target.value);
                            }}
                            className={`px-2 py-1 text-xs border ${isGreenTheme ? 'border-teal-300' : 'border-gray-300'} rounded bg-white ${isGreenTheme ? 'text-teal-700 focus:ring-teal-500 focus:border-teal-500' : 'text-gray-700 focus:ring-black focus:border-black'} focus:outline-none focus:ring-1 min-w-20`}
                        >
                            <option value="">All Time</option>
                            {dateOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ADMIN BUTTONS */}
                {(canCreateDoctor || canCreateLab || canCreateUser) && (
                    <div className={`flex items-center gap-1 pl-2 border-l border-${themeColors.border}`}>
                        
                        {/* Manage Users Button */}
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/admin/user-management')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${isGreenTheme ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'} text-white text-xs font-medium rounded transition-colors`}
                                title="Manage Users"
                            >
                                <Shield size={12} />
                                <span className="hidden sm:inline">Manage</span>
                            </button>
                        )}
                        
                        {/* Create User Button */}
                        {canCreateUser && (
                            <button
                                onClick={handleCreateUser}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${isGreenTheme ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white text-xs font-medium rounded transition-colors`}
                                title="Create New User"
                            >
                                <Users size={12} />
                                <span className="hidden sm:inline">User</span>
                            </button>
                        )}
                        
                        {/* Create Doctor Button */}
                        {canCreateDoctor && (
                            <button
                                onClick={handleCreateDoctor}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${isGreenTheme ? 'bg-teal-700 hover:bg-teal-800' : 'bg-black hover:bg-gray-800'} text-white text-xs font-medium rounded transition-colors`}
                                title="Create Doctor Account"
                            >
                                <UserPlus size={12} />
                                <span className="hidden sm:inline">Doctor</span>
                            </button>
                        )}
                        
                        {/* Create Lab Button */}
                        {canCreateLab && (
                            <button
                                onClick={handleCreateLab}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${isGreenTheme ? 'bg-slate-600 hover:bg-slate-700' : 'bg-gray-700 hover:bg-gray-800'} text-white text-xs font-medium rounded transition-colors`}
                                title="Create Lab"
                            >
                                <Building size={12} />
                                <span className="hidden sm:inline">Lab</span>
                            </button>
                        )}
                    </div>
                )}

                {/* ASSIGNOR ANALYTICS DISPLAY */}
                {isAssignor && analytics && (
                    <div className={`flex items-center gap-2 pl-2 border-l border-${themeColors.border}`}>
                        <div className="text-xs">
                            <span className={`text-${themeColors.textSecondary}`}>Unassigned:</span>
                            <span className="font-bold text-red-600 ml-1">{analytics.overview?.totalUnassigned || 0}</span>
                        </div>
                        <div className="text-xs">
                            <span className={`text-${themeColors.textSecondary}`}>Assigned:</span>
                            <span className="font-bold text-green-600 ml-1">{analytics.overview?.totalAssigned || 0}</span>
                        </div>
                        <div className="text-xs">
                            <span className={`text-${themeColors.textSecondary}`}>Overdue:</span>
                            <span className="font-bold text-orange-600 ml-1">{analytics.overview?.overdueStudies || 0}</span>
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-1">
                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${
                            showAdvanced 
                                ? isGreenTheme 
                                    ? `bg-teal-600 text-white border-teal-600` 
                                    : 'bg-black text-white border-black'
                                : isGreenTheme
                                    ? `bg-white text-${themeColors.text} border-${themeColors.border} hover:bg-${themeColors.primaryLight}`
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Filter size={12} />
                        <span className="hidden sm:inline">Filters</span>
                        <ChevronDown size={10} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="px-2 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded border border-red-200 hover:bg-red-100 transition-colors"
                        >
                            Clear
                        </button>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className={`p-1.5 text-${themeColors.textSecondary} hover:text-${themeColors.text} hover:bg-${themeColors.primaryLight} rounded transition-colors disabled:opacity-50`}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* RESULTS COUNT */}
                <div className={`flex items-center gap-1 text-xs text-${themeColors.textSecondary} pl-2 border-l border-${themeColors.border}`}>
                    <span className={`font-bold text-${themeColors.primary}`}>{totalStudies.toLocaleString()}</span>
                    <span className="hidden sm:inline">studies</span>
                    {loading && <span className={`text-${isGreenTheme ? 'teal-600' : 'green-600'} font-medium`}>• Live</span>}
                </div>
            </div>

            {/* ✅ ADVANCED FILTERS PANEL */}
            {showAdvanced && (
                <div className={`mt-2.5 pt-2.5 border-t border-${themeColors.borderLight}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        
                        {/* Date Range Selector */}
                        <div className="col-span-2">
                            <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                Date Range
                            </label>
                            <select
                                value={filters.dateFilter || 'today'}
                                onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                                className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                            >
                                <option value="">All Time</option>
                                {dateOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Type */}
                        <div>
                            <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                Date Type
                            </label>
                            <select
                                value={filters.dateType || 'createdAt'}
                                onChange={(e) => handleFilterChange('dateType', e.target.value)}
                                className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                            >
                                <option value="createdAt">Upload Date</option>
                                <option value="StudyDate">Study Date</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {filters.dateFilter === 'custom' && (
                            <>
                                <div>
                                    <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.customDateFrom || ''}
                                        onChange={(e) => handleFilterChange('customDateFrom', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.customDateTo || ''}
                                        onChange={(e) => handleFilterChange('customDateTo', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                                    />
                                </div>
                            </>
                        )}

                        {/* Lab Selector */}
                        <div>
                            <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                Lab
                            </label>
                            <select
                                value={filters.labId || 'all'}
                                onChange={(e) => handleFilterChange('labId', e.target.value)}
                                className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                            >
                                <option value="all">All Labs</option>
                                {/* Add lab options dynamically */}
                            </select>
                        </div>

                        {/* Results Per Page */}
                        <div>
                            <label className={`block text-xs font-medium text-${themeColors.textSecondary} mb-1`}>
                                Per Page
                            </label>
                            <select
                                value={filters.limit}
                                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                                className={`w-full px-2 py-1.5 text-xs border border-${themeColors.border} rounded ${themeColors.focus} bg-white`}
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;