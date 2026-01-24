import React, { useState } from 'react';
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
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Shield,
    Sparkles,
    Award,
    Columns
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ColumnSelector from '../../components/common/ColumnSelector';
import { getDefaultColumnsForRole } from '../../constants/worklistColumns';

const CreateLab = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    // Form state
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [createStaffAccount, setCreateStaffAccount] = useState(true);
    
    // Form data
    const [formData, setFormData] = useState({
        // Lab details
        name: '',
        identifier: '',
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
        notes: '',
        settings: {
            autoAssignStudies: false,
            requireReportVerification: true
        },
        
        // Staff user account details
        staffUserDetails: {
            fullName: '',
            email: '',
            username: '',
            password: '',
            role: 'lab_staff',
            visibleColumns: [] // ✅ NEW: Column selection
        }
    });

    // ✅ NEW: Initialize default columns for lab_staff role
    React.useEffect(() => {
        const defaultCols = getDefaultColumnsForRole(['lab_staff']);
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                visibleColumns: defaultCols
            }
        }));
    }, []);

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

    // Auto-generate username from email
    const handleStaffEmailChange = (e) => {
        const email = e.target.value;
        const username = email.split('@')[0].toLowerCase();
        
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                email,
                username
            }
        }));
    };

    // ✅ NEW: Column selection handlers
    const handleColumnToggle = (columnId) => {
        setFormData(prev => {
            const isSelected = prev.staffUserDetails.visibleColumns.includes(columnId);
            return {
                ...prev,
                staffUserDetails: {
                    ...prev.staffUserDetails,
                    visibleColumns: isSelected
                        ? prev.staffUserDetails.visibleColumns.filter(id => id !== columnId)
                        : [...prev.staffUserDetails.visibleColumns, columnId]
                }
            };
        });
    };

    const handleSelectAllColumns = (columns) => {
        setFormData(prev => ({
            ...prev,
            staffUserDetails: {
                ...prev.staffUserDetails,
                visibleColumns: columns
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

    // Form validation
    const validateStep = (step) => {
        if (step === 1) {
            return formData.name && formData.identifier;
        }
        if (step === 2 && createStaffAccount) {
            return formData.staffUserDetails.fullName && 
                   formData.staffUserDetails.email && 
                   formData.staffUserDetails.password;
        }
        return true;
    };

    // Form submission - ONLY called explicitly on "Create Lab" button
    const handleCreateLab = async () => {
        if (!validateStep(1)) {
            toast.error('Please fill in all required lab fields');
            return;
        }

        if (createStaffAccount && !validateStep(2)) {
            toast.error('Please fill in all required staff account fields');
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                ...formData,
                staffUserDetails: createStaffAccount ? formData.staffUserDetails : undefined
            };

            const response = await api.post('/admin/admin-crud/labs', submitData);

            if (response.data.success) {
                const { lab, staffUser } = response.data.data;
                
                if (staffUser) {
                    toast.success(
                        `Lab created successfully! Staff account created for ${staffUser.email}`,
                        { duration: 5000 }
                    );
                } else {
                    toast.success('Lab created successfully!');
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

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, createStaffAccount ? 4 : 2)); // ✅ Updated to 4 steps if creating staff
        } else {
            toast.error('Please fill in all required fields');
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const staffRoles = [
        { value: 'lab_staff', label: 'Lab Staff' },
        { value: 'receptionist', label: 'Receptionist' },
        { value: 'billing', label: 'Billing Staff' }
    ];

    const indianStates = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
        'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
        'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
        'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
        'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
        'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    if (currentUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                    <p className="text-slate-600">Only admins can create lab accounts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100">
            {/* Floating background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg mb-4">
                            <Building className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Lab Account</h1>
                        <p className="text-slate-600">Add a new diagnostic center to your organization</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center space-x-4">
                            {[
                                { step: 1, label: 'Lab Info', icon: Building },
                                { step: 2, label: 'Address', icon: MapPin },
                                ...(createStaffAccount ? [
                                    { step: 3, label: 'Staff', icon: UserPlus },
                                    { step: 4, label: 'Columns', icon: Columns }
                                ] : [])
                            ].map(({ step, label, icon: Icon }, index, array) => (
                                <React.Fragment key={step}>
                                    <div className="flex flex-col items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                            currentStep >= step
                                                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg'
                                                : 'bg-white text-slate-400 border-2 border-slate-200'
                                        }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className={`text-xs mt-2 font-medium ${
                                            currentStep >= step ? 'text-teal-600' : 'text-slate-400'
                                        }`}>
                                            {label}
                                        </span>
                                    </div>
                                    {index < array.length - 1 && (
                                        <div className={`w-16 h-1 rounded transition-all ${
                                            currentStep > step ? 'bg-gradient-to-r from-teal-500 to-cyan-600' : 'bg-slate-200'
                                        }`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        <form onSubmit={(e) => e.preventDefault()}>
                            {/* Step 1: Lab Information */}
                            {currentStep === 1 && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-teal-100 rounded-lg">
                                            <Building className="w-5 h-5 text-teal-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">Lab Information</h2>
                                            <p className="text-sm text-slate-600">Basic lab details and identifier</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Lab Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="City Diagnostic Center"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Lab Identifier <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="identifier"
                                                value={formData.identifier}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 uppercase"
                                                placeholder="CDC001"
                                                required
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Unique identifier for this lab</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Contact Person
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="contactPerson"
                                                    value={formData.contactPerson}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="Lab Manager Name"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Contact Email
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="contactEmail"
                                                    value={formData.contactEmail}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="contact@lab.com"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Contact Phone
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    name="contactPhone"
                                                    value={formData.contactPhone}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="+91 98765 43210"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Notes
                                            </label>
                                            <textarea
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                rows="3"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="Additional notes about this lab..."
                                            />
                                        </div>

                                        <div className="md:col-span-2 space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    name="settings.autoAssignStudies"
                                                    checked={formData.settings.autoAssignStudies}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-700">Auto-assign Studies</div>
                                                    <div className="text-xs text-slate-500">Automatically assign studies from this lab</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    name="settings.requireReportVerification"
                                                    checked={formData.settings.requireReportVerification}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-700">Require Report Verification</div>
                                                    <div className="text-xs text-slate-500">Reports from this lab require verification before finalization</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Address Information */}
                            {currentStep === 2 && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-cyan-100 rounded-lg">
                                            <MapPin className="w-5 h-5 text-cyan-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">Address Information</h2>
                                            <p className="text-sm text-slate-600">Lab location details</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Street Address
                                            </label>
                                            <input
                                                type="text"
                                                name="address.street"
                                                value={formData.address.street}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="123 Medical District"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                name="address.city"
                                                value={formData.address.city}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="Mumbai"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                State
                                            </label>
                                            <select
                                                name="address.state"
                                                value={formData.address.state}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                            >
                                                <option value="">Select State</option>
                                                {indianStates.map(state => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                ZIP Code
                                            </label>
                                            <input
                                                type="text"
                                                name="address.zipCode"
                                                value={formData.address.zipCode}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="400001"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                name="address.country"
                                                value={formData.address.country}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="India"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="flex items-center space-x-2 cursor-pointer p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={createStaffAccount}
                                                    onChange={(e) => setCreateStaffAccount(e.target.checked)}
                                                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-700">
                                                        Create Staff User Account
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Set up a user account for lab staff to manage studies
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Staff Account (only if createStaffAccount is true) */}
                            {currentStep === 3 && createStaffAccount && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <UserPlus className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">Staff Account Details</h2>
                                            <p className="text-sm text-slate-600">Create a user account for lab staff</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="staffUserDetails.fullName"
                                                    value={formData.staffUserDetails.fullName}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="John Doe"
                                                    required={createStaffAccount}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="staffUserDetails.email"
                                                    value={formData.staffUserDetails.email}
                                                    onChange={handleStaffEmailChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="john.doe@lab.com"
                                                    required={createStaffAccount}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Username
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="staffUserDetails.username"
                                                    value={formData.staffUserDetails.username}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-slate-50"
                                                    placeholder="Auto-generated from email"
                                                    readOnly
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Role
                                            </label>
                                            <select
                                                name="staffUserDetails.role"
                                                value={formData.staffUserDetails.role}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                {staffRoles.map(role => (
                                                    <option key={role.value} value={role.value}>
                                                        {role.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="staffUserDetails.password"
                                                    value={formData.staffUserDetails.password}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="Enter secure password"
                                                    required={createStaffAccount}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ✅ NEW: Step 4: Column Selection (only if createStaffAccount is true) */}
                            {currentStep === 4 && createStaffAccount && (
                                <div className="p-8 space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-teal-100 rounded-lg">
                                            <Columns className="w-5 h-5 text-teal-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800">Worklist Columns</h2>
                                            <p className="text-sm text-slate-600">Choose which columns this staff can see in their worklist</p>
                                        </div>
                                    </div>

                                    <ColumnSelector
                                        selectedColumns={formData.staffUserDetails.visibleColumns}
                                        onColumnToggle={handleColumnToggle}
                                        onSelectAll={handleSelectAllColumns}
                                        onClearAll={handleClearAllColumns}
                                        userRoles={[formData.staffUserDetails.role]}
                                        formData={{ role: formData.staffUserDetails.role, visibleColumns: formData.staffUserDetails.visibleColumns }}
                                        setFormData={(updateFn) => {
                                            const updated = updateFn({ role: formData.staffUserDetails.role, visibleColumns: formData.staffUserDetails.visibleColumns });
                                            setFormData(prev => ({
                                                ...prev,
                                                staffUserDetails: {
                                                    ...prev.staffUserDetails,
                                                    visibleColumns: updated.visibleColumns
                                                }
                                            }));
                                        }}
                                        useMultiRole={false}
                                    />
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/dashboard')}
                                    className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Cancel</span>
                                </button>

                                <div className="flex items-center space-x-3">
                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            onClick={prevStep}
                                            className="flex items-center space-x-2 px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Previous</span>
                                        </button>
                                    )}

                                    {currentStep < (createStaffAccount ? 4 : 2) ? (
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
                                        >
                                            <span>Next</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleCreateLab}
                                            disabled={loading}
                                            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLab;