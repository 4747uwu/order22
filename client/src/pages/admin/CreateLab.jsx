import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Building, Mail, Phone, MapPin, Settings, User } from 'lucide-react';

const CreateLab = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
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
            country: 'USA'
        },
        notes: '',
        settings: {
            autoAssignStudies: false,
            defaultPriority: 'NORMAL',
            maxConcurrentStudies: 100
        }
    });

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
                    [settingField]: type === 'checkbox' ? checked : 
                                   settingField === 'maxConcurrentStudies' ? parseInt(value) || 0 : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/admin-crud/labs', formData);

            if (response.data.success) {
                toast.success('Lab created successfully!');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error('Create lab error:', error);
            const message = error.response?.data?.message || 'Failed to create lab';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const priorities = [
        { value: 'LOW', label: 'Low' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' }
    ];

    const states = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    if (currentUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">Only administrators can create labs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar
                title="Create Lab"
                subtitle="Add new laboratory to organization"
                showOrganizationSelector={false}
            />

            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Header */}
                    <div className="flex items-center space-x-4 mb-6">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Dashboard</span>
                        </button>
                    </div>

                    {/* Main Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">Create New Laboratory</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Fill in the details below to create a new laboratory for your organization.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Basic Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Building className="w-5 h-5 text-gray-600" />
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Basic Information</h3>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Lab Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="Main Radiology Lab"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Lab Identifier *
                                        </label>
                                        <input
                                            type="text"
                                            name="identifier"
                                            value={formData.identifier}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black uppercase"
                                            placeholder="MAIN"
                                            maxLength={10}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Unique identifier for this lab (uppercase, max 10 characters)
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="Additional notes about this lab..."
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <User className="w-5 h-5 text-gray-600" />
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Contact Information</h3>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            value={formData.contactPerson}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="John Smith"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="email"
                                                name="contactEmail"
                                                value={formData.contactEmail}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                                placeholder="lab@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact Phone
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="tel"
                                                name="contactPhone"
                                                value={formData.contactPhone}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                                placeholder="+1 (555) 123-4567"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="mt-8">
                                <div className="flex items-center space-x-2 mb-4">
                                    <MapPin className="w-5 h-5 text-gray-600" />
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Address</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Street Address
                                        </label>
                                        <input
                                            type="text"
                                            name="address.street"
                                            value={formData.address.street}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="123 Medical Center Drive"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            name="address.city"
                                            value={formData.address.city}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="New York"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            State
                                        </label>
                                        <select
                                            name="address.state"
                                            value={formData.address.state}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                        >
                                            <option value="">Select State</option>
                                            {states.map(state => (
                                                <option key={state} value={state}>{state}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ZIP Code
                                        </label>
                                        <input
                                            type="text"
                                            name="address.zipCode"
                                            value={formData.address.zipCode}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                            placeholder="10001"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Settings Section */}
                            <div className="mt-8">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Settings className="w-5 h-5 text-gray-600" />
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Lab Settings</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="settings.autoAssignStudies"
                                            checked={formData.settings.autoAssignStudies}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-black focus:ring-black border-gray-300 rounded"
                                        />
                                        <label className="ml-2 text-sm text-gray-700">
                                            Auto-assign studies
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Priority
                                        </label>
                                        <select
                                            name="settings.defaultPriority"
                                            value={formData.settings.defaultPriority}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                        >
                                            {priorities.map(priority => (
                                                <option key={priority.value} value={priority.value}>
                                                    {priority.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Max Concurrent Studies
                                        </label>
                                        <input
                                            type="number"
                                            name="settings.maxConcurrentStudies"
                                            value={formData.settings.maxConcurrentStudies}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="1000"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/dashboard')}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating...' : 'Create Lab'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateLab;