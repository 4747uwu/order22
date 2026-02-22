import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
    ArrowLeft, 
    Building, 
    Mail, 
    Phone, 
    MapPin, 
    User,
    UserPlus,
    Eye,
    EyeOff,
    Save,
    Shield,
    Sparkles,
    Columns
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ColumnSelector from '../../components/common/ColumnSelector';
import { getDefaultColumnsForRole } from '../../constants/worklistColumns';

const CreateLab = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [createStaffAccount, setCreateStaffAccount] = useState(true);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India'
        },
        settings: {
            autoAssignStudies: false,
            requireReportVerification: true
        },
        staffUserDetails: {
            fullName: '',
            username: '',   // ✅ username only
            password: '',
            role: 'lab_staff',
            visibleColumns: []
        }
    });

    // ✅ Initialize default columns for lab_staff role
    useEffect(() => {
        const defaultCols = getDefaultColumnsForRole(['lab_staff']);
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                visibleColumns: defaultCols
            }
        }));
    }, []);

    // ✅ username handler - lowercase, no spaces/special chars
    const handleUsernameChange = (e) => {
        const value = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '')
            .replace(/\s+/g, '');
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                username: value
            }
        }));
    };


    // ✅ ADD THESE THREE MISSING HANDLERS
    const handleColumnToggle = (columnId) => {
        setFormData(prev => {
            const current = prev.staffUserDetails.visibleColumns;
            const updated = current.includes(columnId)
                ? current.filter(c => c !== columnId)
                : [...current, columnId];
            return {
                ...prev,
                staffUserDetails: {
                    ...prev.staffUserDetails,
                    visibleColumns: updated
                }
            };
        });
    };

    const handleSelectAllColumns = (columns) => {
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                visibleColumns: columns.map(c => c.id || c)
            }
        }));
    };

    const handleClearAllColumns = () => {
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                visibleColumns: []
            }
        }));
    };

   

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.startsWith('address.')) {
            const addressField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [addressField]: value
                }
            }));
        } else if (name.startsWith('settings.')) {
            const settingField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                settings: {
                    ...prev.settings,
                    [settingField]: type === 'checkbox' ? checked : value
                }
            }));
        } else if (name.startsWith('staffUserDetails.')) {
            const staffField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                staffUserDetails: {
                    ...prev.staffUserDetails,
                    [staffField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleCreateLab = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.contactPerson) {
            toast.error('Please fill in required fields: Lab Name and Contact Person');
            return;
        }

        if (createStaffAccount) {
            if (!formData.staffUserDetails.fullName || !formData.staffUserDetails.username || !formData.staffUserDetails.password) {
                toast.error('Please fill in all staff account fields');
                return;
            }
        }

        setLoading(true);

        try {
            const submitData = {
                name: formData.name,
                contactPerson: formData.contactPerson,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone,
                address: formData.address,
                settings: formData.settings,
                staffUserDetails: createStaffAccount ? {
                    fullName: formData.staffUserDetails.fullName,
                    username: formData.staffUserDetails.username,  // ✅ backend appends @bharatpacs.com
                    password: formData.staffUserDetails.password,
                    role: formData.staffUserDetails.role,
                    visibleColumns: formData.staffUserDetails.visibleColumns
                } : undefined
            };

            const response = await api.post('/admin/admin-crud/labs', submitData);

            if (response.data.success) {
                const { lab, staffUser } = response.data.data;
                
                if (staffUser) {
                    toast.success(
                        `Lab "${lab.name}" (ID: ${lab.identifier}) created! Login: ${staffUser.email}`,
                        { duration: 6000 }
                    );
                } else {
                    toast.success(`Lab "${lab.name}" (ID: ${lab.identifier}) created successfully!`);
                }
                
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error('Create lab error:', error);
            toast.error(error.response?.data?.message || 'Failed to create lab');
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIX: Check both role and accountRoles — allow group_id too
    const isAllowed =
        currentUser?.role === 'admin' ||
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'group_id' ||
        currentUser?.accountRoles?.includes('admin') ||
        currentUser?.accountRoles?.includes('super_admin') ||
        currentUser?.accountRoles?.includes('group_id');

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-slate-600">Only admins can create labs.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg mb-3">
                        <Building className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Create New Lab</h1>
                    <p className="text-sm text-slate-600">Add a diagnostic center to your organization</p>
                </div>

                {/* Compact Form Card */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <form onSubmit={handleCreateLab}>
                        <div className="p-6 space-y-5">
                            {/* Lab Information */}
                            <div className="border-b border-slate-200 pb-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Building className="w-4 h-4 text-teal-600" />
                                    <h2 className="text-base font-bold text-slate-800">Lab Information</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Lab Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="City Diagnostic Center"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Contact Person <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            value={formData.contactPerson}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="Manager Name"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Contact Email
                                        </label>
                                        <input
                                            type="email"
                                            name="contactEmail"
                                            value={formData.contactEmail}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="contact@lab.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            Contact Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="contactPhone"
                                            value={formData.contactPhone}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="border-b border-slate-200 pb-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <MapPin className="w-4 h-4 text-cyan-600" />
                                    <h2 className="text-base font-bold text-slate-800">Address</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
                                        <input
                                            type="text"
                                            name="address.street"
                                            value={formData.address.street}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                            placeholder="123 Medical District"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            name="address.city"
                                            value={formData.address.city}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                            placeholder="Mumbai"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                                        <input
                                            type="text"
                                            name="address.state"
                                            value={formData.address.state}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                            placeholder="Maharashtra"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">ZIP Code</label>
                                        <input
                                            type="text"
                                            name="address.zipCode"
                                            value={formData.address.zipCode}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                            placeholder="400001"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Staff Account Toggle */}
                           

                            {/* Staff Account Fields (conditional) */}
                            {createStaffAccount && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <UserPlus className="w-4 h-4 text-purple-600" />
                                        <h2 className="text-base font-bold text-slate-800">Staff Account</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="staffUserDetails.fullName"
                                                value={formData.staffUserDetails.fullName}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                                placeholder="John Doe"
                                                required={createStaffAccount}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Username <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-purple-500 overflow-hidden bg-white">
                                                <input
                                                    type="text"
                                                    value={formData.staffUserDetails.username}
                                                    onChange={handleUsernameChange}
                                                    className="flex-1 px-3 py-2 text-sm outline-none border-none focus:ring-0"
                                                    placeholder="username"
                                                    required={createStaffAccount}
                                                />
                                                <span className="flex items-center px-2 bg-purple-100 text-purple-600 text-xs border-l border-slate-300 whitespace-nowrap font-medium">
                                                    @bharatpacs.com
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Login: <strong>{formData.staffUserDetails.username || 'username'}@bharatpacs.com</strong>
                                            </p>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="staffUserDetails.password"
                                                    value={formData.staffUserDetails.password}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                                                    placeholder="Secure password"
                                                    required={createStaffAccount}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ✅ Column Selection Toggle */}
                                    <div className="pt-3 border-t border-purple-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                                            className="flex items-center justify-between w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Columns className="w-4 h-4 text-purple-600" />
                                                <span className="font-medium text-slate-700">
                                                    Configure Worklist Columns ({formData.staffUserDetails.visibleColumns.length} selected)
                                                </span>
                                            </div>
                                            <span className="text-purple-600">{showColumnSelector ? '▼' : '▶'}</span>
                                        </button>

                                        {/* ✅ Column Selector (Collapsible) */}
                                        {showColumnSelector && (
                                            <div className="mt-3 p-4 bg-white border border-purple-200 rounded-lg">
                                                <ColumnSelector
                                                    selectedColumns={formData.staffUserDetails.visibleColumns}
                                                    onColumnToggle={handleColumnToggle}
                                                    onSelectAll={handleSelectAllColumns}
                                                    onClearAll={handleClearAllColumns}
                                                    userRoles={['lab_staff']}
                                                    formData={{}}
                                                    setFormData={() => {}}
                                                    useMultiRole={false}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Settings */}
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="settings.requireReportVerification"
                                        checked={formData.settings.requireReportVerification}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                    />
                                    <label className="text-sm text-slate-700">Require report verification</label>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/dashboard')}
                                className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Cancel</span>
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Create Lab</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateLab;