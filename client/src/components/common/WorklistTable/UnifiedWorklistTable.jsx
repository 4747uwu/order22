import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Copy, UserPlus, Lock, Unlock, Edit, Clock, Download, Paperclip, MessageSquare, FileText, Monitor, Eye, ChevronLeft, ChevronRight, CheckCircle, XCircle, Share2,Printer,X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AssignmentModal from '../../assigner/AssignmentModal';
import StudyDetailedView from '../PatientDetailedView';
import ReportModal from '../ReportModal/ReportModal';
import StudyNotesComponent from '../StudyNotes/StudyNotesComponent';
import TimelineModal from '../TimelineModal';
import DownloadOptions from '../DownloadOptions/DownloadOptions';
import StudyDocumentsManager from '../../StudyDocuments/StudyDocumentsManager';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useColumnResizing } from '../../../hooks/useColumnResizing';
import ResizableTableHeader from './ResizableTableHeader';
import { UNIFIED_WORKLIST_COLUMNS } from '../../../constants/unifiedWorklistColumns';
import PrintModal from '../../PrintModal';
import sessionManager from '../../../services/sessionManager';
import { navigateWithRestore } from '../../../utils/backupRestoreHelper';
import useWebSocket from '../../../hooks/useWebSocket';


const ShareModal = ({ study, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const studyInstanceUID = study?.studyInstanceUID || study?.studyInstanceUIDs || study?._id || '';
  const viewerUrl = `https://viewer.bharatpacs.com/viewer?StudyInstanceUIDs=${encodeURIComponent(studyInstanceUID)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(viewerUrl).then(() => {
      setCopied(true);
      toast.success('Viewer link copied!');
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => toast.error('Failed to copy'));
  };

  return (
    /* Removed bg-black and bg-opacity-60 from the div below */
    <div className="fixed inset-0 flex items-center justify-center z-[99999] p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="text-xs font-bold uppercase">Share Study</h2>
              <p className="text-[9px] text-gray-400 mt-0.5">
                {study?.bharatPacsId} · {study?.patientName || study?.patientInfo?.patientName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[9px] font-bold uppercase text-gray-500 mb-1">
              👁️ View-Only OHIF Link
            </label>
            <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                readOnly
                value={viewerUrl}
                className="flex-1 text-[9px] font-mono bg-transparent text-gray-700 truncate outline-none"
              />
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {copied ? (
                  <><CheckCircle className="w-3 h-3" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy</>
                )}
              </button>
            </div>
          </div>

          <p className="text-[8px] text-gray-400 text-center">
            Anyone with this link can view the study images in the OHIF viewer.
          </p>
        </div>
      </div>
    </div>
  );
};


// ✅ UTILITY FUNCTIONS
const getStatusColor = (status) => {
    switch (status) {
        case 'new_study_received':
        case 'pending_assignment':
            return 'bg-gray-100 text-gray-700 border border-gray-300';
        case 'assigned_to_doctor':
        case 'doctor_opened_report':
        case 'report_in_progress':
            return 'bg-gray-200 text-gray-800 border border-gray-400';
        case 'report_drafted':
        case 'report_finalized':
            return 'bg-blue-100 text-blue-700 border border-blue-200';
        case 'verification_in_progress':
            return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        case 'report_verified':
            return 'bg-green-100 text-green-700 border border-green-200';
        case 'report_rejected':
            return 'bg-red-100 text-red-700 border border-red-200';
        case 'final_report_downloaded':
            return 'bg-gray-800 text-white border border-gray-900';
        default:
            return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
};

// Add this helper function near the top of the file with other utility functions

const useElapsedTime = (openedAt) => {
    const [elapsed, setElapsed] = useState('');

    useEffect(() => {
        if (!openedAt) return;

        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            if (h > 0) setElapsed(`${h}h ${m}m`);
            else if (m > 0) setElapsed(`${m}m ${s}s`);
            else setElapsed(`${s}s`);
        };

        calc();
        const interval = setInterval(calc, 1000);
        return () => clearInterval(interval);
    }, [openedAt]);

    return elapsed;
};

// Add this small component in both WorklistTable.jsx and UnifiedWorklistTable.jsx

const ViewerTimerRow = ({ viewer }) => {
    const elapsed = useElapsedTime(viewer.openedAt);
    return (
        <div key={viewer.userId} className="flex flex-col text-[10px] leading-tight mb-1">
            <span className="font-semibold">{viewer.userName}</span>
            <span className="text-gray-300">Mode: <span className="text-blue-300">{viewer.mode}</span></span>
            {viewer.openedAt && (
                <span className="text-yellow-300 font-mono">
                    ⏱ {elapsed} ago
                </span>
            )}
        </div>
    );
};

const formatWorkflowStatus = (status) => {
    switch (status) {
        case 'new_study_received': return 'New';
        case 'history_created': return 'History Added'
        case 'pending_assignment': return 'Pending';
        case 'assigned_to_doctor': return 'Assigned';
        case 'doctor_opened_report': return 'Opened';
        case 'report_in_progress': return 'In Progress';
        case 'report_drafted': return 'Drafted';
        case 'revert_to_radiologist': return 'Reverted';
        case 'report_finalized': return 'Finalized';
        case 'verification_in_progress': return 'Verifying';
        case 'report_verified': return 'Verified';
        case 'report_rejected': return 'Rejected';
        case 'final_report_downloaded': return 'Completed';
        default: return status || 'Unknown';
    }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

const formatTime = (value) => {
  if (value === null || value === undefined || value === '') return '';

  try {
    const str = String(value).trim();
    const clean = str.split('.')[0]; // remove fractional seconds

    // Accept HHMM or HHMMSS
    if (!/^\d{4,6}$/.test(clean)) return '';

    const hh = clean.slice(0, 2);
    const mm = clean.slice(2, 4);

    // Basic validation
    if (+hh > 23 || +mm > 59) return '';

    return `${hh}:${mm}`;
  } catch {
    return '';
  }
};

const copyToClipboard = (text, label = 'ID') => {
    navigator.clipboard.writeText(text).then(() => {
        toast.success(`${label} copied!`, {
            duration: 2000,
            position: 'top-center',
            style: { fontSize: '12px', padding: '8px 12px' }
        });
    }).catch(() => {
        toast.error('Failed to copy', { duration: 2000 });
    });
};


const PRIORITY_SORT_ORDER = {
  'EMERGENCY': 0,
  'PRIORITY':  1,
  'MLC':       2,
  'NORMAL':    3,
  'STAT':      4,
};

// ✅ ADD THIS BLOCK HERE ↓
const CASE_PRIORITY_OPTIONS = [
  {
    value: 'NORMAL',
    label: '🟢 Normal',
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    desc: 'Standard workflow — no special handling required.',
  },
  {
    value: 'STAT',
    label: '⏱️ STAT',
    border: 'border-sky-400',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    desc: 'Expedited turnaround — report needed soon.',
  },
  {
    value: 'PRIORITY',
    label: '⭐ Priority',
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    desc: 'Elevated priority — handle before normal cases.',
  },
  {
    value: 'MLC',
    label: '⚖️ MLC',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    desc: 'Medico-legal case — requires careful documentation.',
  },
  {
    value: 'EMERGENCY',
    label: '🚨 Emergency',
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    desc: 'Life-threatening — report immediately.',
  },
];






const getPriorityWeight = (study) => {
  const p = (study.priority || study.assignment?.[0]?.priority || '').toUpperCase();
  return PRIORITY_SORT_ORDER[p] ?? 3; // default to NORMAL weight
};

const sortStudiesByPriority = (studies) => {
  return [...studies].sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
};

// Priority tag badge renderer
const getPriorityTag = (study, userRoles = [], userRole = '') => {
  const raw = study.priority || study.assignment?.[0]?.priority || '';
  const p = raw.toUpperCase();
  const allRoles = userRoles.length > 0 ? userRoles : [userRole];
  const isAdminOrAssignor = allRoles.some(r => ['admin', 'assignor', 'super_admin'].includes(r));

  switch (p) {
    case 'EMERGENCY':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-red-600 bg-red-50 border border-red-200">
          🚨 Emergency
        </span>
      );
    case 'PRIORITY':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
          ⭐ Priority
        </span>
      );
    case 'MLC':
      // ✅ ONLY admin/assignor can see MLC tag
      if (!isAdminOrAssignor) return null;
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-300">
          ⚖️ MLC
        </span>
      );
    case 'STAT':
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200">
          ⏱️ STAT
        </span>
      );
    case 'NORMAL':
    default:
      return null;
  }
};
const PatientEditModal = ({ study, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    patientName: '', patientAge: '', patientGender: '', studyName: '', referringPhysician: '', accessionNumber: '', clinicalHistory: '', priority: 'NORMAL',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (study && isOpen) {
      const rawPriority = (study.priority || study.assignment?.[0]?.priority || '').toUpperCase().trim();
      const validValues = CASE_PRIORITY_OPTIONS.map(o => o.value);
      const resolvedPriority = validValues.includes(rawPriority) ? rawPriority : 'NORMAL';

      setFormData({
        patientName:       study.patientName || study.patientInfo?.patientName || '',
        patientAge:        study.patientAge  || study.patientInfo?.age         || '',
        patientGender:     study.patientSex  || study.patientInfo?.gender       || '',
        studyName:         study.studyDescription || study.examDescription      || '',
        referringPhysician:study.referralNumber   || study.referringPhysicianName || '',
        accessionNumber:   study.accessionNumber  || '',
        clinicalHistory:   study.clinicalHistory?.clinicalHistory || (typeof study.clinicalHistory === 'string' ? study.clinicalHistory : '') || '',
        priority:          resolvedPriority,
      });
    }
  }, [study, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ studyId: study._id, ...formData });
      toast.success('Study details updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update study details');
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = CASE_PRIORITY_OPTIONS.find(o => o.value === formData.priority) || CASE_PRIORITY_OPTIONS[0];

  if (!isOpen) return null;

  return (
    // ✅ ULTRA COMPACT: Reduced modal max-width, shaved off outer padding
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-2">
      <div className="bg-white rounded shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden border border-gray-900 flex flex-col">

        {/* ✅ ULTRA COMPACT HEADER: Smaller padding, smaller text */}
        <div className="px-3 py-2 bg-gray-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase truncate max-w-[200px] sm:max-w-md">{study?.patientName || 'Edit Study'}</h2>
            <p className="text-[9px] text-gray-300 mt-0 uppercase leading-tight">
              BP ID: {study?.bharatPacsId} | MOD: {study?.modality}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* ✅ ULTRA COMPACT FORM: Tight margins (mb-3), tiny gaps (gap-1.5) */}
        <form onSubmit={handleSubmit} className="p-3 overflow-y-auto flex-1">
          
          {/* PRIORITY */}
          <div className={`mb-3 p-2 rounded border ${selectedOption.border} ${selectedOption.bg} transition-all`}>
            <div className="flex justify-between items-end mb-1.5">
              <h3 className="text-[10px] font-bold text-gray-800 uppercase">Case Priority</h3>
              <span className={`text-[8px] ${selectedOption.text} font-medium`}>{selectedOption.desc}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
              {CASE_PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, priority: opt.value }))}
                  className={`p-1 rounded border text-center transition-all ${
                    formData.priority === opt.value ? `${opt.border} ${opt.bg} ${opt.text} shadow-sm font-bold scale-[1.02]` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="text-[10px] leading-none mb-0.5">{opt.label.split(' ')[0]}</div>
                  <div className="text-[8px] font-bold leading-tight truncate">{opt.label.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PATIENT INFO */}
          <div className="mb-3">
            <h3 className="text-[10px] font-bold text-gray-800 mb-1.5 uppercase">Patient Info</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Name *</label>
                <input type="text" value={formData.patientName} onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 uppercase" required />
              </div>
              <div>
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Age *</label>
                <input type="text" value={formData.patientAge} onChange={(e) => setFormData(prev => ({ ...prev, patientAge: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 uppercase" required />
              </div>
              <div>
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Gender</label>
                <select value={formData.patientGender} onChange={(e) => setFormData(prev => ({ ...prev, patientGender: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 uppercase">
                  <option value="">SEL</option><option value="M">M</option><option value="F">F</option><option value="O">O</option>
                </select>
              </div>
            </div>
          </div>

          {/* STUDY INFO */}
          <div className="mb-3">
            <h3 className="text-[10px] font-bold text-gray-800 mb-1.5 uppercase">Study Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Study Name *</label>
                <input type="text" value={formData.studyName} onChange={(e) => setFormData(prev => ({ ...prev, studyName: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded uppercase" required />
              </div>
              <div>
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Accession #</label>
                <input type="text" value={formData.accessionNumber} onChange={(e) => setFormData(prev => ({ ...prev, accessionNumber: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded uppercase" />
              </div>
              <div className="col-span-2">
                <label className="block text-[8px] font-medium text-gray-700 mb-0.5 uppercase">Ref. Physician *</label>
                <input type="text" value={formData.referringPhysician} onChange={(e) => setFormData(prev => ({ ...prev, referringPhysician: e.target.value }))} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded uppercase" required />
              </div>
            </div>
          </div>

          {/* CLINICAL HISTORY - Reduced to 2 rows */}
          <div className="mb-2">
            <h3 className="text-[10px] font-bold text-gray-800 mb-1 uppercase">Clinical History</h3>
            <div>
              <textarea value={formData.clinicalHistory} onChange={(e) => setFormData(prev => ({ ...prev, clinicalHistory: e.target.value }))} rows={2} className="w-full px-1.5 py-1 text-[10px] font-semibold border border-gray-300 rounded resize-none uppercase" />
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
            <div className="text-[8px] text-gray-500 uppercase"><span className="text-red-500">*</span> REQ</div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1 text-[10px] font-bold bg-gray-100 text-gray-700 rounded border border-gray-300 uppercase" disabled={loading}>CANCEL</button>
              <button type="submit" className="px-3 py-1 text-[10px] font-bold text-white rounded bg-gray-900 border border-gray-900 uppercase flex items-center gap-1" disabled={loading}>
                {loading ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ UNIFIED STUDY ROW - WITH DYNAMIC WIDTHS
const UnifiedStudyRow = ({
    study,
    index,
    selectedStudies,
    activeViewers = [],
    availableAssignees,
    onSelectStudy,
    onPatienIdClick,
    onShowDetailedView,
    onViewReport,
    onShowStudyNotes,
    onEditPatient,
    onAssignmentSubmit,
    onShowTimeline,
    onToggleLock,
    onShowDocuments,
    userRole,
    userRoles = [],
    isColumnVisible,
    columnConfig = null,
    getColumnWidth, // ✅ NEW PROP
        setPrintModal,  // ✅ ADD THIS PROP

}) => {
    const navigate = useNavigate();
    console.log(study)

        const hasActiveViewers = activeViewers.length > 0;


    const assignInputRef = useRef(null);
    const downloadButtonRef = useRef(null);
    const [assignInputValue, setAssignInputValue] = useState('');
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [assignmentModalPosition, setAssignmentModalPosition] = useState(null);
    const [inputFocused, setInputFocused] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [downloadPosition, setDownloadPosition] = useState(null);
    const [togglingLock, setTogglingLock] = useState(false);
    const [restoringStudy, setRestoringStudy] = useState(false);
        const [shareModal, setShareModal] = useState(false);
    

    const isSelected = selectedStudies?.includes(study._id);
    // const isUrgent = study.priority === 'URGENT' || study.priority === 'EMERGENCY';
    const isAssigned = study.isAssigned;
    const isLocked = study?.isLocked || false;
    const hasNotes = study.hasStudyNotes === true || (study.discussions && study.discussions.length > 0);
    const hasAttachments = study.attachments && study.attachments.length > 0;
    const canToggleLock = userRoles.includes('admin') || userRoles.includes('assignor');
    const isRejected = study.workflowStatus === 'report_rejected';
    const rejectionReason = study.reportInfo?.verificationInfo?.rejectionReason || '-';

    const studyPriority = (study.priority || study.assignment?.[0]?.priority || '').toUpperCase();
    const isEmergencyCase = studyPriority === 'EMERGENCY';
    const isPriorityCase  = studyPriority === 'PRIORITY';
    const isMLCCase       = studyPriority === 'MLC';
    const isStatCase      = studyPriority === 'STAT';
    const isUrgent = isEmergencyCase;

    // ✅ Check if study is an Emergency Case
    // const isEmergencyCase = study?.priority === 'EMERGENCY CASE';

    useEffect(() => {
        if (!inputFocused && !showAssignmentModal) {
            setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
        }
    }, [isAssigned, study.radiologist, inputFocused, showAssignmentModal]);

    const rowClasses = `${
            isEmergencyCase ? 'border-l-4 border-l-red-600' :
            isPriorityCase  ? 'border-l-4 border-l-purple-500' :
            isMLCCase       ? 'border-l-4 border-l-amber-500' :
            isSelected      ? 'bg-gray-100 border-l-2 border-l-gray-900' :
            isAssigned      ? 'bg-gray-50' :
            index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
            } ${isRejected && !isEmergencyCase ? 'border-l-4 border-l-rose-600' : ''} ${
            isEmergencyCase ? 'hover:bg-red-50' :
            isPriorityCase  ? 'hover:bg-purple-50' :
            'hover:bg-gray-100'
            } transition-all duration-200 border-b border-slate-100`;

    const handleAssignInputFocus = (e) => {
    if (isLocked) {
      toast.error(`Locked by ${study.studyLock?.lockedByName}`, { icon: '🔒' });
      e.target.blur();
      return;
    }

    setInputFocused(true);
    setAssignInputValue('');
    
    if (assignInputRef.current) {
      const rect = assignInputRef.current.getBoundingClientRect();
      const modalHeight = 380; // approximate modal height
      const modalWidth = 450;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // ✅ CHECK IF ENOUGH SPACE BELOW — if not, flip above
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top;
      if (spaceBelow >= modalHeight) {
        // enough space below — open downward
        top = rect.bottom + 8;
      } else if (spaceAbove >= modalHeight) {
        // not enough below but enough above — open upward
        top = rect.top - modalHeight - 120;
      } else {
        // neither — center vertically in viewport
        top = Math.max(8, (viewportHeight - modalHeight) / 1.5);
      }

      // ✅ HORIZONTAL: prevent going off right edge
      let left = rect.left;
      if (left + modalWidth > viewportWidth - 20) {
        left = viewportWidth - modalWidth - 20;
      }
      if (left < 20) left = 20;

      setAssignmentModalPosition({
        top,
        left,
        width: modalWidth,
        zIndex: 99999
      });
      setShowAssignmentModal(true);
    }
  };

  const handleDirectPrint = useCallback(async (study) => {
      try {
        const loadingToast = toast.loading('Loading report...', { icon: '🖨️' });
  
        // Step 1: Get reports for study (same endpoint ReportModal uses)
        const response = await api.get(`/reports/studies/${study._id}/reports`);
  
        if (!response.data.success || !response.data.data?.reports?.length) {
          toast.dismiss(loadingToast);
          toast.error('No report found for this study');
          return;
        }
  
        // Step 2: Pick latest finalized report
        const reports = response.data.data.reports;
        const latestReport =
          reports.find(r => r.reportStatus === 'finalized') || reports[0];
  
        if (!latestReport) {
          toast.dismiss(loadingToast);
          toast.error('No finalized report available');
          return;
        }
  
        toast.dismiss(loadingToast);
  
        // Step 3: Open PrintModal with reportId (same as DOCX flow)
        setPrintModal({ show: true, report: latestReport });
  
      } catch (error) {
        console.error('❌ [Print] Error:', error);
        toast.error('Failed to load report for printing');
      }
    }, []);


        const handleDirectDownloadPDF = useCallback(async (study) => {
        try {
            const loadingToast = toast.loading('Generating PDF...', { icon: '⚙️' });

            // Step 1: Get reports for this study
            const response = await api.get(`/reports/studies/${study._id}/reports`);

            if (!response.data.success || !response.data.data?.reports?.length) {
                toast.dismiss(loadingToast);
                toast.error('No report found for this study');
                return;
            }

            // Step 2: Pick latest finalized report
            const reports = response.data.data.reports;
            const latestReport = reports.find(r => r.reportStatus === 'finalized') || reports[0];

            if (!latestReport) {
                toast.dismiss(loadingToast);
                toast.error('No finalized report available');
                return;
            }

            // Step 3: Download PDF directly
            const pdfResponse = await api.get(
                `/reports/reports/${latestReport._id}/download/pdf`,
                { responseType: 'blob', timeout: 60000 }
            );

            toast.dismiss(loadingToast);

            // Step 4: Trigger browser download
            const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${study.patientName || 'report'}_${study.bharatPacsId || study._id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('PDF downloaded successfully!', { icon: '📥' });

        } catch (error) {
            console.error('❌ [Download PDF] Error:', error);
            toast.error('Failed to download PDF');
        }
    }, []);

    const handleCloseAssignmentModal = () => {
        setShowAssignmentModal(false);
        setInputFocused(false);
        setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
    };

    const handleAssignmentSubmit = async (assignmentData) => {
        await onAssignmentSubmit(assignmentData);
        handleCloseAssignmentModal();
    };


    const handleDownloadClick = (e) => {
        e.stopPropagation();
        if (downloadButtonRef.current) {
            const rect = downloadButtonRef.current.getBoundingClientRect();
            setDownloadPosition({
                top: rect.bottom + 8,
                left: Math.max(20, Math.min(rect.left, window.innerWidth - 300))
            });
            setShowDownloadOptions(true);
        }
    };

      const handleViewOnlyClick = (e) => {
  e.stopPropagation();

//   console.log(study)

  try {
    const src = study || {};
    const studyInstanceUID =
      src.studyInstanceUID ||
      src.studyInstanceUIDs ||
      src.StudyInstanceUID ||
      src.studyInstanceUid ||
      src.orthancStudyID ||
      src.studyId ||
      src._id ||
      '';

    let studyUIDs = '';
    if (Array.isArray(studyInstanceUID) && studyInstanceUID.length) {
      studyUIDs = studyInstanceUID.join(',');
    } else if (typeof studyInstanceUID === 'string' && studyInstanceUID.trim()) {
      studyUIDs = studyInstanceUID.trim();
    } else {
      studyUIDs = String(src._id || '');
    }

    const ohifUrl = `https://viewer.bharatpacs.com/viewer?StudyInstanceUIDs=${encodeURIComponent(studyUIDs)}`;
    window.open(ohifUrl, '_blank');
  } catch (error) {
    console.error('Error opening OHIF viewer:', error);
    window.open(`/ohif/viewer?StudyInstanceUIDs=${study?._id || ''}`, '_blank');
  }
};

    const handleOHIFReporting = async () => {
        setRestoringStudy(true);

        try {
            // ✅ Get current user and check roles
            const currentUser = sessionManager.getCurrentUser();
            const accountRoles = currentUser?.accountRoles || [currentUser?.role];

            // ✅ Check if user is radiologist (only radiologists can lock/bypass)
            const isRadiologist = accountRoles.includes('radiologist');

            // ✅ Check if user is verifier (read-only access)
            const isVerifier = accountRoles.includes('verifier');

            // ✅ ONLY RADIOLOGISTS attempt to lock (and can bypass existing locks)
            if (isRadiologist && !isVerifier) {
                console.log('🔒 [Lock] Radiologist - attempting to lock study (will bypass if already locked)');

                try {
                    setTogglingLock(true);
                    const lockResponse = await api.post(`/admin/studies/${study._id}/lock`);

                    if (lockResponse?.data?.success) {
                        toast.success('Study locked for reporting', {
                            icon: '🔒',
                            duration: 2000,
                            style: {
                                border: '1px solid #10b981',
                            }
                        });
                    }
                    setTogglingLock(false);
                } catch (lockError) {
                    setTogglingLock(false);
                    // ✅ Radiologist can bypass locks - just show info message
                    if (lockError.response?.status === 423) {
                        const lockedBy = lockError.response.data.lockedBy || 'another user';
                        console.log(`⚠️ [Bypass] Study locked by ${lockedBy}, but radiologist can proceed`);

                        toast.info(`Study locked by ${lockedBy} - Opening anyway (Radiologist bypass)`, {
                            duration: 3000,
                            icon: '⚠️',
                            style: {
                                border: '1px solid #f59e0b',
                            }
                        });
                    } else {
                        // Some other error - log but still proceed
                        console.warn('⚠️ [Lock] Lock attempt failed, proceeding anyway:', lockError);
                    }
                }
            } else if (isVerifier) {
                console.log('✅ [Verifier] Read-only access - no locking');
            } else {
                console.log('👁️ [Viewer] Non-radiologist - no locking');
            }

            // ✅ Build URL with appropriate query params
            const queryParams = new URLSearchParams({
                openOHIF: 'true',
                ...(isVerifier && { verifierMode: 'true', action: 'verify' })
            });

            const reportingUrl = `/online-reporting/${study._id}?${queryParams.toString()}`;

            // ✅ USE navigateWithRestore TO CHECK 10-DAY THRESHOLD AND RESTORE IF NEEDED
            await navigateWithRestore(
                // Custom navigate function that opens in new tab
                (path) => window.open(path, '_blank'),
                reportingUrl,
                study,
                {
                    daysThreshold: 10, // ✅ 10-day threshold for restore
                    onRestoreStart: (study) => {
                        console.log(`🔄 [OHIF Reporting] Restoring study: ${study.bharatPacsId}`);
                        toast.loading(`Restoring study from backup...`, { id: `restore-report-${study._id}` });
                    },
                    onRestoreComplete: (data) => {
                        console.log(`✅ [OHIF Reporting] Restore completed:`, data);
                        toast.success(`Study restored (${data.fileSizeMB}MB)`, { id: `restore-report-${study._id}` });
                    },
                    onRestoreError: (error) => {
                        console.error(`❌ [OHIF Reporting] Restore failed:`, error);
                        toast.error(`Restore failed: ${error}`, { id: `restore-report-${study._id}` });
                    }
                }
            );

        } catch (error) {
            console.error('❌ [Error] OHIF reporting error:', error);

            // ✅ Only show lock errors for non-radiologists
            const currentUser = sessionManager.getCurrentUser();
            const accountRoles = currentUser?.accountRoles || [currentUser?.role];
            const isRadiologist = accountRoles.includes('radiologist');

            if (error.response?.status === 423 && !isRadiologist) {
                // Study is locked and user is NOT a radiologist
                const lockedBy = error.response.data.lockedBy || 'another user';

                toast.error(`Study is locked by ${lockedBy}`, {
                    duration: 5000,
                    icon: '🔒',
                    style: {
                        border: '1px solid #ef4444',
                    }
                });
            } else if (error.response?.status !== 423) {
                // Other errors (not lock-related)
                toast.error(error.response?.data?.message || 'Failed to open study', {
                    duration: 4000,
                    icon: '❌'
                });
            }

            // ✅ Still try to open the reporting interface even if lock/restore fails
            const queryParams = new URLSearchParams({
                openOHIF: 'true',
                ...(accountRoles.includes('verifier') && { verifierMode: 'true', action: 'verify' })
            });
            window.open(`/online-reporting/${study._id}?${queryParams.toString()}`, '_blank');

        } finally {
            setTogglingLock(false);
            setRestoringStudy(false);
        }
    };

    const handleLockToggle = async (e) => {
        e.stopPropagation();
        if (!canToggleLock) {
            toast.error('You do not have permission to lock/unlock studies');
            return;
        }
        setTogglingLock(true);
        try {
            await onToggleLock(study._id, !isLocked);
            toast.success(isLocked ? 'Study unlocked' : 'Study locked');
        } catch (error) {
            toast.error('Failed to toggle study lock');
        } finally {
            setTogglingLock(false);
        }
    };

    return (
        <tr className={rowClasses}>
    {/* 1. SELECTION CHECKBOX */}
    {isColumnVisible('selection') && (
        <td className="px-2 py-3 text-center align-top" style={{ width: `${getColumnWidth('selection')}px` }}>
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectStudy(study._id)}
                className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500 mt-1"
            />
        </td>
    )}

    {/* 2. BHARAT PACS ID */}
    {isColumnVisible('bharatPacsId') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('bharatPacsId')}px` }}>
            <div className="flex items-start justify-center gap-1.5">
                <span className="text-xs font-mono font-semibold text-slate-700 whitespace-normal break-all leading-snug text-left" title={study.bharatPacsId}>
                    {study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id?.substring(0, 10)}
                </span>
                <button
                    onClick={() => copyToClipboard(study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id, 'BP ID')}
                    className="p-1 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
                >
                    <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-gray-900" />
                </button>
                
                {/* ACTIVE VIEWERS INDICATOR AND TOOLTIP */}
                {hasActiveViewers && (
                    <div className="relative group flex-shrink-0" title={`Viewing: ${activeViewers.map(v => v.userName).join(', ')}`}>
                        <Eye className="w-4 h-4 text-blue-600 animate-pulse mt-0.5" />
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {activeViewers.length}
                        </span>
                        
                        {/* HOVER TOOLTIP WITH DETAILS */}
                        <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg border border-gray-700">
                            <div className="font-bold mb-1">👁️ Currently Viewing:</div>
                            {activeViewers.map((viewer) => (
                                <ViewerTimerRow key={viewer.userId} viewer={viewer} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </td>
    )}

    {/* 3. ORGANIZATION */}
    {(userRoles.includes('super_admin') || userRole === 'super_admin') && isColumnVisible('organization') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('organization')}px` }}>
            <div className="text-xs text-slate-600 whitespace-normal break-words leading-tight" title={study.organizationName}>
                {study.organizationName || '-'}
            </div>
        </td>
    )}

    {/* 4. CENTER NAME */}
    {isColumnVisible('centerName') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('centerName')}px` }}>
           <div className="text-[10px] sm:text-xs font-bold text-center text-slate-900 whitespace-normal break-words leading-tight" title={study.centerName}>{study.centerName || '-'}</div>
        </td>
    )}

    {/* 5. LOCATION */}
    {isColumnVisible('location') && (
        <td className="px-2 py-3.5 border-r border-b border-slate-200 align-top"
            style={{ width: `${getColumnWidth('location')}px` }}>
            <div className="text-xs text-slate-600 text-center whitespace-normal break-words leading-tight">
                {study?.location || study?.labLocation || '-'}
            </div>
        </td>
    )}

    {/* 6. TIMELINE */}
    {isColumnVisible('timeline') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('timeline')}px` }}>
            <button
                onClick={() => onShowTimeline?.(study)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-all hover:scale-110"
                title="View Timeline"
            >
                <Clock className="w-4 h-4 text-gray-700" />
            </button>
        </td>
    )}

    {/* 7. PATIENT NAME / UHID */}
    {isColumnVisible('patientName') && (
                <td 
  className="px-1.5 py-2 sm:px-2 border-r border-b border-slate-200 align-middle"
  style={{ width: `${getColumnWidth('patientName')}px` }}
>
  <button
    className="w-full text-left hover:underline decoration-gray-900 mb-0.5"
    onClick={() => onPatienIdClick?.(study.patientId, study)}
  >
    <div
      className={`text-[10px] sm:text-xs font-bold ${
        isUrgent ? 'text-rose-600' : 'text-slate-800'
      } whitespace-normal break-all leading-tight flex items-start gap-1`}
      title={study.patientName}
    >
      {study.patientName || '-'}
      {isUrgent && (
        <span className="text-rose-500 mt-0.5 flex-shrink-0">●</span>
      )}
      {isRejected && (
        <span
          className="text-rose-600 mt-0.5 flex-shrink-0"
          title={`Rejected: ${rejectionReason}`}
        >
          🚫
        </span>
      )}
    </div>

    <div
      className={`text-[9px] sm:text-[10px] ${
        isUrgent ? 'text-rose-400' : 'text-slate-500'
      } whitespace-normal break-all leading-tight mt-0.5`}
    >
      UHID: {study.patientId || '-'}
    </div>
  </button>

  {getPriorityTag(study)}
</td>
    )}

    {/* 8. AGE/SEX */}
    {isColumnVisible('ageGender') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('ageGender')}px` }}>
            <div className="text-xs font-medium text-slate-700 whitespace-normal break-words leading-tight">
                {study.ageGender !== 'N/A' ? study.ageGender :
                    study.patientAge && study.patientSex ?
                        `${study.patientAge}/${study.patientSex.charAt(0)}` :
                        study.patientAge && study.patientGender ?
                            `${study.patientAge}/${study.patientGender.charAt(0)}` : '-'}
            </div>
        </td>
    )}

    {/* 9. MODALITY */}
    {isColumnVisible('modality') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('modality')}px` }}>
            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-normal break-words leading-tight ${isUrgent ? 'bg-rose-200 text-rose-700 border border-rose-200' : 'bg-gray-200 text-gray-900 border border-gray-300'}`}>
                {study.modality || '-'}
            </span>
        </td>
    )}

    {/* 10. VIEW ONLY */}
    {isColumnVisible('viewOnly') && (
        <td className="px-3 py-3.5 text-center border-r border-slate-200 align-top" style={{ width: `${getColumnWidth('viewOnly')}px` }}>
            <button
                onClick={handleViewOnlyClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all group hover:scale-110 mx-auto"
                title="View Images Only (No Locking)"
            >
                <Eye className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
            </button>
        </td>
    )}

    {/* 11. REPORTING */}
    {isColumnVisible('reporting') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('reporting')}px` }}>
            <button
                onClick={handleOHIFReporting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all group hover:scale-110 mx-auto"
                title="Open OHIF + Reporting"
            >
                <div className="flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
                </div>
            </button>
        </td>
    )}

    {/* 12. SERIES/IMAGES */}
    {isColumnVisible('studySeriesImages') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('studySeriesImages')}px` }}>
            <div className="text-[11px] text-slate-600 whitespace-normal break-words leading-tight mb-1">{study.studyDescription || 'N/A'}</div>
            <div className="text-xs font-medium text-slate-800 whitespace-nowrap">S: {study.seriesCount || 0} / {study.instanceCount || 0}</div>
        </td>
    )}

    {/* 13. PATIENT ID */}
    {isColumnVisible('patientId') && (
        <td className="px-1.5 py-2 sm:px-2 border-r border-b border-slate-200 align-middle" style={{ width: `${getColumnWidth('patientId')}px` }}>
            <button className="text-teal-600 hover:text-teal-700 text-center font-semibold text-[10px] sm:text-xs hover:underline whitespace-normal break-all leading-tight  w-full" onClick={() => onPatienIdClick?.(study.patientId, study)}>
                {study.patientId || study.patientInfo?.patientID || 'N/A'}
            </button>
        </td>
    )}

    {/* 14. REFERRAL DOCTOR */}
    {isColumnVisible('referralDoctor') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('referralDoctor')}px` }}>
            <div className="text-xs text-slate-700 whitespace-normal break-words leading-tight" title={study.referralNumber || study.referringPhysician}>
                {study.referralNumber || study.referringPhysician || '-'}
            </div>
        </td>
    )}

    {/* 15. CLINICAL HISTORY */}
    {isColumnVisible('clinicalHistory') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('clinicalHistory')}px` }}>
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-700 whitespace-normal break-words leading-relaxed uppercase truncate max-h-12" title={study.clinicalHistory}>{study.clinicalHistory || '-'}</div>

            <div className="flex items-center flex-wrap gap-2 mt-3">
                {(userRoles.includes('admin') || userRoles.includes('assignor') || userRole === 'admin' || userRole === 'assignor' || userRoles.includes('lab_staff')) && (
                    <button
                        onClick={() => onEditPatient?.(study)}
                        className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-900 hover:underline font-medium"
                    >
                        <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                )}

                <button
                    onClick={() => onShowDocuments?.(study)}
                    className={`p-1.5 rounded-lg transition-all group hover:scale-110 relative ${hasAttachments ? 'bg-gray-200' : 'hover:bg-slate-100'}`}
                    title={hasAttachments ? `${study.attachments.length} attachment(s)` : 'Manage attachments'}
                >
                    <Paperclip className={`w-3.5 h-3.5 ${hasAttachments ? 'text-gray-900' : 'text-slate-400'} group-hover:text-gray-900`} />
                    {hasAttachments && study.attachments.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-1 shadow-sm leading-none">
                            {study.attachments.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => onShowStudyNotes?.(study._id)}
                    className={`relative p-1.5 rounded-lg transition-all group hover:scale-110 ${hasNotes ? 'bg-gray-200' : 'hover:bg-slate-100'}`}
                    title={hasNotes ? `${study.notesCount || '1'} note(s)` : 'No notes'}
                >
                    <div className="flex items-center gap-1">
                        <MessageSquare className={`w-3.5 h-3.5 ${hasNotes ? 'text-gray-900' : 'text-slate-400'} group-hover:text-gray-900`} />
                        {study.notesCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-1 shadow-sm leading-none">
                                {study.notesCount}
                            </span>
                        )}
                    </div>
                </button>
            </div>
        </td>
    )}

    {/* 16. STUDY DATE/TIME */}
    {isColumnVisible('studyDateTime') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('studyDateTime')}px` }}>
            <div className="text-[11px] font-medium text-slate-800 whitespace-nowrap">{formatDate(study.studyDate)}</div>
            <div className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{formatTime(study.studyTime) || '-'}</div>
        </td>
    )}

    {/* 17. UPLOAD DATE/TIME */}
    {isColumnVisible('uploadDateTime') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('uploadDateTime')}px` }}>
            <div className="text-[11px] font-medium text-slate-800 whitespace-nowrap">
                {formatDate(study.uploadDate || study.createdAt)}
            </div>
            <div className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
                {study.uploadTime ? study.uploadTime.split(',')[2]?.trim() || study.uploadTime : formatTime(study.uploadDate || study.createdAt)}
            </div>
        </td>
    )}

    {/* 18. ASSIGNED RADIOLOGIST */}
    {isColumnVisible('assignedRadiologist') && userRoles.includes('assignor') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('assignedRadiologist')}px` }}>
            <div className="relative">
                <input
                    ref={assignInputRef}
                    type="text"
                    value={assignInputValue}
                    onChange={(e) => setAssignInputValue(e.target.value)}
                    onFocus={handleAssignInputFocus}
                    onBlur={() => {
                        setTimeout(() => {
                            if (!showAssignmentModal) {
                                setInputFocused(false);
                                setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
                            }
                        }, 200);
                    }}
                    placeholder={isLocked ? "🔒 Locked" : "Search radiologist..."}
                    disabled={isLocked}
                    className={`w-full px-2 py-1.5 text-xs border-2 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all ${isLocked ? 'bg-slate-200 cursor-not-allowed text-slate-500 border-gray-400' :
                            isAssigned && !inputFocused ? 'bg-gray-200 border-gray-400 text-gray-900 font-medium shadow-sm' :
                                'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                />
                {isAssigned && !inputFocused && !isLocked && (
                    <div className="w-2 h-2 bg-gray-900 rounded-full absolute right-2.5 top-2.5 shadow-sm" />
                )}
                {isLocked && (
                    <Lock className="w-3.5 h-3.5 text-rose-600 absolute right-2.5 top-2" />
                )}
            </div>
        </td>
    )}

    {/* ASSIGNED RADIOLOGIST (read-only for non-assignor roles) */}
    {isColumnVisible('assignedRadiologist') && !userRoles.includes('assignor') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('assignedRadiologist')}px` }}>
            <div className="text-xs text-slate-700 whitespace-normal break-words leading-tight">
                {typeof study.radiologist === 'string'
                    ? study.radiologist
                    : study.radiologist?.fullName || study.radiologist?.email || study.assignedTo?.name || '-'}
            </div>
        </td>
    )}

    {/* 19. LOCK/UNLOCK TOGGLE */}
    {isColumnVisible('studyLock') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('studyLock')}px` }}>
            {canToggleLock ? (
                <button
                    onClick={handleLockToggle}
                    disabled={togglingLock}
                    className={`p-2 rounded-lg transition-all group hover:scale-110 mx-auto ${togglingLock ? 'opacity-50 cursor-not-allowed' :
                            isLocked ? 'bg-rose-100 hover:bg-rose-200' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    title={isLocked ? `Locked by ${study.studyLock?.lockedByName}` : 'Click to lock'}
                >
                    {isLocked ? (
                        <Lock className="w-4 h-4 text-rose-600" />
                    ) : (
                        <Unlock className="w-4 h-4 text-slate-500" />
                    )}
                </button>
            ) : (
                <div className="p-2 flex justify-center">
                    {isLocked ? (
                        <Lock className="w-4 h-4 text-rose-600" title={`Locked by ${study.studyLock?.lockedByName}`} />
                    ) : (
                        <Unlock className="w-4 h-4 text-slate-300" />
                    )}
                </div>
            )}
        </td>
    )}

    {/* 20. STATUS */}
    {isColumnVisible('status') && (
        <td className="px-3 py-3.5 text-center border-r border-slate-200 align-top" style={{ width: `${getColumnWidth('status')}px` }}>
            <div className="flex flex-col items-center gap-1.5">
                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-medium shadow-sm whitespace-normal break-words leading-tight ${getStatusColor(study.workflowStatus)}`}>
                    {study.caseStatusCategory || formatWorkflowStatus(study.workflowStatus)}
                </span>

                <span className="text-[11px] text-slate-600 whitespace-normal break-words leading-tight">{study.workflowStatus ? formatWorkflowStatus(study.workflowStatus) : '-'}</span>
                {study.statusHistory && study.statusHistory.length > 0 && (() => {
                    const currentStatusEntry = study.statusHistory
                        .slice()
                        .reverse()
                        .find(entry => entry.status === study.workflowStatus);

                    if (currentStatusEntry && currentStatusEntry.changedAt) {
                        return (
                            <div className="text-[9px] text-slate-500 mt-0.5">
                                {formatDate(currentStatusEntry.changedAt)} <br/> {formatTime(currentStatusEntry.changedAt)}
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>
        </td>
    )}

     {isColumnVisible('printCount') && (
        <td className="px-1.5 py-2 sm:px-2 text-center border-r border-b border-slate-200 align-middle" style={{ width: `${getColumnWidth('printCount')}px` }}>
            
            {/* ✅ ONLY show when workflowStatus is report_completed or final_report_downloaded */}
            {['report_completed', 'final_report_downloaded'].includes(study.workflowStatus) ? (
                <div className="flex flex-col items-center gap-1">
                    
                    {/* Print Button */}
                    <div className="flex items-center gap-1 justify-center">
                        <button 
                            onClick={() => handleDirectPrint(study)} 
                            className="p-1 hover:bg-purple-50 rounded transition-all hover:scale-110" 
                            title="Print Report"
                        >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                        </button>

                        {/* ✅ PDF Download Button — directly downloads PDF */}
                        <button 
                            onClick={() => handleDirectDownloadPDF(study)} 
                            className="p-1 hover:bg-red-50 rounded transition-all hover:scale-110" 
                            title="Download PDF"
                        >
                            <Download className="w-3.5 h-3.5 text-red-500" />
                        </button>
                    </div>

                    {/* Last print date if exists */}
                    {(study.lastPrintedAt || study.printInfo?.lastPrintedAt) && (
                        <div className="text-[8px] text-slate-500 whitespace-nowrap">
                            {formatDate(study.lastPrintedAt || study.printInfo?.lastPrintedAt)}
                        </div>
                    )}

                    {/* Print count badge */}
                    {(study.printCount > 0 || study.printInfo?.totalPrints > 0) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-medium text-slate-600">
                            {study.printCount || study.printInfo?.totalPrints} print(s)
                        </span>
                    )}
                </div>
            ) : (
                // ✅ Not completed — show dash
                <span className="text-slate-300 text-xs">-</span>
            )}
        </td>
    )}

    {/* 22. REJECTION REASON */}
    {isColumnVisible('rejectionReason') && (
        <td className="px-3 py-3.5 border-r border-slate-200 align-top" style={{ width: `${getColumnWidth('rejectionReason')}px` }}>
            {isRejected ? (
                <div className="flex items-start gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div
                        className="text-xs text-rose-700 leading-relaxed font-medium whitespace-normal break-words"
                        title={rejectionReason}
                    >
                        {study.verificationNotes || rejectionReason}
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-400 text-center">-</div>
            )}
        </td>
    )}

    {/* 23. VERIFIED BY */}
    {isColumnVisible('assignedVerifier') && (
        <td className="px-3 py-3.5 border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('assignedVerifier')}px` }}>
            <div className="text-xs text-slate-700 whitespace-normal break-words leading-tight">
                {typeof study.verifier === 'string'
                    ? study.verifier
                    : study.verifier?.fullName || study.verifier?.email || study.reportInfo?.verificationInfo?.verifiedBy?.name || study.verifiedBy || '-'}
            </div>
        </td>
    )}

    {/* 24. VERIFIED DATE/TIME */}
    {isColumnVisible('verifiedDateTime') && (
        <td className="px-3 py-3.5 text-center border-r border-b border-slate-200 align-top" style={{ width: `${getColumnWidth('verifiedDateTime')}px` }}>
            <div className="text-[11px] font-medium text-slate-800 whitespace-nowrap">{(() => { const ts = study.reportInfo?.verificationInfo?.verifiedAt || study.verifiedAt; if (!ts) return '-'; try { return new Date(ts).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch { return '-'; } })()}</div>
            <div className="text-[10px] text-slate-500 whitespace-nowrap mt-0.5">{(() => { const ts = study.reportInfo?.verificationInfo?.verifiedAt || study.verifiedAt; if (!ts) return '-'; try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }); } catch { return '-'; } })()}</div>
        </td>
    )}

    {/* 25. ACTIONS */}
    {isColumnVisible('actions') && (
        <td className="px-3 py-3.5 text-center border-slate-300 border-b-1 align-top" style={{ width: `${getColumnWidth('actions')}px` }}>
            <div className="flex flex-wrap items-center justify-center gap-1.5">

                {/* ASSIGNOR ACTIONS */}
                {userRoles.includes('assignor') && (
                    <>
                        <button ref={downloadButtonRef} onClick={handleDownloadClick} className="p-1.5 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110" title="Download Options">
                            <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </button>
<button 
                      onClick={() => setShareModal(true)} 
                      className="p-1 hover:bg-sky-50 rounded" 
                      title="Share Study (Secure Link)"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sky-600" />
                    </button>

                        <button onClick={() => onViewReport?.(study)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110" title="View Report">
                            <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                        </button>
                    </>
                )}

                {/* RADIOLOGIST ACTIONS */}
                {userRoles.includes('radiologist') && !userRoles.includes('assignor') && (
                    <>
                        <button ref={downloadButtonRef} onClick={handleDownloadClick} className="p-1.5 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110" title="Download Options">
                            <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </button>

                        <button onClick={handleOHIFReporting} className="p-1.5 hover:bg-emerald-50 rounded-lg transition-all group hover:scale-110" title="OHIF + Reporting">
                            <Monitor className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
                        </button>

                        <button onClick={() => onViewReport?.(study)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110" title="View Report">
                            <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                        </button>
                    </>
                )}

                 {/* ✅ ADD: LAB STAFF ACTIONS */}
                {userRoles.includes('lab_staff') && 
                 !userRoles.includes('admin') && 
                 !userRoles.includes('assignor') && 
                 !userRoles.includes('radiologist') && 
                 !userRoles.includes('verifier') && (
                    <>
                        {/* Download Study */}
                        <button 
                            ref={downloadButtonRef} 
                            onClick={handleDownloadClick} 
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110" 
                            title="Download Study"
                        >
                            <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                        </button>

                        {/* View Report */}
                        <button 
                            onClick={() => onViewReport?.(study)} 
                            className="p-1.5 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110" 
                            title="View/Download Report"
                        >
                            <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
                        </button>
                    </>
                )}

                {/* VERIFIER ACTIONS */}
                
{(userRoles.includes('verifier') || userRoles.includes('assignor')) && (
    <>
        <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110" title="View Report" onClick={() => onViewReport?.(study)}>
            <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
        </button>

        <button className="p-1.5 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110" title="DICOM Viewer" onClick={() => { const ohifUrl = `/ohif/viewer?StudyInstanceUIDs=${study.studyInstanceUID || study._id}`; window.open(ohifUrl, '_blank'); }}>
            <Eye className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
        </button>

        {['report_finalized', 'report_drafted', 'verification_pending'].includes(study.workflowStatus) && study.workflowStatus !== 'report_verified' && study.workflowStatus !== 'report_rejected' ? (
            <button 
                className="px-2 py-1 text-[10px] font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap" 
                title="Open OHIF + Reporting for Verification" 
                onClick={handleOHIFReporting}
            >
                Verify
            </button>
        ) : null}

        {(study.workflowStatus === 'report_completed' || study.workflowStatus === 'final_report_downloaded') && (
            <div className="p-1 text-green-600" title="Verified">
                <CheckCircle className="w-3.5 h-3.5 fill-current" />
            </div>
        )}

        {/* ✅ REJECTED STATUS - Show X if rejected */}
        {study.workflowStatus === 'report_rejected' && (
            <div className="p-1 text-red-600" title="Rejected">
                <XCircle className="w-3.5 h-3.5 fill-current" />
            </div>
        )}
    </>
)}

            </div>
        </td>
    )}

    {shareModal && (
      <ShareModal 
        study={study} 
        isOpen={shareModal} 
        onClose={() => setShareModal(false)} 
      />
    )}
</tr>
    );
};

const TableFooter = ({ pagination, onPageChange, onRecordsPerPageChange, displayedRecords, loading }) => {
    const { currentPage, totalPages, totalRecords, recordsPerPage, hasNextPage, hasPrevPage } = pagination;
    const recordsPerPageOptions = [10, 25, 50, 100];

    const startRecord = totalRecords === 0 ? 0 : ((currentPage - 1) * recordsPerPage) + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

    return (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 py-1.5">
            <div className="flex items-center justify-between gap-3">

                {/* LEFT: Compact records info */}
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span>
                        <span className="font-semibold text-slate-800">{startRecord}-{endRecord}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="font-semibold text-teal-600">{totalRecords.toLocaleString()}</span>
                    </span>

                    <div className="h-3 w-px bg-slate-300" />

                    {/* Compact records per page */}
                    <select
                        id="recordsPerPage"
                        value={recordsPerPage}
                        onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
                        className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    >
                        {recordsPerPageOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                {/* CENTER: Compact page navigation */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={!hasPrevPage}
                        className={`p-1 rounded transition-all ${hasPrevPage ? 'bg-gray-800 hover:bg-black text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        title="Previous"
                    >
                        <ChevronLeft className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                        <span>Page</span>
                        <input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= totalPages) onPageChange(page);
                            }}
                            className="w-10 px-1 py-0.5 text-center text-[10px] border border-slate-200 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <span>of {totalPages}</span>
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={!hasNextPage}
                        className={`p-1 rounded transition-all ${hasNextPage ? 'bg-gray-800 hover:bg-black text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        title="Next"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                {/* RIGHT: Contact info + loading */}
                <div className="flex items-center gap-2">
                    {loading && (
                        <div className="w-2.5 h-2.5 border border-teal-600 border-t-transparent rounded-full animate-spin" />
                    )}

                    <div className="text-[10px] text-slate-500">
                        For any query call: <span className="font-semibold text-teal-600">98XXXX</span>
                    </div>
                </div>
            </div>
        </div>
    );
};



// ✅ MAIN UNIFIED WORKLIST TABLE
const UnifiedWorklistTable = ({
    studies = [],
    loading = false,
    selectedStudies = [],
    onSelectAll,
    onSelectStudy,
    onPatienIdClick,
    availableAssignees = { radiologists: [], verifiers: [] },
    onAssignmentSubmit,
    onUpdateStudyDetails,
    onToggleStudyLock,
    pagination = {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        recordsPerPage: 50,
        hasNextPage: false,
        hasPrevPage: false
    },
    onPageChange,
    onRecordsPerPageChange,
    visibleColumns = [],
    columnConfig = null,
    userRole = 'assignor',
    userRoles = []
}) => {

    const userAccountRoles = userRoles.length > 0 ? userRoles : [userRole];

    // ✅ ADD COLUMN RESIZING HOOK
    const { columnWidths, getColumnWidth, handleColumnResize, resetColumnWidths } = useColumnResizing(
        `unified-worklist-widths-${userAccountRoles.join('+')}`,
        visibleColumns
    );

     const [activeViewers, setActiveViewers] = useState({});
    const { sendMessage, lastMessage, readyState } = useWebSocket();

    // ✅ SUBSCRIBE TO VIEWER UPDATES
    useEffect(() => {
        if (readyState === WebSocket.OPEN) {
            // Subscribe to viewer updates
            sendMessage({
                type: 'subscribe_to_viewer_updates'
            });

            // Request current active viewers
            sendMessage({
                type: 'request_active_viewers'
            });
        }
    }, [readyState, sendMessage]);

    useEffect(() => {
        if (!lastMessage) return;

        try {
            const message = JSON.parse(lastMessage.data);

            switch (message.type) {
                case 'study_viewer_opened':
                    setActiveViewers(prev => {
                        const studyId = message.data.studyId;
                        const viewers = prev[studyId] || [];
                        if (!viewers.find(v => v.userId === message.data.userId)) {
                            return {
                                ...prev,
                                [studyId]: [...viewers, {
                                    userId: message.data.userId,
                                    userName: message.data.userName,
                                    mode: message.data.mode,
                                    openedAt: new Date().toISOString()
                                }]
                            };
                        }
                        return prev;
                    });
                    break;

                case 'study_viewer_closed':
                    setActiveViewers(prev => {
                        const studyId = message.data.studyId;
                        const viewers = (prev[studyId] || []).filter(v => v.userId !== message.data.userId);
                        if (viewers.length === 0) {
                            const { [studyId]: removed, ...rest } = prev;
                            return rest;
                        }
                        return { ...prev, [studyId]: viewers };
                    });
                    break;

                case 'active_viewers_list':
                    setActiveViewers(message.data);
                    break;

                default:
                    break;
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }, [lastMessage]);

    
 
// ...existing code...
// ...existing code...

const DB_TO_CONFIG_KEY_MAP = {
  'checkbox'           : 'checkbox',
  'bharatPacsId'       : 'bharatPacsId',
  'centerName'         : 'centerName',
  'location'           : 'location',
  'timeline'           : 'timeline',
  'patientName'        : 'patientName',
  'patientId'          : 'patientId',
  'ageGender'          : 'ageGender',
  'modality'           : 'modality',
  'viewOnly'           : 'viewOnly',
  'reporting'          : 'reporting',
  'studySeriesImages'  : 'studySeriesImages',   // ✅ FIX: was 'seriesCount'
  'accessionNumber'    : 'accessionNumber',
  'referralDoctor'     : 'referralDoctor',
  'clinicalHistory'    : 'clinicalHistory',
  'studyDateTime'      : 'studyDateTime',        // ✅ FIX: was 'studyTime'
  'uploadDateTime'     : 'uploadDateTime',       // ✅ FIX: was 'uploadTime'
  'assignedRadiologist': 'assignedRadiologist',  // ✅ FIX: was 'radiologist'
  'studyLock'          : 'studyLock',
  'status'             : 'status',               // ✅ FIX: was 'caseStatus'
  'assignedVerifier'   : 'assignedVerifier',
  'verifiedDateTime'   : 'verifiedDateTime',
  'actions'            : 'actions',
  'rejectionReason'    : 'rejectionReason',
  'printCount'         : 'printCount',           // ✅ ADD: was missing entirely
  'selection'          : 'selection',            // ✅ ADD: was missing entirely
  'organization'       : 'organization',         // ✅ ADD: was missing entirely
};

// ...existing code...


// old working code block
//     const isColumnVisible = useCallback((columnId) => {
//        // ✅ DB visibleColumns is the ONLY gate
//         if (visibleColumns && visibleColumns.length > 0) {
//            const isAllowed = visibleColumns.includes(columnId);

//            if(!isAllowed) {
//                return false; // Not allowed by DB — hide regardless of local toggle
//            }
          
//            // Allowed by DB — check user's ColumnConfigurator toggle
//             if (columnConfig && columnConfig[columnId] !== undefined) {
//                 return columnConfig[columnId].visible !== false;
//             }
// // -           return true;
//            return true; // In DB list, no local toggle = show
//         }
//        // No DB restrictions (admin/super_admin) — use columnConfig only
//         // if (columnConfig && columnConfig[columnId] !== undefined) {
//         //     return columnConfig[columnId].visible !== false;
//         // }
//         // return true;
//     }, [visibleColumns, columnConfig]);


 const isColumnVisible = useCallback((columnId) => {
        if (visibleColumns && visibleColumns.length > 0) {
           // ✅ Convert DB keys to config keys for comparison
           const allowedConfigKeys = new Set(
               visibleColumns.map(dbKey => DB_TO_CONFIG_KEY_MAP[dbKey] || dbKey)
           );
           
           if (!allowedConfigKeys.has(columnId)) return false; // HARD BLOCK

            if (columnConfig && columnConfig[columnId] !== undefined) {
                return columnConfig[columnId].visible !== false;
            }
            return true;
        }
        if (columnConfig && columnConfig[columnId] !== undefined) {
            return columnConfig[columnId].visible !== false;
        }
        return true;
    }, [visibleColumns, columnConfig]);

       useEffect(() => {
       if (visibleColumns && visibleColumns.length > 0) {
           const staleKeys = [
               'doctorWorklistColumnConfig',
               'verifierWorklistColumnConfig',
               'labWorklistColumnConfig',
               'assignerWorklistColumnConfig',
               'adminWorklistColumnConfig',
           ];
           staleKeys.forEach(key => localStorage.removeItem(key));
           console.log('🧹 Cleared stale localStorage column caches — DB columns take over');
       }
   }, [visibleColumns]);

   // ✅ DEBUG: Log exactly what is being used
   useEffect(() => {
       console.log(`🔒 COLUMN GATE: DB allows ${visibleColumns.length} columns:`, visibleColumns);
   }, [visibleColumns]);
// ...existing code...





    //  const isColumnVisible = useCallback((columnId) => {
    //     // Always show actions and selection
    //     if (columnId === 'actions' || columnId === 'selection') return true;

    //     // Check if column is in visibleColumns array
    //     return visibleColumns.includes(columnId);
    //   }, [visibleColumns]);

    console.log('📊 UnifiedWorklistTable:', {
        visibleColumns: visibleColumns.length,
        userRole,
        userRoles,
        studies: studies.length
    });

    // ✅ LOG FOR DEBUGGING
    useEffect(() => {
        console.log('👁️ User Visible Columns:', visibleColumns);
        console.log('👥 User Account Roles:', userRoles);
    }, [visibleColumns, userRoles]);

    const [detailedView, setDetailedView] = useState({ show: false, studyId: null });
    const [reportModal, setReportModal] = useState({ show: false, studyId: null, studyData: null });
    const [studyNotes, setStudyNotes] = useState({ show: false, studyId: null });
    const [patientEditModal, setPatientEditModal] = useState({ show: false, study: null });
    const [timelineModal, setTimelineModal] = useState({ show: false, studyId: null, studyData: null });
    const [documentsModal, setDocumentsModal] = useState({ show: false, studyId: null });
    const [printModal, setPrintModal] = useState({ show: false, report: null });

    const handleShowTimeline = useCallback((study) => {
        setTimelineModal({ show: true, studyId: study._id, studyData: study });
    }, []);

    const handleShowDetailedView = useCallback((studyId) => {
        setDetailedView({ show: true, studyId });
    }, []);

    const handleViewReport = useCallback((study) => {
        setReportModal({
            show: true,
            studyId: study._id,
            studyData: { patientName: study.patientName, patientId: study.patientId }
        });
    }, []);

    const handleShowStudyNotes = useCallback((studyId) => {
        setStudyNotes({ show: true, studyId });
    }, []);

    const handleEditPatient = useCallback((study) => {
        setPatientEditModal({ show: true, study });
    }, []);

    const handleSavePatientEdit = useCallback(async (formData) => {
        await onUpdateStudyDetails?.(formData);
        setPatientEditModal({ show: false, study: null });
    }, [onUpdateStudyDetails]);

    const handleShowDocuments = useCallback((study) => {
      setDocumentsModal({
        show: true,
        studyId: study?._id || null,
        studyMeta: {
          patientId:   study?.patientId   || study?.patientInfo?.patientID   || study?.patient?.PatientID   || '',
          patientName: study?.patientName || study?.patientInfo?.patientName || study?.patient?.PatientName || ''
        }
      });
    }, []);

    const handleToggleStudyLock = useCallback(async (studyId, shouldLock) => {
        try {
            const response = await api.post(`/admin/toggle-study-lock/${studyId}`, { shouldLock });
            if (response.data.success) {
                onToggleStudyLock?.(studyId, shouldLock);
            } else {
                throw new Error(response.data.message || 'Failed to toggle lock');
            }
        } catch (error) {
            throw error;
        }
    }, [onToggleStudyLock]);

    const handleShowPrintModal = useCallback((report) => {
        setPrintModal({ show: true, report });
    }, []);

    const handleClosePrintModal = useCallback(() => {
        setPrintModal({ show: false, report: null });
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">Loading studies...</p>
                </div>
            </div>
        );
    }

    if (studies.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No studies found</h3>
                </div>
            </div>
        );
    }


    return (
        <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-lg border-2 border-gray-300">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table
                    className="border-collapse"
                    style={{
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        tableLayout: 'fixed', // ✅ FIXED LAYOUT FOR RESIZABLE COLUMNS
                        width: '100%',
                        minWidth: 'max-content' // ✅ ALLOW HORIZONTAL SCROLL
                    }}
                >

                    <thead className="sticky top-0 z-10">
                        <tr className="text-white text-xs font-bold bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg">

                            {/* 1. SELECTION */}
                            {isColumnVisible('selection') && (
                                <ResizableTableHeader
                                    columnId="selection"
                                    label="Select"
                                    width={getColumnWidth('selection')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.SELECTION.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.SELECTION.maxWidth}
                                >
                                    <input
                                        type="checkbox"
                                        checked={studies.length > 0 && selectedStudies.length === studies.length}
                                        onChange={(e) => onSelectAll?.(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/30"
                                    />
                                </ResizableTableHeader>
                            )}

                            {/* 2. BHARAT PACS ID */}
                            {isColumnVisible('bharatPacsId') && (
                                <ResizableTableHeader
                                    columnId="bharatPacsId"
                                    label="BHARAT PACS ID"
                                    width={getColumnWidth('bharatPacsId')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.BHARAT_PACS_ID.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.BHARAT_PACS_ID.maxWidth}
                                />
                            )}

                            {/* 3. ORGANIZATION - Only for super_admin */}
                            {(userRoles.includes('super_admin') || userRole === 'super_admin') && isColumnVisible('organization') && (
                                <ResizableTableHeader
                                    columnId="organization"
                                    label="ORGANIZATION"
                                    width={getColumnWidth('organization')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.ORGANIZATION.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.ORGANIZATION.maxWidth}
                                />
                            )}

                            {/* 4. CENTER NAME */}
                            {isColumnVisible('centerName') && (
                                <ResizableTableHeader
                                    columnId="centerName"
                                    label="CENTER NAME"
                                    width={getColumnWidth('centerName')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.maxWidth}
                                />
                            )}

                            {/* ✅ FIXED: location uses LOCATION constant refs */}
                            {isColumnVisible('location') && (
                                <ResizableTableHeader
                                    columnId="location"
                                    label="LOCATION"
                                    width={getColumnWidth('location')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.LOCATION.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.LOCATION.maxWidth}
                                />
                            )}

                            {/* 5. TIMELINE */}
                            {isColumnVisible('timeline') && (
                                <ResizableTableHeader
                                    columnId="timeline"
                                    label=""
                                    width={getColumnWidth('timeline')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.TIMELINE.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.TIMELINE.maxWidth}
                                >
                                    <Clock className="w-4 h-4 mx-auto" />
                                </ResizableTableHeader>
                            )}

                            {/* 6. PATIENT NAME */}
                            {isColumnVisible('patientName') && (
                                <ResizableTableHeader
                                    columnId="patientName"
                                    label="PT NAME / UHID"
                                    width={getColumnWidth('patientName')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_NAME.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_NAME.maxWidth}
                                />
                            )}

                            {/* 7. AGE/SEX */}
                            {isColumnVisible('ageGender') && (
                                <ResizableTableHeader
                                    columnId="ageGender"
                                    label="AGE/SEX"
                                    width={getColumnWidth('ageGender')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.AGE_GENDER.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.AGE_GENDER.maxWidth}
                                />
                            )}

                            {/* 8. MODALITY */}
                            {isColumnVisible('modality') && (
                                <ResizableTableHeader
                                    columnId="modality"
                                    label="MODALITY"
                                    width={getColumnWidth('modality')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.MODALITY.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.MODALITY.maxWidth}
                                />
                            )}

                            {/* 9. VIEW ONLY */}
                            {isColumnVisible('viewOnly') && (
                                <ResizableTableHeader
                                    columnId="viewOnly"
                                    label="VIEW"
                                    width={getColumnWidth('viewOnly')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.VIEW_ONLY.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.VIEW_ONLY.maxWidth}
                                />
                            )}

                            {/* ✅ FIXED: reporting uses REPORTING constant refs */}
                            {isColumnVisible('reporting') && (
                                <ResizableTableHeader
                                    columnId="reporting"
                                    label="REPORTING"
                                    width={getColumnWidth('reporting')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.REPORTING.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.REPORTING.maxWidth}
                                />
                            )}

                            {/* 10. SERIES/IMAGES */}
                            {isColumnVisible('studySeriesImages') && (
                                <ResizableTableHeader
                                    columnId="studySeriesImages"
                                    label="SERIES/IMAGES"
                                    width={getColumnWidth('studySeriesImages')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_SERIES_IMAGES.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_SERIES_IMAGES.maxWidth}
                                />
                            )}

                            {/* 11. PATIENT ID */}
                            {isColumnVisible('patientId') && (
                                <ResizableTableHeader
                                    columnId="patientId"
                                    label="PT ID"
                                    width={getColumnWidth('patientId')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_ID.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_ID.maxWidth}
                                />
                            )}

                            {/* 12. REFERRAL DOCTOR */}
                            {isColumnVisible('referralDoctor') && (
                                <ResizableTableHeader
                                    columnId="referralDoctor"
                                    label="REFERRAL DOCTOR"
                                    width={getColumnWidth('referralDoctor')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.REFERRAL_DOCTOR.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.REFERRAL_DOCTOR.maxWidth}
                                />
                            )}

                            {/* 13. CLINICAL HISTORY */}
                            {isColumnVisible('clinicalHistory') && (
                                <ResizableTableHeader
                                    columnId="clinicalHistory"
                                    label="CLINICAL HISTORY"
                                    width={getColumnWidth('clinicalHistory')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.CLINICAL_HISTORY.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.CLINICAL_HISTORY.maxWidth}
                                />
                            )}

                            {/* 14. STUDY DATE/TIME */}
                            {isColumnVisible('studyDateTime') && (
                                <ResizableTableHeader
                                    columnId="studyDateTime"
                                    label="STUDY DATE/TIME"
                                    width={getColumnWidth('studyDateTime')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_DATE_TIME.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_DATE_TIME.maxWidth}
                                />
                            )}

                            {/* 15. UPLOAD DATE/TIME */}
                            {isColumnVisible('uploadDateTime') && (
                                <ResizableTableHeader
                                    columnId="uploadDateTime"
                                    label="UPLOAD DATE/TIME"
                                    width={getColumnWidth('uploadDateTime')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.UPLOAD_DATE_TIME.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.UPLOAD_DATE_TIME.maxWidth}
                                />
                            )}

                            {/* 16. ASSIGNED RADIOLOGIST */}
                            {isColumnVisible('assignedRadiologist') && (
                                <ResizableTableHeader
                                    columnId="assignedRadiologist"
                                    label="RADIOLOGIST"
                                    width={getColumnWidth('assignedRadiologist')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_RADIOLOGIST.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_RADIOLOGIST.maxWidth}
                                />
                            )}

                            {/* 17. LOCK/UNLOCK */}
                            {isColumnVisible('studyLock') && (
                                <ResizableTableHeader
                                    columnId="studyLock"
                                    label="LOCK/UNLOCK"
                                    width={getColumnWidth('studyLock')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_LOCK.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_LOCK.maxWidth}
                                />
                            )}

                            {/* 18. STATUS */}
                            {isColumnVisible('status') && (
                                <ResizableTableHeader
                                    columnId="status"
                                    label="STATUS"
                                    width={getColumnWidth('status')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.STATUS.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.STATUS.maxWidth}
                                />
                            )}

                            {/* 19. PRINT REPORT */}
                            {isColumnVisible('printCount') && (
                                <ResizableTableHeader
                                    columnId="printCount"
                                    label="PRINT REPORT"
                                    width={getColumnWidth('printCount')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.PRINT_COUNT.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.PRINT_COUNT.maxWidth}
                                />
                            )}

                            {/* 20. REJECTION REASON */}
                            {isColumnVisible('rejectionReason') && (
                                <ResizableTableHeader
                                    columnId="rejectionReason"
                                    label="REVERTED REASON"
                                    width={getColumnWidth('rejectionReason')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.REJECTION_REASON.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.REJECTION_REASON.maxWidth}
                                />
                            )}

                            {/* 21. VERIFIED BY */}
                            {isColumnVisible('assignedVerifier') && (
                                <ResizableTableHeader
                                    columnId="assignedVerifier"
                                    label="FINALISED BY"
                                    width={getColumnWidth('assignedVerifier')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_VERIFIER.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_VERIFIER.maxWidth}
                                />
                            )}

                            {/* 22. VERIFIED DATE/TIME */}
                            {isColumnVisible('verifiedDateTime') && (
                                <ResizableTableHeader
                                    columnId="verifiedDateTime"
                                    label="FINALISED DATE/TIME"
                                    width={getColumnWidth('verifiedDateTime')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.VERIFIED_DATE_TIME.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.VERIFIED_DATE_TIME.maxWidth}
                                />
                            )}

                            {/* 23. ACTIONS */}
                            {isColumnVisible('actions') && (
                                <ResizableTableHeader
                                    columnId="actions"
                                    label="ACTIONS"
                                    width={getColumnWidth('actions')}
                                    onResize={handleColumnResize}
                                    minWidth={UNIFIED_WORKLIST_COLUMNS.ACTIONS.minWidth}
                                    maxWidth={UNIFIED_WORKLIST_COLUMNS.ACTIONS.maxWidth}
                                />
                            )}

                        </tr>
                    </thead>


                    <tbody>
                         {sortStudiesByPriority(studies).map((study, index) => (
                            <UnifiedStudyRow
                                key={study._id}
                                study={study}
                                index={index}
                                activeViewers={activeViewers[study._id] || []} 
                                selectedStudies={selectedStudies}
                                availableAssignees={availableAssignees}
                                onSelectStudy={onSelectStudy}
                                onPatienIdClick={onPatienIdClick}
                                onShowDetailedView={handleShowDetailedView}
                                onViewReport={handleViewReport}
                                onShowStudyNotes={handleShowStudyNotes}
                                onEditPatient={handleEditPatient}
                                onAssignmentSubmit={onAssignmentSubmit}
                                onShowTimeline={handleShowTimeline}
                                onToggleLock={handleToggleStudyLock}
                                onShowDocuments={handleShowDocuments}
                                userRole={userRole}
                                userRoles={userAccountRoles}
                                isColumnVisible={isColumnVisible}
                                getColumnWidth={getColumnWidth} // ✅ Pass column width getter
                                setPrintModal={setPrintModal} 
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {studies.length > 0 && (
                <TableFooter
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onRecordsPerPageChange={onRecordsPerPageChange}
                    displayedRecords={studies.length}
                    loading={loading}
                />
            )}

            {detailedView.show && <StudyDetailedView studyId={detailedView.studyId} onClose={() => setDetailedView({ show: false, studyId: null })} />}
            {reportModal.show && <ReportModal isOpen={reportModal.show} studyId={reportModal.studyId} studyData={reportModal.studyData} onClose={() => setReportModal({ show: false, studyId: null, studyData: null })} />}
            {studyNotes.show && <StudyNotesComponent studyId={studyNotes.studyId} isOpen={studyNotes.show} onClose={() => setStudyNotes({ show: false, studyId: null })} />}
            {patientEditModal.show && <PatientEditModal study={patientEditModal.study} isOpen={patientEditModal.show} onClose={() => setPatientEditModal({ show: false, study: null })} onSave={handleSavePatientEdit} />}
            {timelineModal.show && <TimelineModal isOpen={timelineModal.show} onClose={() => setTimelineModal({ show: false, studyId: null, studyData: null })} studyId={timelineModal.studyId} studyData={timelineModal.studyData} />}
            {documentsModal.show && (
                <StudyDocumentsManager
                    studyId={documentsModal.studyId}
                    studyMeta={documentsModal.studyMeta}
                    isOpen={documentsModal.show}
                    onClose={() => setDocumentsModal({ show: false, studyId: null, studyMeta: null })}
                  />
                
                )}
            {printModal.show && (
                <PrintModal
                    report={printModal.report}
                    onClose={handleClosePrintModal}
                />
            )}
        </div>
    );
};

export default UnifiedWorklistTable;