import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, UserCheck, Lock, 
  CheckCircle, Clock, FileCheck, Printer, 
  AlertCircle, RefreshCw, FileWarning, Calendar,
  User, MessageSquare, Download, Hash, History,
  RotateCcw, RotateCw
} from 'lucide-react';
import api from '../../services/api';

// ✅ FIXED ORDERED STRUCTURE — always in this order, only show if data exists
const TIMELINE_STRUCTURE = [
  {
    key: 'study_received',
    label: 'Study Received',
    matchStatuses: ['new_study_received', 'study_uploaded', 'study_received', 'metadata_extracted'],
    icon: Upload,
    colors: {
      bg: 'bg-blue-50', text: 'text-blue-700',
      dot: 'bg-blue-500', border: 'border-blue-300', icon: 'text-blue-600'
    }
  },
  {
    key: 'history_created',
    label: 'History Created',
    matchStatuses: ['history_created', 'history_pending', 'history_verified', 'clinical_notes_added'],
    icon: History,
    colors: {
      bg: 'bg-teal-50', text: 'text-teal-700',
      dot: 'bg-teal-500', border: 'border-teal-300', icon: 'text-teal-600'
    }
  },
  {
    key: 'study_assigned',
    label: 'Study Assigned',
    matchStatuses: ['assigned_to_doctor', 'study_assigned', 'study_reassigned', 'assignment_accepted', 'pending_assignment'],
    icon: UserCheck,
    colors: {
      bg: 'bg-emerald-50', text: 'text-emerald-700',
      dot: 'bg-emerald-500', border: 'border-emerald-300', icon: 'text-emerald-600'
    }
  },
  {
    key: 'report_drafted',
    label: 'Report Drafted',
    matchStatuses: ['report_drafted', 'draft_saved', 'report_in_progress', 'doctor_opened_report', 'report_started'],
    icon: FileText,
    colors: {
      bg: 'bg-amber-50', text: 'text-amber-700',
      dot: 'bg-amber-500', border: 'border-amber-300', icon: 'text-amber-600'
    }
  },
  {
    key: 'report_finalized',
    label: 'Report Finalized',
    matchStatuses: ['report_finalized', 'final_approved', 'report_completed', 'report_uploaded'],
    icon: FileCheck,
    colors: {
      bg: 'bg-violet-50', text: 'text-violet-700',
      dot: 'bg-violet-500', border: 'border-violet-300', icon: 'text-violet-600'
    }
  },
  {
    key: 'verification_pending',
    label: 'Verification Pending',
    matchStatuses: ['verification_pending', 'verification_in_progress', 'sent_for_verification'],
    icon: Clock,
    colors: {
      bg: 'bg-orange-50', text: 'text-orange-700',
      dot: 'bg-orange-500', border: 'border-orange-300', icon: 'text-orange-600'
    }
  },
  {
    key: 'report_verified',
    label: 'Report Verified',
    matchStatuses: ['report_verified', 'verification_completed'],
    icon: CheckCircle,
    colors: {
      bg: 'bg-indigo-50', text: 'text-indigo-700',
      dot: 'bg-indigo-500', border: 'border-indigo-300', icon: 'text-indigo-600'
    }
  },
  {
    key: 'report_downloaded',
    label: 'Report Downloaded',
    matchStatuses: ['report_downloaded', 'final_report_downloaded', 'report_downloaded_radiologist'],
    icon: Download,
    colors: {
      bg: 'bg-cyan-50', text: 'text-cyan-700',
      dot: 'bg-cyan-500', border: 'border-cyan-300', icon: 'text-cyan-600'
    }
  },
  {
    key: 'report_reverted',
    label: 'Report Reverted',
    matchStatuses: ['report_reverted', 'revert_to_radiologist', 'report_rejected'],
    icon: RotateCcw,
    colors: {
      bg: 'bg-rose-50', text: 'text-rose-700',
      dot: 'bg-rose-500', border: 'border-rose-300', icon: 'text-rose-600'
    }
  },
  {
    key: 'report_reprint',
    label: 'Report Reprint',
    matchStatuses: ['report_printed', 'report_reprinted', 'reprint_requested', 'report_reprint_needed'],
    icon: Printer,
    colors: {
      bg: 'bg-purple-50', text: 'text-purple-700',
      dot: 'bg-purple-500', border: 'border-purple-300', icon: 'text-purple-600'
    }
  },
];

const formatDate = (iso) => {
  if (!iso) return { date: '-', time: '-' };
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  } catch {
    return { date: '-', time: '-' };
  }
};

// ✅ CORE: Match API data to structure, pick LATEST entry per slot
const buildOrderedTimeline = (apiTimeline = []) => {
  const result = [];

  for (const slot of TIMELINE_STRUCTURE) {
    const matches = apiTimeline.filter(entry =>
      slot.matchStatuses.includes(entry.status)
    );

    if (matches.length === 0) continue;

    const latest = matches.sort(
      (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
    )[0];

    const cleanNote = latest.note
      ? latest.note
          .replace(/UID:\s*[\d.]+/gi, '')
          .replace(/\buid\b.*$/gi, '')
          .replace(/\d+ series,\s*\d+ instances?\./gi, '')
          .replace(/Study created:\s*/gi, '')
          .replace(/,\s*$/, '')
          .trim()
      : null;

    result.push({
      ...slot,
      entry: { ...latest, note: cleanNote || null },
      count: matches.length,
    });
  }

  // ✅ Sort by structure index (Study Received first internally)
  result.sort(
    (a, b) =>
      TIMELINE_STRUCTURE.findIndex(s => s.key === a.key) -
      TIMELINE_STRUCTURE.findIndex(s => s.key === b.key)
  );

  // ✅ REVERSE so LATEST is on TOP, Study Received at BOTTOM
  return result.reverse();
};

const ActionTimeline = ({ isOpen, onClose, studyId, studyData }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !studyId) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/admin/study/${studyId}/status-history`);

        if (response.data.success) {
          // ✅ Build ordered structure from raw API data
          const ordered = buildOrderedTimeline(response.data.timeline || []);
          setTimeline(ordered);
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
              {studyData?.patientName || 'Patient'} • {studyData?.studyName || studyData?.studyDescription || 'Study'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
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
              {/* ✅ Vertical line — bottom to top */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-t from-slate-200 via-slate-300 to-slate-200" />

              <div className="space-y-4">
                {timeline.map((slot, index) => {
                  const { entry, colors, label, count } = slot;
                  const IconComponent = slot.icon;
                  const { date, time } = formatDate(entry.changedAt);

                  return (
                    <div key={slot.key} className="relative flex gap-4">
                      {/* Icon dot */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center shadow-sm`}>
                        <IconComponent className={`w-4 h-4 ${colors.icon}`} strokeWidth={2} />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 ${colors.bg} border ${colors.border} rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow`}>
                        {/* Top row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${colors.text}`}>
                              {label}
                            </span>
                            {count > 1 && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                                <Hash className="w-3 h-3" />
                                {count}x
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
                            <p className="text-xs text-slate-600 leading-relaxed">{entry.note}</p>
                          </div>
                        )}

                        {count > 1 && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50">
                            <p className="text-[10px] text-slate-500 italic">
                              Occurred {count} times — showing latest.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ✅ GROUND MARKER — Study Received anchor at bottom */}
                <div className="relative flex gap-4 items-center">
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 italic">Study origin</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/50">
          <span className="text-[10px] text-slate-500">
            {timeline.length} {timeline.length === 1 ? 'stage' : 'stages'} completed
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