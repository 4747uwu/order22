import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Save, User, Briefcase, Award, Phone, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const DoctorProfileModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    specialization: '',
    licenseNumber: '',
    department: '',
    qualifications: [],
    yearsOfExperience: '',
    contactPhoneOffice: '',
    signature: ''
  });
  const [signaturePreview, setSignaturePreview] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const fileInputRef = useRef(null);

  // Fetch doctor profile on mount
  useEffect(() => {
    if (isOpen) {
      fetchDoctorProfile();
    }
  }, [isOpen]);

  const fetchDoctorProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/profile');
      
      if (response.data.success) {
        const data = response.data.data;
        setProfileData(data);
        setFormData({
          specialization: data.specialization || '',
          licenseNumber: data.licenseNumber || '',
          department: data.department || '',
          qualifications: data.qualifications || [],
          yearsOfExperience: data.yearsOfExperience || '',
          contactPhoneOffice: data.contactPhoneOffice || '',
          signature: data.signature || ''
        });
        setSignaturePreview(data.signature || '');
      }
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddQualification = () => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()]
      }));
      setNewQualification('');
    }
  };

  const handleRemoveQualification = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setSignaturePreview(base64String);
      setFormData(prev => ({ ...prev, signature: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSignaturePreview('');
    setFormData(prev => ({ ...prev, signature: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put('/doctor/profile', formData);
      
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        if (onSuccess) onSuccess(response.data.data);
        onClose();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-blue-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Doctor Profile</h2>
            <p className="text-sm text-gray-600 mt-0.5">Update your professional information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* User Info Display */}
              {profileData && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{profileData.userAccount?.fullName}</h3>
                      <p className="text-sm text-gray-600">{profileData.userAccount?.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {profileData.organization?.displayName || profileData.organizationIdentifier}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Specialization *
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Radiology"
                    required
                  />
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    License Number
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., MD-12345"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Neuroradiology"
                  />
                </div>

                {/* Years of Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Award className="w-4 h-4 inline mr-1" />
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., 10"
                    min="0"
                  />
                </div>

                {/* Contact Phone */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Office Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contactPhoneOffice"
                    value={formData.contactPhoneOffice}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., +91 1234567890"
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Award className="w-4 h-4 inline mr-1" />
                  Qualifications
                </label>
                
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newQualification}
                    onChange={(e) => setNewQualification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQualification()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., MBBS, MD Radiology"
                  />
                  <button
                    type="button"
                    onClick={handleAddQualification}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.qualifications.map((qual, index) => (
                    <div key={index} className="flex items-center gap-1 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm">
                      <span>{qual}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQualification(index)}
                        className="hover:text-teal-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digital Signature
                </label>
                
                {signaturePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Signature</span>
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
                      <img
                        src={signaturePreview}
                        alt="Signature Preview"
                        className="max-h-32 object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center text-gray-600 hover:text-teal-600 transition-colors"
                    >
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Upload Signature</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Statistics */}
              {profileData && (
                <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600">
                      {profileData.assignedStudiesCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Assigned Studies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {profileData.completedStudiesCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Completed Studies</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving || loading}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileModal;