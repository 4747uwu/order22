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
  Printer,
  MoreVertical
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

  // ... (Keep existing download logic exactly the same) ...
  const handleDownloadReport = useCallback(async (report, format = 'pdf') => {
    console.log(`📥 Downloading report as ${format.toUpperCase()}:`, report.filename);
    try {
        const loadingToast = toast.loading(`Generating ${format.toUpperCase()}...`, { icon: '⚙️' });
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
            toast.success(`${format.toUpperCase()} downloaded successfully!`, { icon: '📥', duration: 3000 });
        } else {
            throw new Error('Empty response from server');
        }
    } catch (error) {
        toast.error(`Failed to download ${format.toUpperCase()}`);
    }
  }, []);

  // ... (Keep existing view, edit, print, navigation logic same) ...
  const handleViewReport = useCallback((report) => {
    toast.success(`Opening ${report.filename}...`, { icon: '👁️' });
  }, []);

  const handleEditReport = useCallback((report) => {
    if (!studyId) return;
    onClose();
    navigate(`/online-reporting/${studyId}?reportId=${report._id}&action=edit`);
  }, [studyId, navigate, onClose]);

  const handlePrintReport = useCallback((report) => {
    if (!report._id) return;
    onShowPrintModal?.(report);
  }, [onShowPrintModal]);

  const handleOnlineReporting = useCallback(() => {
    if (!studyId) return;
    onClose();
    navigate(`/online-reporting/${studyId}`);
  }, [studyId, navigate, onClose]);

  const handleOnlineReportingWithOHIF = useCallback(() => {
    if (!studyId) return;
    onClose();
    navigate(`/online-reporting/${studyId}?openOHIF=true`);
  }, [studyId, navigate, onClose]);

  const handleRefresh = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

  // Utility functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // ✅ UPDATED BADGE STYLES: Minimalist Black/White/Green
  const getStatusBadge = (status, verificationType = null) => {
    if (verificationType === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3" />
          VERIFIED
        </span>
      );
    }
    switch (status) {
      case 'finalized':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <CheckCircle className="w-3 h-3" />
            FINALIZED
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-gray-500 border border-gray-200 border-dashed">
            <Clock className="w-3 h-3" />
            DRAFT
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans antialiased">
      {/* Container: Max width restricted for compactness */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
        
        {/* ✅ HEADER: Minimalist, White & Black */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-900" />
              Medical Reports
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{studyData?.patientName || 'Unknown Patient'}</span>
              <span className="text-gray-300">|</span>
              <span className="font-mono">{studyId ? studyId.substring(0, 12) : 'N/A'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ✅ CONTENT: Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-white p-2">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin mb-3"></div>
              <span className="text-xs text-gray-500 font-medium">Loading records...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 mb-3">{error}</p>
              <button onClick={handleRefresh} className="text-xs font-semibold text-black underline">Retry</button>
            </div>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <File className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No Reports Found</h3>
              <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">
                Start by creating a new report for this patient study.
              </p>
              <button
                onClick={handleOnlineReporting}
                className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              >
                Create First Report
              </button>
            </div>
          )}

          {/* ✅ REPORT LIST: Compact Rows */}
          {!loading && !error && reports.length > 0 && (
            <div className="space-y-1">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200"
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-gray-600 group-hover:text-black transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={report.filename}>
                          {report.filename}
                        </h4>
                        {getStatusBadge(report.reportStatus, report.verificationStatus)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(report.uploadedAt)}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>{formatFileSize(report.size)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="truncate max-w-[100px]">{report.uploadedBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Icons only for minimalism) */}
                  <div className="flex items-center gap-1 pl-2">
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditReport(report)}
                        className="p-1.5 text-gray-500 hover:text-black hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => handleViewReport(report)}
                        className="p-1.5 text-gray-500 hover:text-black hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePrintReport(report)}
                        className="p-1.5 text-gray-500 hover:text-black hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-px h-4 bg-gray-200 mx-1"></div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadReport(report, 'docx')}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Download DOCX"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report, 'pdf')}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ FOOTER: Minimalist Action Bar */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            {reports.length > 0 ? `${reports.length} Document${reports.length !== 1 ? 's' : ''}` : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOnlineReporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              New Report
            </button>
            
            <button
              onClick={handleOnlineReportingWithOHIF}
              className="flex items-center gap-2 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-sm group"
            >
              <Monitor className="w-3.5 h-3.5 group-hover:text-green-400 transition-colors" />
              Report + OHIF
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ReportModal;