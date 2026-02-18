// client/src/components/common/SettingsModal.jsx
import React from 'react';
import { X, UserPlus, Building, Shield, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SettingsModal = ({ isOpen, onClose, onNavigate, theme = 'default' }) => {
    const { currentUser } = useAuth();
    
    if (!isOpen) return null;

    const isAdmin = currentUser?.role === 'admin';
    const isGreenTheme = theme === 'adminn';
    
    // Check user permissions for creating entities
    const canCreateDoctor = ['admin', 'group_id'].includes(currentUser?.role);
    const canCreateLab = ['admin'].includes(currentUser?.role);
    const canCreateUser = ['admin', 'group_id'].includes(currentUser?.role);
    const canManageUsers = isAdmin;

    const themeColors = isGreenTheme ? {
        primary: 'teal-600',
        primaryHover: 'teal-700',
        primaryLight: 'teal-50',
        border: 'teal-300',
        text: 'teal-700',
        background: 'teal-600',
        backgroundHover: 'teal-700'
    } : {
        primary: 'black',
        primaryHover: 'gray-800',
        primaryLight: 'gray-50',
        border: 'gray-300',
        text: 'gray-700',
        background: 'black',
        backgroundHover: 'gray-800'
    };

    const settingsOptions = [];

    // Add User Management (Admin only)
    if (canManageUsers) {
        settingsOptions.push({
            id: 'manage-users',
            label: 'User Management',
            description: 'Manage user accounts and permissions',
            icon: Shield,
            gradient: isGreenTheme 
                ? 'from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700'
                : 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
            onClick: () => {
                onNavigate('/admin/user-management');
                onClose();
            }
        });
    }

    // Add Create Doctor
    if (canCreateDoctor) {
        settingsOptions.push({
            id: 'create-doctor',
            label: 'Create Doctor',
            description: 'Add a new doctor account',
            icon: UserPlus,
            className: isGreenTheme 
                ? 'bg-teal-700 hover:bg-teal-800'
                : 'bg-black hover:bg-gray-800',
            onClick: () => {
                onNavigate('/admin/create-doctor');
                onClose();
            }
        });
    }

    // Add Create Lab
    if (canCreateLab) {
        settingsOptions.push({
            id: 'create-lab',
            label: 'Create Lab/Center',
            description: 'Register a new laboratory or center',
            icon: Building,
            className: isGreenTheme 
                ? 'bg-slate-600 hover:bg-slate-700'
                : 'bg-gray-700 hover:bg-gray-800',
            onClick: () => {
                onNavigate('/admin/create-lab');
                onClose();
            }
        });
    }

    // Add Create User (for group_id role)
    if (canCreateUser && !canManageUsers) {
        settingsOptions.push({
            id: 'create-user',
            label: 'Create User',
            description: 'Add a new user account',
            icon: Users,
            className: isGreenTheme 
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-600 hover:bg-blue-700',
            onClick: () => {
                onNavigate('/admin/create-user');
                onClose();
            }
        });
    }

    if (settingsOptions.length === 0) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                    className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${isGreenTheme ? 'from-teal-600 to-emerald-600' : 'from-gray-800 to-gray-900'} px-6 py-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                            <Shield className="text-white" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-white">Settings</h2>
                                <p className="text-xs text-white/80 mt-0.5">
                                    Manage your workspace settings
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {settingsOptions.map((option) => {
                                const Icon = option.icon;
                                const buttonClass = option.gradient 
                                    ? `bg-gradient-to-r ${option.gradient}`
                                    : option.className;

                                return (
                                    <button
                                        key={option.id}
                                        onClick={option.onClick}
                                        className={`${buttonClass} text-white rounded-lg p-4 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl text-left`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="bg-white/20 p-2 rounded-lg">
                                                <Icon size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-base mb-1">
                                                    {option.label}
                                                </h3>
                                                <p className="text-xs text-white/80 leading-relaxed">
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* User Role Info */}
                        <div className={`mt-6 p-4 bg-${isGreenTheme ? 'teal' : 'gray'}-50 rounded-lg border border-${isGreenTheme ? 'teal' : 'gray'}-200`}>
                            <p className={`text-xs text-${isGreenTheme ? 'teal' : 'gray'}-600`}>
                                <span className="font-semibold">Current Role:</span> {currentUser?.role?.toUpperCase() || 'Unknown'}
                            </p>
                            <p className={`text-xs text-${isGreenTheme ? 'teal' : 'gray'}-500 mt-1`}>
                                Settings options are customized based on your role permissions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsModal;