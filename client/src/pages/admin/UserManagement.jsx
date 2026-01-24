import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import { Download, Search, UserPlus, Edit, Trash2, Eye, EyeOff, UserCheck, UserX, Settings, X, Check } from 'lucide-react';
import ColumnSelector from '../../components/common/ColumnSelector';
import { getDefaultColumnsForRole } from '../../constants/worklistColumns';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // State management
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [showPasswords, setShowPasswords] = useState({});
    const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    
    // ✅ NEW: Edit Modal State
    const [editModal, setEditModal] = useState({
        show: false,
        user: null,
        loading: false
    });
    
    // ✅ NEW: Edit Form State
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        password: '',
        visibleColumns: [],
        requireReportVerification: false
    });

    const roleOptions = [
        { value: 'group_id', label: 'Group ID', color: 'bg-purple-100 text-purple-800' },
        { value: 'assignor', label: 'Assignor', color: 'bg-teal-100 text-teal-800' },
        { value: 'radiologist', label: 'Radiologist', color: 'bg-green-100 text-green-800' },
        { value: 'verifier', label: 'Verifier', color: 'bg-indigo-100 text-indigo-800' },
        { value: 'physician', label: 'Physician', color: 'bg-teal-100 text-teal-800' },
        { value: 'receptionist', label: 'Receptionist', color: 'bg-pink-100 text-pink-800' },
        { value: 'billing', label: 'Billing', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'typist', label: 'Typist', color: 'bg-orange-100 text-orange-800' },
        { value: 'dashboard_viewer', label: 'Dashboard Viewer', color: 'bg-gray-100 text-gray-800' },
        { value: 'lab_staff', label: 'Lab Staff', color: 'bg-cyan-100 text-cyan-800' }
    ];

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchOrganizationUsers();
    }, [currentUser, navigate]);

    // Filter users based on search and role
    useEffect(() => {
        let filtered = users;

        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (roleFilter && roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        setFilteredUsers(filtered);
    }, [users, searchTerm, roleFilter]);

    const fetchOrganizationUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('admin/manage-users'); // ✅ FIXED: Use correct endpoint
            setUsers(response.data.data.users || []); // ✅ FIXED: Access users from nested structure
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePassword = (userId) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    // ✅ OPEN EDIT MODAL
    const handleOpenEditModal = async (user) => {
        setEditModal({ show: true, user, loading: false }); // ✅ Set loading false initially
        
        // ✅ Set form data with verification status from user object
        setEditForm({
            fullName: user.fullName,
            email: user.email,
            password: '',
            visibleColumns: user.visibleColumns || [],
            requireReportVerification: user.requireReportVerification || false // ✅ Already in user object
        });
    };

    // ✅ CLOSE EDIT MODAL
    const handleCloseEditModal = () => {
        setEditModal({ show: false, user: null, loading: false });
        setEditForm({
            fullName: '',
            email: '',
            password: '',
            visibleColumns: [],
            requireReportVerification: false
        });
    };

// ✅ SAVE USER CHANGES
const handleSaveUser = async () => {
    try {
        setEditModal(prev => ({ ...prev, loading: true }));
        
        const updateData = {
            fullName: editForm.fullName,
            email: editForm.email,
            visibleColumns: editForm.visibleColumns
        };

        if (editForm.password) {
            updateData.password = editForm.password;
        }

        // ✅ ADD VERIFICATION TOGGLE FOR RADIOLOGIST AND LAB_STAFF
        if (editModal.user.role === 'radiologist' || editModal.user.role === 'lab_staff') {
            updateData.requireReportVerification = editForm.requireReportVerification;
        }

        // ✅ Single API call updates everything including verification
        await api.put(`admin/manage-users/${editModal.user._id}/credentials`, updateData);

        toast.success('User updated successfully');
        handleCloseEditModal();
        fetchOrganizationUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
        setEditModal(prev => ({ ...prev, loading: false }));
    }
};

    // ✅ HANDLE COLUMN TOGGLE
    const handleColumnToggle = (columnId) => {
        setEditForm(prev => ({
            ...prev,
            visibleColumns: prev.visibleColumns.includes(columnId)
                ? prev.visibleColumns.filter(id => id !== columnId)
                : [...prev.visibleColumns, columnId]
        }));
    };

    // ✅ HANDLE SELECT ALL COLUMNS
    const handleSelectAllColumns = (columns) => {
        setEditForm(prev => ({
            ...prev,
            visibleColumns: columns.map(col => col.id)
        }));
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.put(`/admin/user-management/${userId}/toggle-status`, {
                isActive: !currentStatus
            });
            toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
            fetchOrganizationUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast.error('Failed to toggle user status');
        }
    };

    const handleDeleteUser = async () => {
        try {
            await api.delete(`/admin/user-management/${deleteModal.user._id}`, {
                data: { confirmDelete: true }
            });
            toast.success('User deleted successfully');
            setDeleteModal({ show: false, user: null });
            fetchOrganizationUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        }
    };

    const getRoleColor = (role) => {
        const roleOption = roleOptions.find(opt => opt.value === role);
        return roleOption?.color || 'bg-gray-100 text-gray-800';
    };

    const exportUsers = () => {
        const csv = [
            ['Full Name', 'Email', 'Username', 'Role', 'Status', 'Created At'].join(','),
            ...filteredUsers.map(user => [
                user.fullName,
                user.email,
                user.username,
                user.role,
                user.isActive ? 'Active' : 'Inactive',
                new Date(user.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar title="User Management" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                            <p className="text-gray-600 mt-1">Manage users in your organization</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={exportUsers}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                <Download className="w-4 h-4 inline mr-2" />
                                Export
                            </button>
                            <button
                                onClick={() => navigate('/admin/create-user')}
                                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                            >
                                <UserPlus className="w-4 h-4 inline mr-2" />
                                Create User
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="all">All Roles</option>
                            {roleOptions.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credentials</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Columns</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.map(user => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">{user.fullName}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                            {user.role.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div className="text-gray-500 flex items-center">
                                                @{user.username}
                                                <button
                                                    onClick={() => handleTogglePassword(user._id)}
                                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPasswords[user._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {showPasswords[user._id] && (
                                                <div className="text-xs text-gray-400 mt-1">********</div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {user.visibleColumns?.length || 0} columns
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleOpenEditModal(user)}
                                                className="p-1 text-blue-600 hover:text-blue-700"
                                                title="Edit"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                                                className={`p-1 ${user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                                                title={user.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => setDeleteModal({ show: true, user })}
                                                className="p-1 text-red-600 hover:text-red-700"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ✅ EDIT USER MODAL */}
                {editModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
                                    <p className="text-sm text-gray-500 mt-1">{editModal.user?.email}</p>
                                </div>
                                <button
                                    onClick={handleCloseEditModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.fullName}
                                                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                New Password (leave blank to keep current)
                                            </label>
                                            <input
                                                type="password"
                                                value={editForm.password}
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                placeholder="Enter new password"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Column Selection */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Visible Columns ({editForm.visibleColumns.length} selected)
                                    </h4>
                                    <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                                        <ColumnSelector
                                            selectedColumns={editForm.visibleColumns}
                                            onColumnToggle={handleColumnToggle}
                                            onSelectAll={handleSelectAllColumns}
                                            onClearAll={() => setEditForm({ ...editForm, visibleColumns: [] })}
                                        />
                                    </div>
                                </div>

                                {/* Verification Toggle (for radiologist and lab_staff) */}
                                {(editModal.user?.role === 'radiologist' || editModal.user?.role === 'lab_staff') && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Report Verification</h4>
                                        <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <div>
                                                <div className="font-medium text-gray-900">Require Report Verification</div>
                                                <div className="text-sm text-gray-500">
                                                    All finalized reports must be verified before completion
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.requireReportVerification}
                                                    onChange={(e) => setEditForm({ ...editForm, requireReportVerification: e.target.checked })}
                                                    className="sr-only"
                                                />
                                                <div className={`block w-14 h-8 rounded-full transition ${editForm.requireReportVerification ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${editForm.requireReportVerification ? 'transform translate-x-6' : ''}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
                                <button
                                    onClick={handleCloseEditModal}
                                    disabled={editModal.loading}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={editModal.loading}
                                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 flex items-center"
                                >
                                    {editModal.loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md">
                            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{deleteModal.user?.fullName}</strong>?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setDeleteModal({ show: false, user: null })}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;