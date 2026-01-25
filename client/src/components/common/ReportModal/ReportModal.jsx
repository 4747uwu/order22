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
  File,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const ReportModal = ({ 
  isOpen, 
  onClose, 
  studyId, 
  studyData = null,
  onShowPrintModal
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
        const loadingToast = toast.loading(`Generating ${format.toUpperCase()}...`, {
            icon: '⚙️'
        });
        
        const response = await api.get(`/reports/reports/${report._id}/download/${format}`, {
            responseType: 'blob',
            timeout: 60000
        });
        
        toast.dismiss(loadingToast);
        
        if (response.data) {
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

  const handleEditReport = useCallback((report) => {
    console.log('✏️ Editing report:', report.filename);
    
    if (!studyId) {
      toast.error('Study ID is required to edit report');
      return;
    }
    
    onClose();
    navigate(`/online-reporting/${studyId}?reportId=${report._id}&action=edit`);
    
    toast.success(`Opening report editor for ${report.filename}...`, {
      icon: '✏️',
      duration: 3000
    });
  }, [studyId, navigate, onClose]);

  // ✅ NEW: Print report handler
  const handlePrintReport = useCallback((report) => {
    console.log('🖨️ Printing report:', report.filename);
    
    if (!report._id) {
      toast.error('Report ID is required to print');
      return;
    }
    
    // Pass report to PrintModal
    onShowPrintModal?.(report);
    
    toast.success(`Opening print preview for ${report.filename}...`, {
      icon: '🖨️',
      duration: 2000
    });
  }, [onShowPrintModal]);

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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    }

    switch (status) {
      case 'finalized':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Finalized
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200">
        
        {/* ✅ MODERN HEADER */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10"></div>
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Medical Reports</h2>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  {studyData && (
                    <>
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium">{studyData.patientName || 'Unknown Patient'}</span>
                      <span className="text-gray-400">•</span>
                    </>
                  )}
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {studyId ? studyId.substring(0, 12) + '...' : 'N/A'}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                title="Refresh reports"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ✅ MODERN CONTENT */}
        <div className="max-h-[calc(90vh-180px)] overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
          
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700">Loading reports...</p>
                <p className="text-xs text-gray-500 mt-1">Please wait</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Reports</h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* No Reports */}
          {!loading && !error && reports.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <File className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Available</h3>
                <p className="text-sm text-gray-600 mb-6">
                  No reports have been generated for this study yet. Create a new report to get started.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleOnlineReporting}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Create Report
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ MODERN REPORTS LIST */}
          {!loading && !error && reports.length > 0 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                  Available Reports
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {reports.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {reports.map((report, index) => (
                  <div
                    key={report._id}
                    className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-300"
                  >
                    {/* Gradient accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* ✅ MODERN REPORT INFO */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
                              {report.filename}
                            </h4>
                            {getStatusBadge(report.reportStatus, report.verificationStatus)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="p-1.5 bg-gray-100 rounded-lg">
                              <User className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Created By</div>
                              <div className="font-medium truncate">{report.uploadedBy}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="p-1.5 bg-gray-100 rounded-lg">
                              <Calendar className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Date</div>
                              <div className="font-medium">{formatDate(report.uploadedAt)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="p-1.5 bg-gray-100 rounded-lg">
                              <File className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Size</div>
                              <div className="font-medium">{formatFileSize(report.size)}</div>
                            </div>
                          </div>
                          
                          {report.verifiedBy && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Verified By</div>
                                <div className="font-medium truncate">{report.verifiedBy}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ✅ MODERN ACTION BUTTONS */}
                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditReport(report)}
                          className="p-2.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Edit Report"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* View Button */}
                        <button
                          onClick={() => handleViewReport(report)}
                          className="p-2.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 hover:scale-110"
                          title="View Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Print Button - NEW */}
                        <button
                          onClick={() => handlePrintReport(report)}
                          className="p-2.5 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Print Report"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        
                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadReport(report, 'pdf')}
                          className="p-2.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Download as PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {/* Download DOCX Button */}
                        <button
                          onClick={() => handleDownloadReport(report, 'docx')}
                          className="p-2.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all duration-200 hover:scale-110"
                          title="Download as DOCX"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ MODERN FOOTER */}
        <div className="relative overflow-hidden border-t border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-blue-50/30 to-indigo-50/30"></div>
          <div className="relative px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                {reports.length > 0 && (
                  <>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {reports.length} report{reports.length !== 1 ? 's' : ''} available
                    </span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOnlineReporting}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  New Report
                </button>
                
                <button
                  onClick={handleOnlineReportingWithOHIF}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Monitor className="w-4 h-4" />
                  Report + OHIF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;