import React, { useState, useEffect } from 'react';
import { X, Clock, Upload, FileText, UserCheck, Lock, Unlock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const formatDateTime = (iso) => {
  if (!iso) return { date: '-', time: '' };
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    });
    const time = d.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
    
    // Calculate time ago
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const timeAgo = diffMins < 1 ? 'Just now' : 
                   diffMins < 60 ? `${diffMins}m` :
                   diffMins < 1440 ? `${Math.floor(diffMins / 60)}h` :
                   `${Math.floor(diffMins / 1440)}d`;
    
    return { date, time, timeAgo };
  } catch {
    return { date: '-', time: '', timeAgo: '' };
  }
};

const getActionIcon = (actionType) => {
  const iconProps = { className: "w-5 h-5" };
  
  switch (actionType) {
    case 'study_uploaded':
    case 'study_received':
      return <Upload {...iconProps} className="w-5 h-5 text-blue-600" />;
    case 'history_created':
    case 'history_updated':
      return <FileText {...iconProps} className="w-5 h-5 text-yellow-600" />;
    case 'study_assigned':
    case 'study_reassigned':
      return <UserCheck {...iconProps} className="w-5 h-5 text-green-600" />;
    case 'study_locked':
      return <Lock {...iconProps} className="w-5 h-5 text-red-600" />;
    case 'study_unlocked':
      return <Unlock {...iconProps} className="w-5 h-5 text-orange-600" />;
    case 'report_finalized':
    case 'report_verified':
      return <CheckCircle {...iconProps} className="w-5 h-5 text-indigo-600" />;
    default:
      return <AlertCircle {...iconProps} className="w-5 h-5 text-gray-600" />;
  }
};

const getActionColor = (actionType) => {
  if (!actionType) return 'bg-gray-500';
  
  if (actionType.includes('uploaded') || actionType.includes('received')) 
    return 'bg-blue-500';
  if (actionType.includes('assigned') || actionType.includes('reassigned')) 
    return 'bg-green-500';
  if (actionType.includes('locked')) 
    return 'bg-red-500';
  if (actionType.includes('unlocked')) 
    return 'bg-orange-500';
  if (actionType.includes('finalized') || actionType.includes('verified')) 
    return 'bg-indigo-500';
  if (actionType.includes('history') || actionType.includes('notes')) 
    return 'bg-yellow-500';
  
  return 'bg-gray-500';
};

const formatActionLabel = (actionType = '') => {
  if (!actionType) return 'Action';
  
  const labels = {
    study_uploaded: 'Study Upload Started',
    study_received: 'Study Upload Completed',
    metadata_extracted: 'Metadata Extracted',
    history_created: 'Report History Added',
    history_updated: 'History Updated',
    clinical_notes_added: 'Notes Added',
    study_assigned: 'Report Assigned',
    study_reassigned: 'Reassigned',
    assignment_accepted: 'Assignment Accepted',
    study_locked: 'Report Locked',
    study_unlocked: 'Report Unlocked',
    report_started: 'Report Started',
    report_drafted: 'Draft Saved',
    report_finalized: 'Report Signed Off',
    report_verified: 'Verified',
    report_rejected: 'Rejected',
    report_printed: 'Printed',
    report_reprinted: 'Reprinted',
    status_changed: 'Status Changed',
    priority_changed: 'Priority Changed'
  };
  
  return labels[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const TimelineModal = ({ isOpen, onClose, studyId, studyData = null }) => {
  const [loading, setLoading] = useState(false);
  const [study, setStudy] = useState(null);

  // ✅ FIX: Always fetch when modal opens, even if studyData is provided
  useEffect(() => {
    if (isOpen && studyId) {
      console.log('🔍 Timeline modal opened for study:', studyId);
      console.log('📦 Initial studyData:', studyData);
      
      // ✅ ALWAYS FETCH - Don't rely on studyData
      fetchActionLogs();
    } else {
      setStudy(null);
    }
  }, [isOpen, studyId]);

  const fetchActionLogs = async () => {
    setLoading(true);
    console.log('🚀 Fetching action logs for study:', studyId);
    
    try {
      const response = await api.get(`/admin/study-action-logs/${studyId}`);
      console.log('✅ Action logs response:', response.data);
      
      if (response.data.success) {
        const studyWithLogs = response.data.data;
        console.log('📊 Study data received:', {
          id: studyWithLogs._id,
          bharatPacsId: studyWithLogs.bharatPacsId,
          actionLogCount: studyWithLogs.actionLog?.length || 0,
          actionLog: studyWithLogs.actionLog
        });
        
        setStudy(studyWithLogs);
      } else {
        console.error('❌ API returned success: false');
        toast.error('Failed to load timeline data');
      }
    } catch (error) {
      console.error('❌ Error fetching action logs:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // ✅ BUILD TIMELINE ENTRIES - Fix logic to show all actions
  const timelineEntries = [];
  
  if (study) {
    console.log('🔨 Building timeline entries from study:', {
      createdAt: study.createdAt,
      actionLogLength: study.actionLog?.length,
      actionLogSample: study.actionLog?.[0]
    });

    // Add study upload as first entry
    timelineEntries.push({
      id: 'upload',
      actionType: 'study_uploaded',
      label: 'Study Upload Completed',
      time: study.createdAt,
      actor: study.uploadedByName || 'System',
      subtitle: study.centerName || study.organizationName || '-',
      meta: `Modality: ${study.modality || '-'} • Series: ${study.seriesCount || 0} • Images: ${study.instanceCount || 0}`
    });

    // ✅ FIX: Add action logs - check if actionLog exists and is array
    if (study.actionLog && Array.isArray(study.actionLog) && study.actionLog.length > 0) {
      console.log(`✅ Processing ${study.actionLog.length} action log entries`);
      
      study.actionLog.forEach((log, idx) => {
        console.log(`📝 Processing action log ${idx}:`, {
          actionType: log.actionType,
          performedBy: log.performedByName,
          performedAt: log.performedAt,
          notes: log.notes
        });

        timelineEntries.push({
          id: `action-${idx}`,
          actionType: log.actionType,
          label: formatActionLabel(log.actionType),
          time: log.performedAt,
          actor: log.performedByName || log.targetUserName || 'Unknown',
          subtitle: log.targetUserName 
            ? `=> ${log.performedByRole || ''}\n${log.targetUserName}` 
            : log.performedByName || '',
          meta: log.notes || '',
          email: log.performedByName || ''
        });
      });
    } else {
      console.log('⚠️ No action logs found in study data');
    }
  }

  console.log('📋 Final timeline entries:', timelineEntries);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10000]">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* ✅ HEADER - Dark Theme */}
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-white">
                <h2 className="text-xl font-bold">{study?.patientName || studyData?.patientName || 'Patient Timeline'}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Study Timeline • {timelineEntries.length} event{timelineEntries.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-full transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ✅ TIMELINE CONTENT - Scrollable */}
        <div className="p-8 overflow-y-auto bg-gray-800" style={{ maxHeight: 'calc(90vh - 150px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
              <span className="ml-3 text-gray-300">Loading timeline...</span>
            </div>
          ) : timelineEntries.length > 0 ? (
            <div className="relative">
              {/* ✅ VERTICAL TIMELINE LINE */}
              <div className="absolute left-[20px] top-0 bottom-0 w-[2px] bg-gray-600" />

              {/* ✅ TIMELINE ENTRIES */}
              <div className="space-y-8">
                {timelineEntries.map((entry, index) => {
                  const dt = formatDateTime(entry.time);
                  const dotColor = getActionColor(entry.actionType);
                  const icon = getActionIcon(entry.actionType);

                  return (
                    <div key={entry.id} className="relative flex gap-6">
                      {/* ✅ LEFT SIDE - Dot & Icon */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full ${dotColor} flex items-center justify-center shadow-lg ring-4 ring-gray-800 z-10`}>
                          {icon}
                        </div>
                      </div>

                      {/* ✅ RIGHT SIDE - Content Card */}
                      <div className="flex-1 pb-8">
                        {/* Date/Time on top */}
                        <div className="text-xs text-gray-400 mb-1">
                          {dt.date} {dt.time} {dt.timeAgo && `(${dt.timeAgo})`}
                        </div>

                        {/* Action Label */}
                        <div className="text-white font-semibold text-base mb-1">
                          {entry.label}
                        </div>

                        {/* Actor/Email */}
                        {entry.email ? (
                          <div className="text-sm text-gray-300 whitespace-pre-line">
                            {entry.email}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            {entry.subtitle || entry.actor}
                          </div>
                        )}

                        {/* Meta info */}
                        {entry.meta && (
                          <div className="mt-2 text-xs text-gray-500">
                            {entry.meta}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3" />
              <p>No timeline data available</p>
              {study && (
                <p className="text-xs mt-2">
                  Study ID: {study._id}
                  {study.actionLog && <span> • Action Log: {Array.isArray(study.actionLog) ? study.actionLog.length : 'N/A'} entries</span>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ✅ FOOTER - Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
          <div className="flex gap-3">
            <button className="px-6 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">
              OPEN DASHBOARD
            </button>
            <button className="px-6 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors">
              OPEN STUDY
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineModal;