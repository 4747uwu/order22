import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, UserCheck, Lock, 
  CheckCircle, Clock, FileCheck, Printer, 
  AlertCircle, RefreshCw, FileWarning, Calendar,
  User, MessageSquare, Download, Hash
} from 'lucide-react';
import api from '../../services/api';

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const time = d.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    return { date, time };
  } catch {
    return { date: '-', time: '-' };
  }
};

const getStatusIcon = (status) => {
  const iconProps = { className: "w-4 h-4", strokeWidth: 2 };
  
  if (!status) return <Clock {...iconProps} />;
  
  // Status-based icons
  if (status === 'new_study_received' || status === 'study_uploaded') 
    return <Upload {...iconProps} />;
  if (status === 'assigned_to_doctor' || status === 'study_assigned' || status === 'study_reassigned' || status === 'assignments_cleared') 
    return <UserCheck {...iconProps} />;
  if (status === 'study_locked' || status === 'study_locked_for_reporting') 
    return <Lock {...iconProps} />;
  if (status === 'report_finalized' || status === 'verification_pending') 
    return <FileText {...iconProps} />;
  if (status === 'report_verified') 
    return <CheckCircle {...iconProps} />;
  if (status === 'final_report_downloaded' || status === 'report_downloaded') 
    return <Download {...iconProps} />;
  if (status === 'report_printed' || status === 'report_reprinted') 
    return <Printer {...iconProps} />;
  
  return <Clock {...iconProps} />;
};

const getStatusColor = (status) => {
  if (!status) return { 
    bg: 'bg-slate-50', 
    text: 'text-slate-700', 
    dot: 'bg-slate-400',
    border: 'border-slate-300',
    icon: 'text-slate-500'
  };
  
  // Status-based colors
  if (status === 'new_study_received' || status === 'study_uploaded') 
    return { 
      bg: 'bg-blue-50', 
      text: 'text-blue-700', 
      dot: 'bg-blue-500',
      border: 'border-blue-300',
      icon: 'text-blue-600'
    };
  if (status === 'assigned_to_doctor' || status === 'study_assigned' || status === 'study_reassigned' || status === 'assignments_cleared') 
    return { 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-700', 
      dot: 'bg-emerald-500',
      border: 'border-emerald-300',
      icon: 'text-emerald-600'
    };
  if (status === 'study_locked' || status === 'study_locked_for_reporting') 
    return { 
      bg: 'bg-amber-50', 
      text: 'text-amber-700', 
      dot: 'bg-amber-500',
      border: 'border-amber-300',
      icon: 'text-amber-600'
    };
  if (status === 'report_finalized' || status === 'verification_pending') 
    return { 
      bg: 'bg-violet-50', 
      text: 'text-violet-700', 
      dot: 'bg-violet-500',
      border: 'border-violet-300',
      icon: 'text-violet-600'
    };
  if (status === 'report_verified') 
    return { 
      bg: 'bg-indigo-50', 
      text: 'text-indigo-700', 
      dot: 'bg-indigo-500',
      border: 'border-indigo-300',
      icon: 'text-indigo-600'
    };
  if (status === 'final_report_downloaded' || status === 'report_downloaded') 
    return { 
      bg: 'bg-cyan-50', 
      text: 'text-cyan-700', 
      dot: 'bg-cyan-500',
      border: 'border-cyan-300',
      icon: 'text-cyan-600'
    };
  if (status === 'report_printed' || status === 'report_reprinted') 
    return { 
      bg: 'bg-purple-50', 
      text: 'text-purple-700', 
      dot: 'bg-purple-500',
      border: 'border-purple-300',
      icon: 'text-purple-600'
    };
  
  return { 
    bg: 'bg-slate-50', 
    text: 'text-slate-700', 
    dot: 'bg-slate-400',
    border: 'border-slate-300',
    icon: 'text-slate-500'
  };
};

const formatStatusLabel = (status = '') => {
  if (!status) return 'Status Update';
  
  const labels = {
    study_uploaded: 'Study Uploaded',
    new_study_received: 'Study Received',
    assigned_to_doctor: 'Assigned to Radiologist',
    study_assigned: 'Assigned to Radiologist',
    study_reassigned: 'Reassigned',
    assignments_cleared: 'Assignments Cleared',
    study_locked: 'Locked for Reporting',
    study_locked_for_reporting: 'Locked for Reporting',
    report_finalized: 'Report Finalized',
    verification_pending: 'Verification Pending',
    report_verified: 'Report Verified',
    final_report_downloaded: 'Report Downloaded',
    report_downloaded: 'Report Downloaded',
    report_printed: 'Report Printed',
    report_reprinted: 'Report Reprinted'
  };
  
  return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ActionTimeline = ({ isOpen, onClose, studyId, studyData }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !studyId) {
      return;
    }

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/admin/study/${studyId}/status-history`);
        
        if (response.data.success) {
          setTimeline(response.data.timeline || []);
        } else {
          setError('Failed to load timeline');
        }
      } catch (err) {
        console.error('Error fetching status history:', err);
        setError('Error loading timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [isOpen, studyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Study Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {studyData?.patientName || 'Patient'} • {studyData?.studyName || 'Study'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mb-3" />
              <span className="text-sm text-slate-500">Loading timeline...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
              <span className="text-sm text-rose-600">{error}</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileWarning className="w-8 h-8 text-slate-400 mb-3" />
              <span className="text-sm text-slate-500">No timeline data available</span>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
              
              {/* Timeline entries - GROUPED WITH COUNTS */}
              <div className="space-y-4">
                {timeline.map((entry, index) => {
                  const colors = getStatusColor(entry.status);
                  const icon = getStatusIcon(entry.status);
                  const { date, time } = formatDate(entry.changedAt);
                  
                  return (
                    <div key={entry._id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center shadow-sm`}>
                        <div className={colors.icon}>
                          {icon}
                        </div>
                      </div>

                      {/* Content card */}
                      <div className={`flex-1 ${colors.bg} border ${colors.border} rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow`}>
                        {/* Status badge with count */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${colors.text}`}>
                              {formatStatusLabel(entry.status)}
                            </span>
                            {/* ✅ Show count badge if more than 1 occurrence */}
                            {entry.count > 1 && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                                <Hash className="w-3 h-3" />
                                {entry.count}x
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>{date}</span>
                            <span className="text-slate-400">•</span>
                            <Clock className="w-3 h-3" />
                            <span>{time}</span>
                          </div>
                        </div>

                        {/* User info */}
                        {entry.changedByName && entry.changedByName !== 'System' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-600 font-medium">
                              {entry.changedByName}
                            </span>
                            {entry.changedByRole && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="text-[10px] text-slate-500 capitalize">
                                  {entry.changedByRole.replace(/_/g, ' ')}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Note */}
                        {entry.note && (
                          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
                            <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {entry.note}
                            </p>
                          </div>
                        )}

                        {/* ✅ Count text if more than 1 occurrence */}
                        {entry.count > 1 && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50">
                            <p className="text-[10px] text-slate-500 italic">
                              This action occurred {entry.count} times. Showing latest occurrence.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/50">
          <span className="text-[10px] text-slate-500">
            {timeline.length} unique {timeline.length === 1 ? 'event' : 'events'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionTimeline;