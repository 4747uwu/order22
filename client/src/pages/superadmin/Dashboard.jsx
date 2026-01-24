import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Activity, 
  Settings, 
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  Database,
  Zap,
  TrendingUp,
  Shield,
  BarChart3
} from 'lucide-react';
import api from '../../services/api';
import Navbar from '../../components/common/Navbar';
import OrganizationForm from '../../components/superadmin/OrganizationForm';
import AdminDashboard from '../admin/Dashboard';

const SuperAdminDashboard = () => {
  const { currentUser, switchOrganization } = useAuth();
  const navigate = useNavigate();

  // View state - 'list' or 'organization-dashboard'
  const [currentView, setCurrentView] = useState('list');
  const [selectedOrganizationForDashboard, setSelectedOrganizationForDashboard] = useState(null);

  // Organization list states
  const [organizations, setOrganizations] = useState([]);
  const [orgStats, setOrgStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentView === 'list') {
      loadOrganizations();
      loadOrgStats();
    }
  }, [currentView]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/superadmin/organizations', {
        params: {
          search: searchTerm,
          status: filterStatus !== 'all' ? filterStatus : undefined
        }
      });
      if (response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgStats = async () => {
    try {
      const response = await api.get('/superadmin/organizations/stats');
      if (response.data.success) {
        setOrgStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load org stats:', error);
    }
  };

  const handleRefresh = () => {
    loadOrganizations();
    loadOrgStats();
  };

  const handleViewOrganizationDashboard = async (org) => {
    try {
      // Switch organization context
      const success = await switchOrganization(org.identifier);
      
      if (success) {
        setSelectedOrganizationForDashboard(org);
        setCurrentView('organization-dashboard');
      } else {
        alert('Failed to switch organization context');
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      alert('Failed to load organization dashboard');
    }
  };

  const handleBackToList = async () => {
    // Switch back to global context
    await switchOrganization('global');
    setSelectedOrganizationForDashboard(null);
    setCurrentView('list');
  };

  const handleCreateOrganization = () => {
    setFormData({
      name: '',
      identifier: '',
      displayName: '',
      companyType: 'hospital',
      contactInfo: {
        primaryContact: {
          name: '',
          email: '',
          phone: '',
          designation: ''
        }
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      subscription: {
        plan: 'basic',
        maxUsers: 10,
        maxStudiesPerMonth: 1000,
        maxStorageGB: 100
      },
      features: {
        aiAnalysis: false,
        advancedReporting: false,
        multiModalitySupport: true,
        cloudStorage: true,
        mobileAccess: true,
        apiAccess: false,
        whiteLabeling: false
      },
      compliance: {
        hipaaCompliant: false,
        dicomCompliant: true,
        hl7Integration: false,
        fda510k: false
      },
      adminEmail: '',
      adminPassword: '',
      adminFullName: ''
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditOrganization = (org) => {
    setSelectedOrganization(org);
    setFormData({
      name: org.name,
      displayName: org.displayName,
      companyType: org.companyType,
      contactInfo: org.contactInfo || {},
      address: org.address || {},
      subscription: org.subscription || {},
      features: org.features || {},
      compliance: org.compliance || {},
      notes: org.notes || ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDeleteOrganization = async (orgId) => {
    if (!confirm('Are you sure you want to deactivate this organization? This will deactivate all associated users, labs, and doctors.')) {
      return;
    }

    try {
      await api.delete(`/superadmin/organizations/${orgId}`);
      loadOrganizations();
      loadOrgStats();
    } catch (error) {
      console.error('Failed to delete organization:', error);
      alert('Failed to deactivate organization');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name?.trim()) errors.name = 'Organization name is required';
    if (!formData.identifier?.trim()) errors.identifier = 'Identifier is required';
    if (!formData.displayName?.trim()) errors.displayName = 'Display name is required';
    if (!formData.companyType) errors.companyType = 'Company type is required';
    
    if (!showEditModal) {
      if (!formData.adminEmail?.trim()) errors.adminEmail = 'Admin email is required';
      if (!formData.adminPassword?.trim()) errors.adminPassword = 'Admin password is required';
      if (!formData.adminFullName?.trim()) errors.adminFullName = 'Admin full name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (showEditModal) {
        await api.put(`/superadmin/organizations/${selectedOrganization._id}`, formData);
      } else {
        await api.post('/superadmin/organizations', formData);
      }
      
      setShowCreateModal(false);
      setShowEditModal(false);
      loadOrganizations();
      loadOrgStats();
    } catch (error) {
      console.error('Failed to save organization:', error);
      alert(error.response?.data?.message || 'Failed to save organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || org.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Navbar actions for list view
  const listViewNavbarActions = [
    {
      label: 'Create Organization',
      icon: Plus,
      onClick: handleCreateOrganization,
      variant: 'primary',
      tooltip: 'Create new organization'
    },
    {
      label: 'Refresh',
      icon: RefreshCw,
      onClick: handleRefresh,
      variant: 'secondary',
      tooltip: 'Refresh data'
    }
  ];

  // Navbar actions for organization dashboard view
  const dashboardViewNavbarActions = [
    {
      label: 'Back to Organizations',
      icon: ArrowLeft,
      onClick: handleBackToList,
      variant: 'secondary',
      tooltip: 'Return to organization list'
    }
  ];

  // Render organization dashboard view
  if (currentView === 'organization-dashboard' && selectedOrganizationForDashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar
          title={`${selectedOrganizationForDashboard.displayName} - Admin Dashboard`}
          subtitle={`Viewing as Super Admin • ${selectedOrganizationForDashboard.identifier}`}
          actions={dashboardViewNavbarActions}
        />
        
        {/* Organization context banner */}
        <div className="bg-teal-600 text-white px-6 py-3 shadow-md">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5" />
              <div>
                <p className="font-semibold">Organization Context: {selectedOrganizationForDashboard.name}</p>
                <p className="text-sm text-teal-100">
                  {selectedOrganizationForDashboard.stats?.activeUsers || 0} Users • 
                  {selectedOrganizationForDashboard.stats?.activeLabs || 0} Labs • 
                  {selectedOrganizationForDashboard.stats?.activeDoctors || 0} Doctors
                </p>
              </div>
            </div>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Organizations
            </button>
          </div>
        </div>

        {/* Render the actual Admin Dashboard with full functionality */}
        <AdminDashboard isSuperAdminView={true} />
      </div>
    );
  }

  // Render organization list view
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        title="Super Admin Dashboard"
        subtitle="Manage all organizations"
        actions={listViewNavbarActions}
      />

      <div className="max-w-[1920px] mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        {orgStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Organizations</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{orgStats.totalOrganizations}</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Organizations</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{orgStats.activeOrganizations}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{orgStats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Labs</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{orgStats.totalLabs}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identifier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Loading organizations...
                    </td>
                  </tr>
                ) : filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Building className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((org) => (
                    <tr key={org._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.displayName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {org.identifier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {org.companyType}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          org.status === 'active' ? 'bg-green-100 text-green-800' :
                          org.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{org.stats?.activeUsers || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="w-4 h-4" />
                            <span>{org.stats?.activeLabs || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4" />
                            <span>{org.stats?.activeDoctors || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewOrganizationDashboard(org)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Dashboard"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditOrganization(org)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrganization(org._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <OrganizationForm
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
          }}
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          isEditMode={showEditModal}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;