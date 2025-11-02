import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
    ArrowLeft,
    Building,
    Users,
    Shield,
    Mail,
    Key,
    Eye,
    EyeOff,
    Edit3,
    Save,
    X,
    Trash2,
    RotateCcw,
    UserCheck,
    UserX,
    Crown,
    AlertTriangle,
    CheckCircle,
    Search,
    Filter,
    Download,
    UserPlus
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // State management
    const [loading, setLoading] = useState(false);
    const [organization, setOrganization] = useState(null);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [showPasswords, setShowPasswords] = useState({});
    const [editingUser, setEditingUser] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Form state for editing
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        password: '',
        role: ''
    });

    // ✅ UPDATED: Role options with teal colors
    const roleOptions = [
        { value: 'group_id', label: 'Group ID', color: 'bg-purple-100 text-purple-800' },
        { value: 'assignor', label: 'Assignor', color: 'bg-teal-100 text-teal-800' }, // ✅ UPDATED: Teal for assignor
        { value: 'radiologist', label: 'Radiologist', color: 'bg-green-100 text-green-800' },
        { value: 'verifier', label: 'Verifier', color: 'bg-indigo-100 text-indigo-800' },
        { value: 'physician', label: 'Physician', color: 'bg-teal-100 text-teal-800' },
        { value: 'receptionist', label: 'Receptionist', color: 'bg-pink-100 text-pink-800' },
        { value: 'billing', label: 'Billing', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'typist', label: 'Typist', color: 'bg-orange-100 text-orange-800' },
        { value: 'dashboard_viewer', label: 'Dashboard Viewer', color: 'bg-gray-100 text-gray-800' }
    ];

    useEffect(() => {
        if (!['admin', 'super_admin'].includes(currentUser?.role)) {
            navigate('/login');
            return;
        }
        fetchOrganizationUsers();
    }, [currentUser, navigate]);

    // Filter users based on search and role
    useEffect(() => {
        let filtered = users;
        
        if (searchTerm) {
            filtered = filtered.filter(user => 
                user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }
        
        setFilteredUsers(filtered);
    }, [users, searchTerm, roleFilter]);

    const fetchOrganizationUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/manage-users');
            if (response.data.success) {
                setOrganization(response.data.data.organization);
                setUsers(response.data.data.users);
                setFilteredUsers(response.data.data.users);
            }
        } catch (error) {
            console.error('Error fetching organization users:', error);
            toast.error('Failed to fetch organization users');
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
                await api.put(`/admin/manage-users/${userId}/credentials`, updates);
                toast.success('User credentials updated successfully');
            }

            // Handle role change separately
            if (editForm.role !== currentUser?.role) {
                await api.put(`/admin/manage-users/${userId}/role`, { newRole: editForm.role });
                toast.success('User role updated successfully');
            }

            fetchOrganizationUsers();
            handleCancelEdit();
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.put(`/admin/manage-users/${userId}/status`, { isActive: !currentStatus });
            toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            fetchOrganizationUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast.error('Failed to update user status');
        }
    };

    const handleResetPassword = async (userId) => {
        try {
            const response = await api.post(`/admin/manage-users/${userId}/reset-password`);
            if (response.data.success) {
                toast.success(`Password reset to: ${response.data.defaultPassword}`);
                fetchOrganizationUsers();
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            toast.error('Failed to reset password');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteModal.user) return;

        try {
            await api.delete(`/admin/manage-users/${deleteModal.user._id}`, {
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
        const roleOption = roleOptions.find(r => r.value === role);
        return roleOption?.color || 'bg-gray-100 text-gray-800';
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
        a.download = `users_${organization?.identifier || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center"> {/* ✅ UPDATED: Teal background */}
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div> {/* ✅ UPDATED: Teal spinner */}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-teal-50"> {/* ✅ UPDATED: Teal background */}
            {/* ✅ UPDATED: Header with teal theme */}
            <div className="bg-white border-b border-teal-200 shadow-sm"> {/* ✅ UPDATED: Teal border */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-teal-600 transition-colors" // ✅ UPDATED: Teal hover
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back to Dashboard</span>
                        </button>
                        
                        <div className="flex items-center space-x-3">
                            <Users className="w-6 h-6 text-teal-600" /> {/* ✅ UPDATED: Teal icon */}
                            <div>
                                <h1 className="text-xl font-bold text-teal-800">User Management</h1> {/* ✅ UPDATED: Teal title */}
                                <p className="text-sm text-teal-600">{organization?.displayName || organization?.name}</p> {/* ✅ UPDATED: Teal subtitle */}
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/admin/create-user')}
                            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg hover:from-teal-700 hover:to-green-700 transition-all shadow-lg" // ✅ UPDATED: Teal gradient
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Add User</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                
                {/* ✅ UPDATED: Organization Stats with teal theme */}
                <div className="bg-white rounded-lg shadow-sm border border-teal-200 p-6 mb-6"> {/* ✅ UPDATED: Teal border */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-teal-800 mb-2">Organization Overview</h2> {/* ✅ UPDATED: Teal title */}
                            <div className="grid grid-cols-4 gap-6">
                                <div>
                                    <p className="text-sm text-teal-600">Total Users</p> {/* ✅ UPDATED: Teal label */}
                                    <p className="text-2xl font-bold text-teal-700">{users.length}</p> {/* ✅ UPDATED: Teal number */}
                                </div>
                                <div>
                                    <p className="text-sm text-teal-600">Active Users</p> {/* ✅ UPDATED: Teal label */}
                                    <p className="text-2xl font-bold text-green-600">
                                        {users.filter(u => u.isActive).length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-teal-600">Radiologists</p> {/* ✅ UPDATED: Teal label */}
                                    <p className="text-2xl font-bold text-purple-600">
                                        {users.filter(u => u.role === 'radiologist').length}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-teal-600">Support Staff</p> {/* ✅ UPDATED: Teal label */}
                                    <p className="text-2xl font-bold text-orange-600">
                                        {users.filter(u => ['receptionist', 'billing', 'typist'].includes(u.role)).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ UPDATED: Filters and Search with teal theme */}
                <div className="bg-white rounded-lg shadow-sm border border-teal-200 p-4 mb-6"> {/* ✅ UPDATED: Teal border */}
                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-400 w-4 h-4" /> {/* ✅ UPDATED: Teal icon */}
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search users by name, email, or role..."
                                    className="w-full pl-10 pr-4 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" // ✅ UPDATED: Teal focus
                                />
                            </div>
                        </div>
                        
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" // ✅ UPDATED: Teal focus
                        >
                            <option value="all">All Roles</option>
                            {roleOptions.map(role => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={exportUsers}
                            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors" // ✅ UPDATED: Teal button
                        >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* ✅ UPDATED: Users Table with teal theme */}
                <div className="bg-white rounded-lg shadow-sm border border-teal-200 overflow-hidden"> {/* ✅ UPDATED: Teal border */}
                    <div className="px-6 py-4 border-b border-teal-200 bg-teal-50"> {/* ✅ UPDATED: Teal header background */}
                        <h3 className="text-lg font-semibold text-teal-800 flex items-center space-x-2"> {/* ✅ UPDATED: Teal title */}
                            <Shield className="w-5 h-5" />
                            <span>Users ({filteredUsers.length})</span>
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-teal-100"> {/* ✅ UPDATED: Teal divider */}
                            <thead className="bg-teal-50"> {/* ✅ UPDATED: Teal header background */}
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-600 uppercase tracking-wider"> {/* ✅ UPDATED: Teal header text */}
                                        User Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-600 uppercase tracking-wider">
                                        Credentials
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-600 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-teal-100"> {/* ✅ UPDATED: Teal divider */}
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-teal-25 transition-colors"> {/* ✅ UPDATED: Teal hover */}
                                        
                                        {/* User Details */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingUser === user._id ? (
                                                <input
                                                    type="text"
                                                    value={editForm.fullName}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                                                    className="w-full px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" // ✅ UPDATED: Teal focus
                                                />
                                            ) : (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                                    <div className="text-sm text-teal-600"> {/* ✅ UPDATED: Teal text */}
                                                        Created: {new Date(user.createdAt).toLocaleDateString()}
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
                                                        className="w-full px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" // ✅ UPDATED: Teal focus
                                                        placeholder="Email"
                                                    />
                                                    <input
                                                        type="password"
                                                        value={editForm.password}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                                        className="w-full px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" // ✅ UPDATED: Teal focus
                                                        placeholder="New password (leave blank to keep current)"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <Mail className="w-4 h-4 text-teal-400" /> {/* ✅ UPDATED: Teal icon */}
                                                        <span className="text-sm text-gray-900">{user.email}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Key className="w-4 h-4 text-teal-400" /> {/* ✅ UPDATED: Teal icon */}
                                                        <span className="text-sm font-mono text-gray-600">
                                                            {showPasswords[user._id] ? user.password : '••••••••'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleTogglePassword(user._id)}
                                                            className="text-teal-400 hover:text-teal-600" // ✅ UPDATED: Teal button
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
                                                    className="px-2 py-1 border border-teal-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" // ✅ UPDATED: Teal focus
                                                >
                                                    {roleOptions.map(role => (
                                                        <option key={role.value} value={role.value}>
                                                            {role.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                                                    {roleOptions.find(r => r.value === user.role)?.label || user.role}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                {user.isActive ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <X className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ✅ UPDATED: Actions with teal colors */}
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
                                                        className="text-teal-600 hover:text-teal-800" // ✅ UPDATED: Teal edit button
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
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => setDeleteModal({ show: true, user })}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ✅ UPDATED: Delete Confirmation Modal with teal theme */}
            {deleteModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border border-teal-200"> {/* ✅ UPDATED: Teal border */}
                        <div className="flex items-center space-x-3 mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h3 className="text-lg font-semibold text-teal-800">Delete User</h3> {/* ✅ UPDATED: Teal title */}
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{deleteModal.user?.fullName}</strong>? 
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteModal({ show: false, user: null })}
                                className="px-4 py-2 text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors" // ✅ UPDATED: Teal cancel button
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

export default UserManagement;