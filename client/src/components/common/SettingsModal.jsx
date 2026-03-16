import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building, Shield, Users, ChevronRight, Phone, Save, Clock3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SettingsModal = ({ isOpen, onClose, onNavigate, theme = 'default' }) => {
    const { currentUser } = useAuth();
    const role = (currentUser?.role || '').toString().toLowerCase();
    const accountRoles = currentUser?.accountRoles || [role];
    const isAdmin = role === 'admin' || accountRoles.includes('admin');
    const isGroupId = role === 'group_id';

    const canCreateDoctor = ['admin', 'group_id'].includes(role);
    const canCreateLab = ['admin'].includes(role);
    const canCreateUser = ['admin', 'group_id'].includes(role);
    const canManageUsers = isAdmin || isGroupId;

    // ✅ Support Number state
    const [supportNumber, setSupportNumber] = useState('');
    const [supportNumberLoading, setSupportNumberLoading] = useState(false);
    const [supportNumberSaving, setSupportNumberSaving] = useState(false);

    useEffect(() => {
        if (isOpen && isAdmin) {
            const fetchSupportNumber = async () => {
                setSupportNumberLoading(true);
                try {
                    const res = await api.get('/admin/settings/support-number');
                    if (res.data?.success) setSupportNumber(res.data.supportNumber || '');
                } catch (e) { /* ignore */ }
                finally { setSupportNumberLoading(false); }
            };
            fetchSupportNumber();
        }
    }, [isOpen, isAdmin]);

    const handleSaveSupportNumber = async () => {
        if (!supportNumber.trim()) { toast.error('Enter a support number'); return; }
        setSupportNumberSaving(true);
        try {
            const res = await api.put('/admin/settings/support-number', { supportNumber: supportNumber.trim() });
            if (res.data?.success) toast.success('Support number updated');
            else toast.error(res.data?.message || 'Failed');
        } catch (e) { toast.error('Failed to save'); }
        finally { setSupportNumberSaving(false); }
    };

    const settingsOptions = [];

    if (canManageUsers) {
        settingsOptions.push({
            id: 'manage-users', label: 'User Management',
            description: 'Manage accounts & permissions',
            icon: Shield,
            onClick: () => { onNavigate('/admin/user-management'); onClose(); }
        });
    }
    if (canCreateDoctor) {
        settingsOptions.push({
            id: 'create-doctor', label: 'Create Doctor',
            description: 'Add a new doctor account',
            icon: UserPlus,
            onClick: () => { onNavigate('/admin/create-doctor'); onClose(); }
        });
    }
    if (canCreateLab) {
        settingsOptions.push({
            id: 'create-lab', label: 'Create Lab / Center',
            description: 'Register a new laboratory',
            icon: Building,
            onClick: () => { onNavigate('/admin/create-lab'); onClose(); }
        });

        settingsOptions.push({
            id: 'tat-report', label: 'TAT Report',
            description: 'View status-history based turnaround times',
            icon: Clock3,
            onClick: () => { onNavigate('/admin/tat-report'); onClose(); }
        });
    }
    if (canCreateUser && !canManageUsers) {
        settingsOptions.push({
            id: 'create-user', label: 'Create User',
            description: 'Add a new user account',
            icon: Users,
            onClick: () => { onNavigate('/admin/create-user'); onClose(); }
        });
    }

    if ((settingsOptions.length === 0 && !isAdmin) || !isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-neutral-200/60 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[15px] font-bold text-black">Settings</h2>
                            <p className="text-[11px] text-neutral-400">Workspace configuration</p>
                        </div>
                        <button onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="p-2">
                        {settingsOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    onClick={option.onClick}
                                    className="group w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-all text-left"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-black leading-tight">{option.label}</p>
                                        <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">{option.description}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                            );
                        })}
                    </div>

                    {/* ✅ Support Number Setting (Admin only) */}
                    {isAdmin && (
                        <div className="mx-4 mb-3 px-3 py-3 rounded-xl bg-neutral-50 border border-neutral-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Phone className="w-3.5 h-3.5 text-teal-600" />
                                <span className="text-[11px] font-bold text-neutral-700">Footer Support Number</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={supportNumberLoading ? 'Loading...' : supportNumber}
                                    onChange={(e) => setSupportNumber(e.target.value)}
                                    disabled={supportNumberLoading}
                                    placeholder="e.g. 9876543210"
                                    className="flex-1 h-8 px-2.5 text-[12px] border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSaveSupportNumber}
                                    disabled={supportNumberSaving || supportNumberLoading}
                                    className="h-8 px-3 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                    {supportNumberSaving ? (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-3 h-3" />
                                    )}
                                    Save
                                </button>
                            </div>
                            <p className="text-[9px] text-neutral-400 mt-1">Shown in worklist footer as contact number</p>
                        </div>
                    )}

                    {/* Role info */}
                    <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-100">
                        <p className="text-[10px] text-neutral-400">
                            <span className="font-semibold text-neutral-600">Role:</span> {currentUser?.role?.toUpperCase() || 'Unknown'}
                            <span className="text-neutral-300 mx-1.5">·</span>
                            Options based on permissions
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsModal;