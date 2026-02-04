import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Eye, EyeOff, Upload, Trash2, AlertCircle, Sparkles, Image as ImageIcon, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';

const LabBrandingSettings = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ header: false, footer: false });
  const [brandingData, setBrandingData] = useState({
    headerImage: { url: '', width: 0, height: 0, size: 0 },
    footerImage: { url: '', width: 0, height: 0, size: 0 },
    showHeader: true,
    showFooter: true,
    headerAspectRatio: 5,
    footerAspectRatio: 5
  });

  // Get lab ID from user context
  const labId = currentUser?.labIdentifier || currentUser?.lab?._id;

  // Fetch branding data for current lab
  const fetchBrandingData = useCallback(async () => {
    if (!labId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/branding/labs/${labId}/branding`);
      
      if (response.data.success && response.data.data) {
        setBrandingData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching branding data:', error);
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    fetchBrandingData();
  }, [fetchBrandingData]);

  // Handle image upload
  const handleImageUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file || !labId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [type]: true }));

      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const response = await api.post(`/branding/labs/${labId}/branding/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setBrandingData(prev => ({
          ...prev,
          [`${type}Image`]: response.data.data[`${type}Image`]
        }));
        toast.success(`${type === 'header' ? 'Header' : 'Footer'} image uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
      event.target.value = '';
    }
  };

  // Handle toggle visibility
  const handleToggleVisibility = async (type) => {
    if (!labId) return;

    try {
      const field = type === 'header' ? 'showHeader' : 'showFooter';
      const newValue = !brandingData[field];

      const response = await api.patch(`/branding/labs/${labId}/branding/toggle`, {
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

  // Handle delete image
  const handleDeleteImage = async (type) => {
    if (!labId) return;
    
    if (!confirm(`Are you sure you want to delete the ${type} image?`)) {
      return;
    }

    try {
      const response = await api.delete(`/branding/labs/${labId}/branding/delete`, {
        data: { type }
      });

      if (response.data.success) {
        setBrandingData(prev => ({
          ...prev,
          [`${type}Image`]: { url: '', width: 0, height: 0, size: 0 }
        }));
        toast.success(`${type === 'header' ? 'Header' : 'Footer'} image deleted`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  if (!labId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center border border-red-100">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Lab Access Required</h2>
          <p className="text-gray-600 mb-6">You must be assigned to a lab to manage branding settings.</p>
          <button
            onClick={() => navigate('/lab/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold transform hover:-translate-y-0.5"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Sticky Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/lab/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Report Branding
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Customize your lab reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Sidebar - Upload Controls */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-5">
            
            {/* Header Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Header Image</h3>
                    <p className="text-blue-100 text-xs">Top of report</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleVisibility('header')}
                  className={`p-2 rounded-lg transition-all ${
                    brandingData.showHeader
                      ? 'bg-white/30 hover:bg-white/40 shadow-md'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={brandingData.showHeader ? 'Hide Header' : 'Show Header'}
                >
                  {brandingData.showHeader ? 
                    <Eye className="w-4 h-4 text-white" /> : 
                    <EyeOff className="w-4 h-4 text-white/70" />
                  }
                </button>
              </div>
              
              <div className="p-4 space-y-3">
                {brandingData.headerImage?.url ? (
                  <>
                    <div className="relative group">
                      <div className="aspect-[5/1] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
                        <img 
                          src={brandingData.headerImage.url} 
                          alt="Header" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {brandingData.showHeader && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-0.5">Size</div>
                        <div className="font-bold text-blue-600 text-sm">
                          {(brandingData.headerImage.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-0.5">Dimensions</div>
                        <div className="font-bold text-blue-600 text-xs">
                          {brandingData.headerImage.width}×{brandingData.headerImage.height}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteImage('header')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-xl hover:from-red-100 hover:to-red-200 transition-all font-semibold border border-red-200 hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="aspect-[5/1] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-all">
                    <ImageIcon className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-medium">No image</span>
                  </div>
                )}
                
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  {uploading.header ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Header
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'header')}
                    className="hidden"
                    disabled={uploading.header}
                  />
                </label>
              </div>
            </div>

            {/* Footer Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Footer Image</h3>
                    <p className="text-purple-100 text-xs">Bottom of report</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleVisibility('footer')}
                  className={`p-2 rounded-lg transition-all ${
                    brandingData.showFooter
                      ? 'bg-white/30 hover:bg-white/40 shadow-md'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={brandingData.showFooter ? 'Hide Footer' : 'Show Footer'}
                >
                  {brandingData.showFooter ? 
                    <Eye className="w-4 h-4 text-white" /> : 
                    <EyeOff className="w-4 h-4 text-white/70" />
                  }
                </button>
              </div>
              
              <div className="p-4 space-y-3">
                {brandingData.footerImage?.url ? (
                  <>
                    <div className="relative group">
                      <div className="aspect-[5/1] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 shadow-inner">
                        <img 
                          src={brandingData.footerImage.url} 
                          alt="Footer" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {brandingData.showFooter && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-0.5">Size</div>
                        <div className="font-bold text-purple-600 text-sm">
                          {(brandingData.footerImage.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-0.5">Dimensions</div>
                        <div className="font-bold text-purple-600 text-xs">
                          {brandingData.footerImage.width}×{brandingData.footerImage.height}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteImage('footer')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-xl hover:from-red-100 hover:to-red-200 transition-all font-semibold border border-red-200 hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="aspect-[5/1] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-400 transition-all">
                    <ImageIcon className="w-7 h-7 mb-1.5" />
                    <span className="text-xs font-medium">No image</span>
                  </div>
                )}
                
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all cursor-pointer font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  {uploading.footer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Footer
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'footer')}
                    className="hidden"
                    disabled={uploading.footer}
                  />
                </label>
              </div>
            </div>

            {/* Compact Guidelines */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 shadow-md">
              <div className="flex items-center gap-2 mb-2.5">
                <Info className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-amber-900 text-sm">Guidelines</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800">
                <li className="flex gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Ratio: {brandingData.headerAspectRatio}:1 (1500×300px)</span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Max: 10MB | PNG, JPG, WEBP</span>
                </li>
                <li className="flex gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Use high-res for print quality</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Side - Compact A4 Preview */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 sm:px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">Report Preview</h3>
                    <p className="text-gray-300 text-xs hidden sm:block">A4 Size (210×297mm)</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-lg backdrop-blur-sm">
                  <span className="text-emerald-300 text-xs font-semibold">Live</span>
                </div>
              </div>
              
              {/* Compact A4 Preview */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-100 to-gray-200 overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <div 
                  className="bg-white mx-auto shadow-2xl"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: 'scale(0.60)',
                    transformOrigin: 'top center',
                    marginBottom: '-40%'
                  }}
                >
                  {/* Header */}
                  {brandingData.showHeader && brandingData.headerImage?.url && (
                    <div className="w-full border-b border-gray-200">
                      <img 
                        src={brandingData.headerImage.url} 
                        alt="Header" 
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '60mm' }}
                      />
                    </div>
                  )}

                  {/* Report Content */}
                  <div className="px-10 py-6" style={{ minHeight: '177mm' }}>
                    <div className="mb-5 pb-3 border-b-2 border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="h-5 bg-gray-800 rounded w-56 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-36"></div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2.5 bg-gray-300 rounded w-28 ml-auto"></div>
                          <div className="h-2.5 bg-gray-300 rounded w-24 ml-auto"></div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="h-4 bg-gray-700 rounded w-44 mb-3"></div>
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="h-2.5 bg-gray-300 rounded w-20"></div>
                            <div className="h-2.5 bg-gray-400 rounded w-28"></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="h-4 bg-gray-700 rounded w-48 mb-3"></div>
                      <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-2.5 bg-gray-100 rounded" style={{ width: `${85 + Math.random() * 15}%` }}></div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="h-4 bg-gray-700 rounded w-40 mb-3"></div>
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-2.5 bg-gray-100 rounded" style={{ width: `${80 + Math.random() * 20}%` }}></div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-10 pt-4 border-t-2 border-gray-200">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1.5">
                          <div className="h-2.5 bg-gray-300 rounded w-40"></div>
                          <div className="h-2 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="text-right space-y-1.5">
                          <div className="h-20 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-2.5 bg-gray-300 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  {brandingData.showFooter && brandingData.footerImage?.url && (
                    <div className="w-full border-t border-gray-200">
                      <img 
                        src={brandingData.footerImage.url} 
                        alt="Footer" 
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '60mm' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabBrandingSettings;