import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Sparkles, Eye, EyeOff, FileText, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ReportImageUploader from '../../components/admin/ReportImageUploader';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BrandingSettings = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);
  const [brandingData, setBrandingData] = useState({
    headerImage: { url: '', width: 0, height: 0, size: 0 },
    footerImage: { url: '', width: 0, height: 0, size: 0 },
    showHeader: true,
    showFooter: true,
    headerAspectRatio: 5,
    footerAspectRatio: 5
  });

  // Fetch labs for organization
  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/labs');
      
      if (response.data.success) {
        const labsData = response.data.data || [];
        setLabs(labsData);
        
        // Auto-select first lab if available
        if (labsData.length > 0 && !selectedLab) {
          setSelectedLab(labsData[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching labs:', error);
      toast.error('Failed to load labs');
    } finally {
      setLoading(false);
    }
  }, [selectedLab]);

  // Fetch branding data for selected lab
  const fetchBrandingData = useCallback(async (labId) => {
    if (!labId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/branding/labs/${labId}/branding`);
      
      if (response.data.success && response.data.data) {
        setBrandingData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching branding data:', error);
      // Don't show error toast, lab might not have branding yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabs();
  }, []);

  useEffect(() => {
    if (selectedLab) {
      fetchBrandingData(selectedLab);
    }
  }, [selectedLab, fetchBrandingData]);

  // Handle image upload
  const handleImageUpload = async (imageBlob, type) => {
    if (!selectedLab) {
      toast.error('Please select a lab first');
      return;
    }

    try {
      setSaving(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', imageBlob, `${type}_${Date.now()}.png`);
      formData.append('type', type);
      formData.append('labId', selectedLab);

      // Upload to backend
      const response = await api.post(`/branding/labs/${selectedLab}/branding/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update local state
        setBrandingData(prev => ({
          ...prev,
          [`${type}Image`]: response.data.data[`${type}Image`]
        }));
        
        toast.success(`${type === 'header' ? 'Header' : 'Footer'} image uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle visibility
  const handleToggleVisibility = async (type) => {
    if (!selectedLab) return;

    try {
      const field = type === 'header' ? 'showHeader' : 'showFooter';
      const newValue = !brandingData[field];

      const response = await api.patch(`/branding/labs/${selectedLab}/branding/toggle`, {
        field,
        value: newValue
      });

      if (response.data.success) {
        setBrandingData(prev => ({
          ...prev,
          [field]: newValue
        }));
        toast.success(`${type === 'header' ? 'Header' : 'Footer'} ${newValue ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const getBackPath = () => {
    return currentUser?.role === 'admin' ? '/admin/dashboard' : '/lab/dashboard';
  };

  const currentLab = labs.find(lab => lab._id === selectedLab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(getBackPath())}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h1 className="text-xl font-bold text-gray-900">Report Branding</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Lab Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>Select Lab/Center</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Choose which lab's report branding you want to configure
            </p>
          </div>
          
          <div className="p-6">
            {loading && labs.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600">Loading labs...</span>
              </div>
            ) : labs.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No labs found. Create a lab first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {labs.map(lab => (
                  <button
                    key={lab._id}
                    onClick={() => setSelectedLab(lab._id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedLab === lab._id
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{lab.name}</h4>
                        <p className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">
                          {lab.identifier}
                        </p>
                      </div>
                      {selectedLab === lab._id && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Report Preview Layout */}
        {selectedLab && currentLab && (
          <>
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-8 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Configuring: {currentLab.name}
                </h4>
                <p className="text-sm text-blue-700">
                  This preview shows how your report will look with header and footer. 
                  Images are locked to {brandingData.headerAspectRatio}:1 aspect ratio for proper display.
                </p>
              </div>
            </div>

            {/* ✅ REPORT LAYOUT PREVIEW */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 overflow-hidden">
              
              {/* ===== HEADER SECTION ===== */}
              <div className="border-b-4 border-purple-200">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Report Header</h2>
                      <p className="text-xs text-gray-600">Appears at the top of every report</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleVisibility('header')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      brandingData.showHeader
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {brandingData.showHeader ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-6">
                  <ReportImageUploader
                    label="Header Image"
                    currentImage={brandingData.headerImage?.url}
                    onSave={handleImageUpload}
                    aspectRatio={brandingData.headerAspectRatio}
                    type="header"
                    loading={saving}
                  />
                  
                  {brandingData.headerImage?.url && (
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 flex items-center justify-between">
                      <span>
                        📐 {brandingData.headerImage.width}×{brandingData.headerImage.height}px
                      </span>
                      <span>
                        💾 {(brandingData.headerImage.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== CONTENT AREA (DUMMY) ===== */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12 border-y-2 border-dashed border-gray-300">
                <div className="max-w-4xl mx-auto">
                  {/* Dummy Report Content */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-3 bg-gray-100 rounded w-32"></div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-3 bg-gray-200 rounded w-24 ml-auto"></div>
                        <div className="h-3 bg-gray-100 rounded w-32 ml-auto"></div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-40 mb-3"></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-gray-100 rounded"></div>
                        <div className="h-20 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Report Content Area</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== FOOTER SECTION ===== */}
              <div className="border-t-4 border-purple-200">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Report Footer</h2>
                      <p className="text-xs text-gray-600">Appears at the bottom of every report</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleVisibility('footer')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      brandingData.showFooter
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {brandingData.showFooter ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>
                
                <div className="p-6">
                  <ReportImageUploader
                    label="Footer Image"
                    currentImage={brandingData.footerImage?.url}
                    onSave={handleImageUpload}
                    aspectRatio={brandingData.footerAspectRatio}
                    type="footer"
                    loading={saving}
                  />
                  
                  {brandingData.footerImage?.url && (
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 flex items-center justify-between">
                      <span>
                        📐 {brandingData.footerImage.width}×{brandingData.footerImage.height}px
                      </span>
                      <span>
                        💾 {(brandingData.footerImage.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Guidelines Section */}
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-600" />
                Guidelines & Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Aspect Ratio:</strong> Both images locked to {brandingData.headerAspectRatio}:1 (e.g., 1500×300px)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>File Size:</strong> Maximum 5MB, stored in MongoDB</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Formats:</strong> PNG, JPG, WEBP (converted to PNG)</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Resolution:</strong> Use high-res images for print quality</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Toggle:</strong> Enable/disable without deleting images</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span><strong>Updates:</strong> Changes apply to all new reports immediately</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrandingSettings;