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
    analytics = null // ✅ NEW PROP FOR ASSIGNOR ANALYTICS
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
        assigneeRole: 'all', // ✅ NEW FOR ASSIGNOR
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

    // Check user permissions for creating entities
    const canCreateDoctor = ['super_admin', 'admin', 'group_id'].includes(currentUser?.role);
    const canCreateLab = ['super_admin', 'admin'].includes(currentUser?.role); // ✅ REMOVED group_id
    const canCreateUser = ['super_admin', 'admin', 'group_id'].includes(currentUser?.role);

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

    // ✅ ADMIN ACTION HANDLERS (ONLY FOR ADMIN AND GROUP_ID)
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
        <div className="bg-white border-b border-gray-300 px-3 py-2.5">
            {/* ✅ COMPACT MAIN SEARCH ROW */}
            <div className="flex items-center gap-2">
                
                {/* ✅ COMPACT SEARCH INPUT */}
                <div className="flex-1 relative max-w-md">
                    <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search patients, IDs..."
                        className="w-full pl-8 pr-6 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => handleSearchChange('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* ✅ COMPACT QUICK FILTERS */}
                <div className="flex items-center gap-1">
                    <select
                        value={filters.modality}
                        onChange={(e) => handleFilterChange('modality', e.target.value)}
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-black min-w-16"
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
                        className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-black min-w-16"
                    >
                        {priorityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* ✅ ASSIGNOR-SPECIFIC FILTER */}
                    {isAssignor && (
                        <select
                            value={filters.assigneeRole}
                            onChange={(e) => handleFilterChange('assigneeRole', e.target.value)}
                            className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-black min-w-20"
                        >
                            <option value="all">All Roles</option>
                            <option value="radiologist">Radiologist</option>
                            <option value="verifier">Verifier</option>
                        </select>
                    )}
                </div>

                {/* ✅ COMPACT TIME FILTERS */}
                <div className="flex items-center gap-1">
                    {['Today', 'Week', 'Month'].map((period) => {
                        const isActive = 
                            (period === 'Today' && filters.dateFilter === 'today') ||
                            (period === 'Week' && filters.dateFilter === 'thisWeek') ||
                            (period === 'Month' && filters.dateFilter === 'thisMonth');
                        
                        const value = 
                            period === 'Today' ? 'today' :
                            period === 'Week' ? 'thisWeek' :
                            'thisMonth';

                        return (
                            <button
                                key={period}
                                onClick={() => handleFilterChange('dateFilter', value)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                    isActive
                                        ? 'bg-black text-white'
                                        : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {period}
                            </button>
                        );
                    })}
                </div>

                {/* ✅ ENHANCED ADMIN BUTTONS (ONLY FOR ADMIN AND GROUP_ID) */}
                {(canCreateDoctor || canCreateLab || canCreateUser) && (
                    <div className="flex items-center gap-1 pl-2 border-l border-gray-300">
                        
                        {/* Manage Users Button (ONLY ADMIN) */}
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/admin/user-management')}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded hover:from-indigo-700 hover:to-purple-700 transition-colors"
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
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded hover:from-purple-700 hover:to-indigo-700 transition-colors"
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
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
                                title="Create Doctor Account"
                            >
                                <UserPlus size={12} />
                                <span className="hidden sm:inline">Doctor</span>
                            </button>
                        )}
                        
                        {/* Create Lab Button (ONLY ADMIN) */}
                        {canCreateLab && (
                            <button
                                onClick={handleCreateLab}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
                                title="Create Lab"
                            >
                                <Building size={12} />
                                <span className="hidden sm:inline">Lab</span>
                            </button>
                        )}
                    </div>
                )}

                {/* ✅ ASSIGNOR ANALYTICS DISPLAY */}
                {isAssignor && analytics && (
                    <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
                        <div className="text-xs">
                            <span className="text-gray-500">Unassigned:</span>
                            <span className="font-bold text-red-600 ml-1">{analytics.overview?.totalUnassigned || 0}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-gray-500">Assigned:</span>
                            <span className="font-bold text-green-600 ml-1">{analytics.overview?.totalAssigned || 0}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-gray-500">Overdue:</span>
                            <span className="font-bold text-orange-600 ml-1">{analytics.overview?.overdueStudies || 0}</span>
                        </div>
                    </div>
                )}

                {/* ✅ COMPACT ACTION BUTTONS */}
                <div className="flex items-center gap-1">
                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${
                            showAdvanced 
                                ? 'bg-black text-white border-black' 
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
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* ✅ COMPACT RESULTS COUNT */}
                <div className="flex items-center gap-1 text-xs text-gray-500 pl-2 border-l border-gray-300">
                    <span className="font-bold text-black">{totalStudies.toLocaleString()}</span>
                    <span className="hidden sm:inline">studies</span>
                    {loading && <span className="text-green-600 font-medium">• Live</span>}
                </div>
            </div>

            {/* ✅ COMPACT ADVANCED FILTERS PANEL */}
            {showAdvanced && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Lab Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Lab
                            </label>
                            <select
                                value={filters.labId}
                                onChange={(e) => handleFilterChange('labId', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                            >
                                <option value="all">All Labs</option>
                                {/* Add lab options dynamically */}
                            </select>
                        </div>

                        {/* Date Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Date Type
                            </label>
                            <select
                                value={filters.dateType}
                                onChange={(e) => handleFilterChange('dateType', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                            >
                                <option value="createdAt">Upload Date</option>
                                <option value="StudyDate">Study Date</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {filters.dateFilter === 'custom' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.customDateFrom}
                                        onChange={(e) => handleFilterChange('customDateFrom', e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.customDateTo}
                                        onChange={(e) => handleFilterChange('customDateTo', e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                    />
                                </div>
                            </>
                        )}

                        {/* Results Per Page */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Per Page
                            </label>
                            <select
                                value={filters.limit}
                                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
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