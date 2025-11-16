import React, { useMemo } from 'react';
import { Upload, FileText, UserCheck, Lock, Unlock, CheckCircle, XCircle, Clock, FileCheck, Printer, AlertCircle } from 'lucide-react';

const formatSmallDate = (iso) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
  } catch {
    return '-';
  }
};

const getActionIcon = (actionType) => {
  const iconProps = { className: "w-3 h-3", strokeWidth: 2 };
  
  switch (actionType) {
    case 'study_uploaded':
    case 'study_received':
      return <Upload {...iconProps} />;
    case 'history_created':
    case 'history_updated':
      return <FileText {...iconProps} />;
    case 'study_assigned':
    case 'study_reassigned':
      return <UserCheck {...iconProps} />;
    case 'study_locked':
      return <Lock {...iconProps} />;
    case 'study_unlocked':
      return <Unlock {...iconProps} />;
    case 'report_finalized':
    case 'report_verified':
      return <CheckCircle {...iconProps} />;
    case 'report_rejected':
      return <XCircle {...iconProps} />;
    case 'report_started':
    case 'report_drafted':
      return <FileCheck {...iconProps} />;
    case 'report_printed':
    case 'report_reprinted':
      return <Printer {...iconProps} />;
    default:
      return <Clock {...iconProps} />;
  }
};

const getActionColor = (actionType) => {
  if (!actionType) return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
  
  if (actionType.includes('uploaded') || actionType.includes('received')) 
    return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
  if (actionType.includes('assigned') || actionType.includes('reassigned')) 
    return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
  if (actionType.includes('locked')) 
    return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
  if (actionType.includes('unlocked')) 
    return { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' };
  if (actionType.includes('finalized') || actionType.includes('verified')) 
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' };
  if (actionType.includes('history') || actionType.includes('notes')) 
    return { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
  if (actionType.includes('print')) 
    return { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' };
  
  return { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };
};

const formatActionLabel = (actionType = '') => {
  if (!actionType) return 'Action';
  
  const labels = {
    study_uploaded: 'Study Uploaded',
    study_received: 'Study Received',
    metadata_extracted: 'Metadata Extracted',
    history_created: 'History Added',
    history_updated: 'History Updated',
    clinical_notes_added: 'Notes Added',
    study_assigned: 'Assigned',
    study_reassigned: 'Reassigned',
    assignment_accepted: 'Assignment Accepted',
    study_locked: 'Locked',
    study_unlocked: 'Unlocked',
    report_started: 'Report Started',
    report_drafted: 'Draft Saved',
    report_finalized: 'Finalized',
    report_verified: 'Verified',
    report_rejected: 'Rejected',
    report_printed: 'Printed',
    report_reprinted: 'Reprinted',
    status_changed: 'Status Changed',
    priority_changed: 'Priority Changed'
  };
  
  return labels[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ActionTimeline = ({ study = {}, maxItems = 3, compact = true }) => {
  const timelineEntries = useMemo(() => {
    const entries = [];

    // ✅ FIRST CHECKPOINT: Study Upload
    entries.push({
      id: `upload-${study._id}`,
      type: 'upload',
      actionType: 'study_uploaded',
      label: 'Study Uploaded',
      time: study.createdAt || study.uploadDate,
      actor: study.uploadedByName || study.createdByName || 'System',
      subtitle: study.centerName || study.organizationName || study.sourceLab?.name || '-',
      meta: {
        center: study.centerName,
        organization: study.organizationName,
        modality: study.modality,
        series: study.seriesCount,
        instances: study.instanceCount
      }
    });

    // ✅ ACTION LOG ENTRIES - Sort by date descending
    const logs = Array.isArray(study.actionLog) ? [...study.actionLog] : [];
    logs.sort((a, b) => {
      const ta = a.performedAt ? new Date(a.performedAt).getTime() : 0;
      const tb = b.performedAt ? new Date(b.performedAt).getTime() : 0;
      return tb - ta; // Most recent first
    });

    logs.forEach((log, idx) => {
      entries.push({
        id: `action-${idx}-${study._id}`,
        type: 'action',
        actionType: log.actionType,
        label: formatActionLabel(log.actionType),
        time: log.performedAt,
        actor: log.performedByName || log.targetUserName || 'Unknown',
        subtitle: log.targetUserName || log.performedByName || '',
        note: log.notes || '',
        meta: {
          category: log.actionCategory,
          role: log.performedByRole,
          assignmentInfo: log.assignmentInfo,
          printInfo: log.printInfo,
          historyInfo: log.historyInfo
        }
      });
    });

    return entries;
  }, [study]);

  const visibleEntries = timelineEntries.slice(0, maxItems);
  const remainingCount = timelineEntries.length - maxItems;

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex flex-col gap-1.5">
          {visibleEntries.map((entry, index) => {
            const colors = getActionColor(entry.actionType);
            const icon = getActionIcon(entry.actionType);
            
            return (
              <div
                key={entry.id}
                className="flex items-start gap-1.5 group"
                title={`${entry.label}\n${formatSmallDate(entry.time)}\n${entry.actor}\n${entry.note || ''}`}
              >
                {/* Timeline line and dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} ring-2 ring-white`} />
                  {index < visibleEntries.length - 1 && (
                    <div className="w-0.5 h-4 bg-gray-200" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${colors.bg}`}>
                      <div className={colors.text}>
                        {icon}
                      </div>
                      <span className={`text-[9px] font-medium ${colors.text} truncate`}>
                        {entry.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-[8px] text-gray-500 mt-0.5 truncate">
                    {formatSmallDate(entry.time)}
                  </div>
                  
                  {entry.subtitle && (
                    <div className="text-[8px] text-gray-600 truncate">
                      {entry.subtitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {remainingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <button
                className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline"
                onClick={() => {
                  console.log('Show full timeline for study:', study._id);
                  // This will be handled by parent component
                }}
              >
                +{remainingCount} more action{remainingCount !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-compact view (not used in table, only in modal)
  return null;
};

export default ActionTimeline;