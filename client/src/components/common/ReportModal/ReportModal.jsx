import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Monitor,
  Edit,
  File
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const ReportModal = ({ 
  isOpen, 
  onClose, 
  studyId, 
  studyData = null 
}) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && studyId) {
      fetchReports();
    }
  }, [isOpen, studyId]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/reports/studies/${studyId}/reports`);
      
      if (response.data.success) {
        setReports(response.data.data.reports);
        console.log('📄 [ReportModal] Reports loaded:', response.data.data.reports.length);
      } else {
        throw new Error(response.data.message || 'Failed to load reports');
      }
      
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  const handleDownloadReport = useCallback(async (report, format = 'pdf') => {
    console.log(`📥 Downloading report as ${format.toUpperCase()}:`, report.filename);
    
    try {
        // Show loading toast
        const loadingToast = toast.loading(`Generating ${format.toUpperCase()}...`, {
            icon: '⚙️'
        });
        
        // Call the download endpoint
        const response = await api.get(`/reports/reports/${report._id}/download/${format}`, {
            responseType: 'blob', // Important: Handle binary data
            timeout: 60000 // 60 second timeout for PDF generation
        });
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        if (response.data) {
            // Create blob and download
            const blob = new Blob([response.data], { 
                type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${report.filename.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success(`${format.toUpperCase()} downloaded successfully!`, { 
                icon: '📥',
                duration: 3000 
            });
        } else {
            throw new Error('Empty response from server');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        
        if (error.code === 'ECONNABORTED') {
            toast.error('Download timed out. Please try again.', { icon: '⏰' });
        } else if (error.response?.status === 503) {
            toast.error('PDF generation service temporarily unavailable', { icon: '🔌' });
        } else if (error.response?.status === 404) {
            toast.error('Report not found', { icon: '❌' });
        } else {
            toast.error(`Failed to download ${format.toUpperCase()}: ${error.message}`, { icon: '❌' });
        }
    }
  }, []);

  const handleViewReport = useCallback((report) => {
    console.log('👁️ Viewing report:', report.filename);
    toast.success(`Opening ${report.filename}...`, { icon: '👁️' });
    // TODO: Implement report viewer
  }, []);

  // ✅ NEW: Edit individual report
  const handleEditReport = useCallback((report) => {
    console.log('✏️ Editing report:', report.filename);
    
    if (!studyId) {
      toast.error('Study ID is required to edit report');
      return;
    }
    
    onClose();
    
    // Navigate to OnlineReportingSystem with specific report ID
    navigate(`/online-reporting/${studyId}?reportId=${report._id}&action=edit`);
    
    toast.success(`Opening report editor for ${report.filename}...`, {
      icon: '✏️',
      duration: 3000
    });
  }, [studyId, navigate, onClose]);

  const handleOnlineReporting = useCallback(() => {
    console.log('🌐 Opening online reporting system for study:', studyId);
    
    if (!studyId) {
      toast.error('Study ID is required to open reporting system');
      return;
    }
    
    onClose();
    navigate(`/online-reporting/${studyId}`);
    toast.success('Opening online reporting system...', { icon: '🌐' });
  }, [studyId, navigate, onClose]);

  const handleOnlineReportingWithOHIF = useCallback(() => {
    console.log('🖼️ Opening online reporting system with OHIF for study:', studyId);
    
    if (!studyId) {
      toast.error('Study ID is required to open reporting system');
      return;
    }
    
    onClose();
    navigate(`/online-reporting/${studyId}?openOHIF=true`);
    toast.success('Opening online reporting system with OHIF viewer...', { icon: '🖼️' });
  }, [studyId, navigate, onClose]);

  const handleRefresh = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, verificationType = null) => {
    if (verificationType === 'verified') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-2.5 h-2.5 mr-1" />
          Verified
        </span>
      );
    }

    switch (status) {
      case 'finalized':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-2.5 h-2.5 mr-1" />
            Final
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-2.5 h-2.5 mr-1" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            <AlertCircle className="w-2.5 h-2.5 mr-1" />
            Unknown
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-green-200">
        
        {/* ✅ ULTRA COMPACT HEADER */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <FileText className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Study Reports</h2>
              <p className="text-xs text-gray-600">
                {studyId ? `ID: ${studyId.substring(0, 8)}...` : 'N/A'}
                {studyData && (
                  <span className="ml-2">• {studyData.patientName || 'Unknown'}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Refresh reports"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ✅ ULTRA COMPACT CONTENT */}
        <div className="max-h-[60vh] overflow-y-auto">
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading reports...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600 mb-3">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* No Reports */}
          {!loading && !error && reports.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <File className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No Reports Available</h3>
                <p className="text-xs text-gray-600 mb-4">
                  No reports have been generated for this study yet.
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* ✅ ULTRA COMPACT REPORTS LIST */}
          {!loading && !error && reports.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Available Reports ({reports.length})
                </h3>
              </div>

              <div className="space-y-2">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    className="border border-green-200 rounded-lg p-3 hover:bg-green-50 transition-colors bg-white"
                  >
                    <div className="flex items-center justify-between">
                      
                      {/* ✅ COMPACT REPORT INFO */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <div className="p-1 bg-green-100 rounded">
                            <FileText className="w-3 h-3 text-green-700" />
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {report.filename}
                          </h4>
                          {getStatusBadge(report.reportStatus, report.verificationStatus)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span className="truncate">{report.uploadedBy}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(report.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <File className="w-3 h-3" />
                            <span>{formatFileSize(report.size)}</span>
                          </div>
                          {report.verifiedBy && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              <span className="truncate">By {report.verifiedBy}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ✅ COMPACT ACTION BUTTONS */}
                      <div className="flex items-center space-x-1 ml-3">
                        {/* ✅ NEW: Edit Report Button */}
                        <button
                          onClick={() => handleEditReport(report)}
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                          title="Edit Report"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleViewReport(report)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Report"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadReport(report, 'pdf')}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                          title="Download as PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadReport(report, 'docx')}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Download as DOCX"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ ULTRA COMPACT FOOTER */}
        <div className="border-t border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {reports.length > 0 && `${reports.length} report${reports.length !== 1 ? 's' : ''} available`}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOnlineReporting}
                className="flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                New Report
              </button>
              
              <button
                onClick={handleOnlineReportingWithOHIF}
                className="flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Monitor className="w-3 h-3 mr-1" />
                Report + OHIF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;