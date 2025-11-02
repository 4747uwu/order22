import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  TrendingUp,
  RefreshCw,
  Search as SearchIcon,    // <-- alias the lucide icon
  Filter, 
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Crown,
  Settings,
  BarChart3,
  Calendar,
  Clock,
  Building,
  UserCheck,
  UserX,
  Edit3,
  Save,
  X,
  RotateCcw,
  Download,
  Mail,
  Key,
  EyeOff
} from 'lucide-react';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import Search from '../../components/common/Search/Search';
import toast from 'react-hot-toast';

const GroupIdDashboard = () => {
  const { currentUser, currentOrganizationContext } = useAuth();
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [deleteModal, setDeleteModal] = useState({ show: false, user: null });

  // Form state for editing
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: ''
  });

  // Role configuration
  const roleConfig = {
    assignor: { name: 'Assignor', color: 'bg-blue-100 text-blue-800', icon: Users },
    radiologist: { name: 'Radiologist', color: 'bg-green-100 text-green-800', icon: Shield },
    verifier: { name: 'Verifier', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
    physician: { name: 'Physician', color: 'bg-indigo-100 text-indigo-800', icon: Crown },
    receptionist: { name: 'Receptionist', color: 'bg-pink-100 text-pink-800', icon: UserPlus },
    billing: { name: 'Billing', color: 'bg-yellow-100 text-yellow-800', icon: BarChart3 },
    typist: { name: 'Typist', color: 'bg-orange-100 text-orange-800', icon: Edit },
    dashboard_viewer: { name: 'Dashboard Viewer', color: 'bg-gray-100 text-gray-800', icon: Eye }
  };

  // Statistics calculation
  const statistics = useMemo(() => {
    const activeUsers = users.filter(u => u.isActive).length;
    const radiologists = users.filter(u => u.role === 'radiologist').length;
    const recentLogins = users.filter(u => {
      if (!u.lastLoginAt) return false;
      const lastLogin = new Date(u.lastLoginAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastLogin > weekAgo;
    }).length;

    return {
      totalUsers: users.length,
      activeUsers,
      radiologists,
      recentLogins
    };
  }, [users]);

  // Fetch data functions
  const fetchUsers = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const endpoint = '/group/user-management/users';
      const response = await api.get(endpoint, { params: filters });
      
      if (response.data.success) {
        setUsers(response.data.data.users || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/group/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Filter users based on search filters
  useEffect(() => {
    let filtered = users;
    
    if (searchFilters.search) {
      const searchTerm = searchFilters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.role.toLowerCase().includes(searchTerm)
      );
    }
    
    if (searchFilters.role && searchFilters.role !== 'all') {
      filtered = filtered.filter(user => user.role === searchFilters.role);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchFilters]);

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  // Handlers
  const handleSearch = useCallback((searchParams) => {
    setSearchFilters(searchParams);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setSearchFilters(filters);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchUsers(searchFilters);
    fetchStats();
  }, [fetchUsers, fetchStats, searchFilters]);

  const handleCreateUser = useCallback(() => {
    navigate('/admin/create-user');
  }, [navigate]);

  // User management handlers
  const handleTogglePassword = (userId) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleEditUser = (user) => {
    setEditingUser(user._id);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ fullName: '', email: '', password: '', role: '' });
  };

  const handleSaveUser = async (userId) => {
    try {
      const updates = {};
      const currentUser = users.find(u => u._id === userId);
      
      if (editForm.fullName !== currentUser?.fullName) {
        updates.fullName = editForm.fullName;
      }
      if (editForm.email !== currentUser?.email) {
        updates.email = editForm.email;
      }
      if (editForm.password) {
        updates.password = editForm.password;
      }

      if (Object.keys(updates).length > 0) {
        await api.put(`/group/user-management/${userId}/credentials`, updates);
        toast.success('User credentials updated successfully');
      }

      // Handle role change separately
      if (editForm.role !== currentUser?.role) {
        await api.put(`/group/user-management/${userId}/role`, { newRole: editForm.role });
        toast.success('User role updated successfully');
      }

      fetchUsers(searchFilters);
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/group/user-management/${userId}/status`, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers(searchFilters);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const response = await api.post(`/group/user-management/${userId}/reset-password`);
      if (response.data.success) {
        toast.success(`Password reset to: ${response.data.defaultPassword}`);
        fetchUsers(searchFilters);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;

    try {
      await api.delete(`/group/user-management/${deleteModal.user._id}`, {
        data: { confirmDelete: true }
      });
      toast.success('User deleted successfully');
      setDeleteModal({ show: false, user: null });
      fetchUsers(searchFilters);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Full Name', 'Email', 'Role', 'Status', 'Created At'].join(','),
      ...filteredUsers.map(user => [
        user.fullName,
        user.email,
        user.role,
        user.isActive ? 'Active' : 'Inactive',
        new Date(user.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${currentOrganizationContext || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Statistics cards data
  const statisticsCards = [
    {
      title: 'Total Users',
      value: statistics.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Users',
      value: statistics.activeUsers,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Radiologists',
      value: statistics.radiologists,
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Recent Logins',
      value: statistics.recentLogins,
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  // Navbar actions
  const navbarActions = [
    {
      label: 'Export Users',
      icon: Download,
      onClick: exportUsers,
      variant: 'secondary',
      tooltip: 'Export user list'
    },
    {
      label: 'Create User',
      icon: UserPlus,
      onClick: handleCreateUser,
      variant: 'primary',
      tooltip: 'Create new user role'
    }
  ];

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* ✅ NAVBAR - Similar to Assigner */}
      <Navbar
        title="Group ID Dashboard"
        subtitle={`${currentOrganizationContext === 'global' ? 'Global View' : currentOrganizationContext || 'Organization View'} • Role Creator & Manager`}
        showOrganizationSelector={false}
        onRefresh={handleRefresh}
        additionalActions={navbarActions}
        notifications={0}
      />
      
      {/* ✅ SEARCH BAR - Reuse Admin Search Component */}
      <div className="bg-white border-b border-gray-300 px-3 py-2.5">
        <div className="flex items-center gap-2">
          
          {/* Search Input */}
          <div className="flex-1 relative max-w-md">
            <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchFilters.search || ''}
              onChange={(e) => handleSearch({ ...searchFilters, search: e.target.value })}
              placeholder="Search users by name, email, role..."
              className="w-full pl-8 pr-6 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
            />
            {searchFilters.search && (
              <button 
                onClick={() => handleSearch({ ...searchFilters, search: '' })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={searchFilters.role || 'all'}
            onChange={(e) => handleSearch({ ...searchFilters, role: e.target.value })}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-black min-w-24"
          >
            <option value="all">All Roles</option>
            {Object.entries(roleConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.name}</option>
            ))}
          </select>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-gray-300">
            <button
              onClick={exportUsers}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
              title="Export Users"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded hover:from-purple-700 hover:to-indigo-700 transition-colors"
              title="Create New User"
            >
              <Users size={12} />
              <span className="hidden sm:inline">Create User</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Results Count */}
          <div className="flex items-center gap-1 text-xs text-gray-500 pl-2 border-l border-gray-300">
            <span className="font-bold text-black">{filteredUsers.length}</span>
            <span className="hidden sm:inline">users</span>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* ✅ STATISTICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statisticsCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${card.bgColor}`}>
                        <Icon className={`h-6 w-6 ${card.textColor}`} />
                      </div>
                    </div>
                  </div>
                  <div className={`h-1 bg-gradient-to-r ${card.color}`}></div>
                </div>
              );
            })}
          </div>

          {/* ✅ USERS MANAGEMENT TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Users Management ({filteredUsers.length})</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Manage all users within your organization</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credentials
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      
                      {/* User Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user._id ? (
                          <input
                            type="text"
                            value={editForm.fullName}
                            onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                              <div className="text-sm text-gray-500">
                                Created: {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Credentials */}
                      <td className="px-6 py-4">
                        {editingUser === user._id ? (
                          <div className="space-y-2">
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Email"
                            />
                            <input
                              type="password"
                              value={editForm.password}
                              onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="New password (leave blank to keep current)"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Key className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono text-gray-600">
                                {showPasswords[user._id] ? user.password : '••••••••'}
                              </span>
                              <button
                                onClick={() => handleTogglePassword(user._id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords[user._id] ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user._id ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            {Object.entries(roleConfig).map(([key, config]) => (
                              <option key={key} value={key}>{config.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig[user.role]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {React.createElement(roleConfig[user.role]?.icon || Users, { className: "w-3 h-3" })}
                            <span>{roleConfig[user.role]?.name || user.role}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {user.lastLoginAt && (
                            <span className="text-xs text-gray-500">
                              Last: {new Date(user.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user._id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSaveUser(user._id)}
                              className="text-green-600 hover:text-green-800"
                              title="Save changes"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-800"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit user"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                              className={`${user.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              title={user.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleResetPassword(user._id)}
                              className="text-yellow-600 hover:text-yellow-800"
                              title="Reset password"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ show: true, user })}
                              className="text-red-600 hover:text-red-800"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                          <p className="text-gray-600 mb-4">
                            {searchFilters.search || searchFilters.role !== 'all' 
                              ? 'Try adjusting your search or filter criteria' 
                              : 'Get started by creating your first user role'}
                          </p>
                          {!searchFilters.search && searchFilters.role === 'all' && (
                            <button
                              onClick={handleCreateUser}
                              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <UserPlus className="h-4 w-4" />
                              <span>Create User</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ DELETE CONFIRMATION MODAL */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteModal.user?.fullName}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, user: null })}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupIdDashboard;