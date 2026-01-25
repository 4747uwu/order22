import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Copy, UserPlus, Lock, Unlock, Edit, Clock, Download, Paperclip, MessageSquare, FileText, Monitor, Eye, ChevronLeft, ChevronRight, CheckCircle, XCircle, Palette, Share2, RotateCcw, Printer } from 'lucide-react';
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
import RevertModal from '../../../components/RevertModal.jsx';
import PrintModal from '../../../components/PrintModal.jsx';


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

const formatWorkflowStatus = (status) => {
  switch (status) {
    case 'new_study_received': return 'New';
    case 'pending_assignment': return 'Pending';
    case 'assigned_to_doctor': return 'Assigned';
    case 'doctor_opened_report': return 'Opened';
    case 'report_in_progress': return 'In Progress';
    case 'report_drafted': return 'Drafted';
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

// ✅ PATIENT EDIT MODAL
const PatientEditModal = ({ study, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: '',
    studyName: '',
    referringPhysician: '',
    accessionNumber: '',
    clinicalHistory: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (study && isOpen) {
      setFormData({
        patientName: study.patientName || '',
        patientAge: study.patientAge || '',
        patientGender: study.patientSex || '',
        studyName: study.studyDescription || '',
        referringPhysician: study.referralNumber || '',
        accessionNumber: study.accessionNumber || '',
        clinicalHistory: study.clinicalHistory || ''
      });
    }
  }, [study, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({ studyId: study._id, ...formData });
      toast.success('Study details updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-gray-900">
        <div className="px-6 py-4 border-b-2 bg-gray-900 text-white">
          <h2 className="text-lg font-bold">{study?.patientName || 'Edit Study'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Patient Age <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.patientAge}
                onChange={(e) => setFormData(prev => ({ ...prev, patientAge: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.patientGender}
                onChange={(e) => setFormData(prev => ({ ...prev, patientGender: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Study Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.studyName}
                onChange={(e) => setFormData(prev => ({ ...prev, studyName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Referring Physician <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.referringPhysician}
                onChange={(e) => setFormData(prev => ({ ...prev, referringPhysician: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Accession Number
              </label>
              <input
                type="text"
                value={formData.accessionNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, accessionNumber: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Clinical History <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.clinicalHistory}
                onChange={(e) => setFormData(prev => ({ ...prev, clinicalHistory: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border-2 border-gray-400"
              disabled={loading}
            >
              Close
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm bg-gray-900 text-white rounded hover:bg-black disabled:opacity-50 border-2 border-gray-900"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ✅ STUDY ROW - ALL COLUMNS VISIBLE WITH DYNAMIC WIDTHS
const StudyRow = ({ 
  study, 
  index,
  selectedStudies,
  availableAssignees,
  onSelectStudy,
  onPatienIdClick,
  onAssignDoctor,
  onShowDetailedView,
  onViewReport,
  onShowStudyNotes,
  onViewStudy,
  onEditPatient,
  onAssignmentSubmit,
  onShowTimeline,
  onToggleLock,
  onShowDocuments,
  onShowRevertModal,

  userRole,
  userRoles = [],
  getColumnWidth
}) => {
  const navigate = useNavigate();
  console.log(study)
  
  const assignInputRef = useRef(null);
  const verifierInputRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const [assignInputValue, setAssignInputValue] = useState('');
  const [verifierInputValue, setVerifierInputValue] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentModalPosition, setAssignmentModalPosition] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadPosition, setDownloadPosition] = useState(null);
  const [togglingLock, setTogglingLock] = useState(false);

  const isSelected = selectedStudies?.includes(study._id);
  const isUrgent = study.priority === 'URGENT' || study.priority === 'EMERGENCY';
  const isAssigned = study.isAssigned;
  const isLocked = study?.isLocked || false;
  const hasNotes = study.hasStudyNotes === true || (study.discussions && study.discussions.length > 0);
  const hasAttachments = study.attachments && study.attachments.length > 0;
  const canToggleLock = userRoles.includes('admin') || userRoles.includes('assignor') || userRole === 'admin' || userRole === 'assignor';
  const isRejected = study.workflowStatus === 'report_rejected';
  const rejectionReason = study.reportInfo?.verificationInfo?.rejectionReason || '-';

  const userAccountRoles = userRoles.length > 0 ? userRoles : [userRole];

  useEffect(() => {
    if (!inputFocused && !showAssignmentModal) {
      setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
    }
  }, [isAssigned, study.radiologist, inputFocused, showAssignmentModal]);

  useEffect(() => {
    if (study.verifier) {
      setVerifierInputValue(
        typeof study.verifier === 'string' 
          ? study.verifier 
          : study.verifier?.fullName || study.verifier?.email || study.reportInfo?.verificationInfo?.verifiedBy?.name || study.verifiedBy || ''
      );
    }
  }, [study.verifier]);

  const rowClasses = `${
    isSelected ? 'bg-gray-100 border-l-2 border-l-gray-900' : 
    isAssigned ? 'bg-gray-50' : 
    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
  } ${isUrgent ? 'border-l-4 border-l-rose-500' : ''} ${isRejected ? 'border-l-4 border-l-rose-600' : ''} hover:bg-gray-100 transition-all duration-200 border-b border-slate-100`;

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
      setAssignmentModalPosition({
        top: rect.bottom + 8,
        left: Math.max(20, Math.min(rect.left, window.innerWidth - 470)),
        width: 450,
        zIndex: 99999
      });
      setShowAssignmentModal(true);
    }
  };

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
    navigate(`/doctor/viewer/${study._id}`, {
      state: { study }
    });
  };

  const handleOHIFReporting = () => {
    navigate(`/online-reporting/${study._id}?openOHIF=true`, {
      state: { 
        study: study,
        studyInstanceUID: study.studyInstanceUID || study._id
      }
    });
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
      <td className="px-2 py-3 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('selection')}px` }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelectStudy(study._id)}
          className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
        />
      </td>

      {/* 2. BHARAT PACS ID */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('bharatPacsId')}px` }}>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-slate-700 truncate" title={study.bharatPacsId}>
            {study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id?.substring(0, 10)}
          </span>
          <button
            onClick={() => copyToClipboard(study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id, 'BP ID')}
            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-gray-900" />
          </button>
        </div>
      </td>

      {/* 3. ORGANIZATION */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('organization')}px` }}>
        <div className="text-xs text-slate-600 truncate" title={study.organizationName}>
          {study.organizationName || '-'}
        </div>
      </td>

      {/* 4. CENTER NAME */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('centerName')}px` }}>
        <div className="text-xs text-slate-600 truncate" title={study.centerName}>
          {study.centerName || '-'}
        </div>
      </td>

      {/* //location */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('centerName')}px` }}>
        <div className="text-xs text-slate-600 truncate" title={study.centerName}>
          {study?.location || '-'}
        </div>
      </td>

      {/* 5. TIMELINE */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('timeline')}px` }}>
        <button
          onClick={() => onShowTimeline?.(study)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-all hover:scale-110"
          title="View Timeline"
        >
          <Clock className="w-4 h-4 text-gray-700" />
        </button>
      </td>

      {/* 6. PATIENT NAME / UHID */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('patientName')}px` }}>
        <button 
          className="w-full text-left hover:underline decoration-gray-900"
          onClick={() => onPatienIdClick?.(study.patientId, study)}
        >
          <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1" title={study.patientName}>
            {study.patientName || '-'}
            {isUrgent && <span className="text-rose-500">●</span>}
            {isRejected && <span className="text-rose-600" title={`Rejected: ${rejectionReason}`}>🚫</span>}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            UHID: {study.patientId || '-'}
          </div>
        </button>
      </td>

      {/* 7. AGE/SEX */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('ageGender')}px` }}>
        <div className="text-xs font-medium text-slate-700">
          {study.ageGender !== 'N/A' ? study.ageGender : 
           study.patientAge && study.patientSex ? 
           `${study.patientAge}/${study.patientSex.charAt(0)}` : 
           study.patientAge && study.patientGender ?
           `${study.patientAge}/${study.patientGender.charAt(0)}` : '-'}
        </div>
      </td>

      {/* 8. MODALITY */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('modality')}px` }}>
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm ${
          isUrgent ? 'bg-rose-200 text-rose-700 border border-rose-200' : 'bg-gray-200 text-gray-900 border border-gray-300'
        }`}>
          {study.modality || '-'}
        </span>
      </td>

      {/* 9. VIEW */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('viewOnly')}px` }}>
        <button
          onClick={handleViewOnlyClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all group hover:scale-110"
          title="View Images Only (No Locking)"
        >
          <Eye className="w-4 h-4 text-gray-700 group-hover:text-gray-900" />
        </button>
      </td>

      {/* 10. SERIES/IMAGES */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('studySeriesImages')}px` }}>
        <div className="text-[11px] text-slate-600 truncate">{study.studyDescription || 'N/A'}</div>
        <div className="text-xs font-medium text-slate-800">S: {study.seriesCount || 0} / {study.instanceCount || 0}</div>
      </td>

      {/* 11. PATIENT ID */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('patientId')}px` }}>
        <button 
          className="text-teal-600 hover:text-teal-700 font-semibold text-xs hover:underline"
          onClick={() => onPatienIdClick?.(study.patientId, study)}
        >
          {study.patientId || study.patientInfo?.patientID || 'N/A'}
        </button>
      </td>

      {/* 12. REFERRAL DOCTOR */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('referralDoctor')}px` }}>
        <div className="text-xs text-slate-700 truncate" title={study.referralNumber || study.referringPhysician}>
          {study.referralNumber || study.referringPhysician || '-'}
        </div>
      </td>

      {/* 13. CLINICAL HISTORY */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('clinicalHistory')}px` }}>
        <div 
          className="text-xs text-slate-700 leading-relaxed" 
          style={{
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            wordBreak: 'break-word'
          }}
        >
          {study.clinicalHistory || '-'}
        </div>

        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => onEditPatient?.(study)}
            className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-900 hover:underline mt-1.5 font-medium"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>

          <button
            onClick={() => onShowDocuments?.(study._id)}
            className={`p-2 rounded-lg transition-all group hover:scale-110 relative ${
              hasAttachments ? 'bg-gray-200' : 'hover:bg-slate-100'
            }`}
            title={hasAttachments ? `${study.attachments.length} attachment(s)` : 'Manage attachments'}
          >
            <Paperclip className={`w-4 h-4 ${
              hasAttachments ? 'text-gray-900' : 'text-slate-400'
            } group-hover:text-gray-900`} />
            
            {hasAttachments && study.attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-sm">
                {study.attachments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onShowStudyNotes?.(study._id)}
            className={`p-2 rounded-lg transition-all group hover:scale-110 ${
              hasNotes ? 'bg-gray-200' : 'hover:bg-slate-100'
            }`}
            title={hasNotes ? `${study.discussions?.length || '1'} note(s)` : 'No notes'}
          >
            <MessageSquare className={`w-4 h-4 ${
              hasNotes ? 'text-gray-900' : 'text-slate-400'
            } group-hover:text-gray-900`} />
          </button>
        </div>
      </td>

      {/* 14. STUDY DATE/TIME */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('studyDateTime')}px` }}>
        <div className="text-[11px] font-medium text-slate-800">{formatDate(study.studyDate)}</div>
        <div className="text-[10px] text-slate-500">{formatTime(study.studyTime) || '-'}</div>
      </td>

      {/* 15. UPLOAD DATE/TIME */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('uploadDateTime')}px` }}>
        <div className="text-[11px] font-medium text-slate-800">{formatDate(study.createdAt)}</div>
        <div className="text-[10px] text-slate-500">{formatTime(study.createdAt)}</div>
      </td>

      {/* 16. RADIOLOGIST */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('assignedRadiologist')}px` }}>
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
            className={`w-full px-3 py-2 text-xs border-2 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all ${
              isLocked ? 'bg-slate-200 cursor-not-allowed text-slate-500 border-gray-400' : 
              isAssigned && !inputFocused ? 'bg-gray-200 border-gray-400 text-gray-900 font-medium shadow-sm' : 
              'bg-white border-slate-200 hover:border-slate-300'
            }`}
          />
          {isAssigned && !inputFocused && !isLocked && (
            <div className="w-2 h-2 bg-gray-900 rounded-full absolute right-3 top-3 shadow-sm" />
          )}
          {isLocked && (
            <Lock className="w-4 h-4 text-rose-600 absolute right-3 top-2.5" />
          )}
        </div>
      </td>

      {/* 17. LOCK/UNLOCK TOGGLE */}
      <td className="px-3 py-3.5 text-center border-r border-slate-200" style={{ width: `${getColumnWidth('studyLock')}px` }}>
        <button
          onClick={handleLockToggle}
          disabled={togglingLock || !canToggleLock}
          className={`p-2 rounded-lg transition-all group hover:scale-110 ${
            togglingLock ? 'opacity-50 cursor-not-allowed' : 
            !canToggleLock ? 'opacity-30 cursor-not-allowed' :
            isLocked ? 'hover:bg-rose-50' : 'hover:bg-slate-100'
          }`}
          title={isLocked ? `Locked by ${study.studyLock?.lockedByName}` : 'Lock Study'}
        >
          {isLocked ? (
            <Lock className="w-4 h-4 text-rose-600 group-hover:text-rose-700" />
          ) : (
            <Unlock className="w-4 h-4 text-slate-500 group-hover:text-rose-600" />
          )}
        </button>
      </td>

      {/* 18. STATUS - WITH DATE/TIME */}
      <td className="px-3 py-3.5 text-center border-r border-slate-200" style={{ width: `${getColumnWidth('status')}px` }}>
        <div className="flex flex-col items-center gap-1">
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-medium shadow-sm ${getStatusColor(study.workflowStatus)}`}>
            {study.caseStatusCategory || formatWorkflowStatus(study.workflowStatus)}
          </span>
          {study.statusHistory && study.statusHistory.length > 0 && (() => {
            const currentStatusEntry = study.statusHistory
              .slice()
              .reverse()
              .find(entry => entry.status === study.workflowStatus);
            
            if (currentStatusEntry && currentStatusEntry.changedAt) {
              return (
                <div className="text-[9px] text-slate-500">
                  {formatDate(currentStatusEntry.changedAt)} {formatTime(currentStatusEntry.changedAt)}
                </div>
              );
            }
            return null;
          })()}
        </div>
      </td>

      {/* 19. PRINT COUNT */}
<td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('printCount')}px` }}>
  {study.printInfo && study.printInfo.totalPrints > 0 ? (
    <div className="flex flex-col items-center gap-1">
      {/* Print Button with Count */}
      <button
        onClick={() => onViewReport?.(study)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:scale-105 shadow-sm ${
          study.printInfo.totalPrints === 1 
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 hover:from-emerald-100 hover:to-green-100' 
            : 'bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 hover:from-rose-100 hover:to-red-100'
        }`}
        title={`${study.printInfo.totalPrints} print${study.printInfo.totalPrints > 1 ? 's' : ''} - Last: ${formatDate(study.printInfo.lastPrintedAt)}`}
      >
        <Printer className={`w-3.5 h-3.5 ${
          study.printInfo.totalPrints === 1 ? 'text-emerald-600' : 'text-rose-600'
        }`} />
        <span className={`text-xs font-bold ${
          study.printInfo.totalPrints === 1 ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {study.printInfo.totalPrints}
        </span>
      </button>
      
      {/* Print Date & Time */}
      <div className="text-[10px] text-slate-500 text-center">
        <div className="font-medium">{formatDate(study.printInfo.lastPrintedAt)}</div>
        <div>{formatTime(study.printInfo.lastPrintedAt)}</div>
      </div>
      
      {/* First print indicator if reprinted */}
      {study.printInfo.totalPrints > 1 && study.printInfo.firstPrintedAt && (
        <div className="text-[9px] text-slate-400 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          <span>First: {formatDate(study.printInfo.firstPrintedAt)}</span>
        </div>
      )}
    </div>
  ) : (
    <button
      onClick={() => onViewReport?.(study)}
      className="flex flex-col items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
      title="No prints yet - Click to view report"
    >
      <Printer className="w-4 h-4" />
      <span className="text-[10px]">No prints</span>
    </button>
  )}
</td>

        <td className="px-3 py-3.5 border-r border-slate-200" style={{ width: `${getColumnWidth('rejectionReason')}px` }}>
        {isRejected ? (
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div 
              className="text-xs text-rose-700 leading-relaxed font-medium" 
              style={{
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              }}
              title={rejectionReason}
            >
              {study.verificationNotes || rejectionReason}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 text-center">-</div>
        )}
      </td>

      {/* 20. VERIFIED BY */}
      <td className="px-3 py-3.5 border-r border-b border-slate-200" style={{ width: `${getColumnWidth('assignedVerifier')}px` }}>
        <div className="text-xs text-slate-700 truncate">
          {typeof study.verifier === 'string' 
            ? study.verifier 
            : study.verifier?.fullName || study.verifier?.email || study.reportInfo?.verificationInfo?.verifiedBy?.name || study.verifiedBy || '-'}
        </div>
      </td>

      {/* 21. VERIFIED DATE/TIME */}
      <td className="px-3 py-3.5 text-center border-r border-b border-slate-200" style={{ width: `${getColumnWidth('verifiedDateTime')}px` }}>
        <div className="text-[11px] font-medium text-slate-800">
          {formatDate(study.reportInfo?.verificationInfo?.verifiedAt || study.verifiedAt)}
        </div>
        <div className="text-[10px] text-slate-500">
          {formatTime(study.reportInfo?.verificationInfo?.verifiedAt || study.verifiedAt)}
        </div>
      </td>

            
      {/* 22. ACTIONS - ALL ADMIN OPTIONS */}
     <td className="px-3 py-3.5 text-center border-slate-200" style={{ width: `${getColumnWidth('actions')}px` }}>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {/* ADMIN/ASSIGNOR GETS ALL OPTIONS */}
          {(userAccountRoles.includes('admin') || userAccountRoles.includes('assignor') || userAccountRoles.includes('super_admin')) && (
            <>
              {/* Download Button */}
              <button
                ref={downloadButtonRef}
                onClick={handleDownloadClick}
                className="p-2 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110"
                title="Download Options"
              >
                <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
              </button>

              {/* OHIF + Reporting Button */}
              <button
                onClick={handleOHIFReporting}
                className="p-2 hover:bg-emerald-50 rounded-lg transition-all group hover:scale-110"
                title="OHIF + Reporting"
              >
                <Monitor className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
              </button>

              {/* View Report Button */}
              <button
                onClick={() => onViewReport?.(study)}
                className="p-2 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110"
                title="View Report"
              >
                <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
              </button>

              {/* DICOM Viewer Button */}
              <button
                onClick={() => {
                  const ohifUrl = `/ohif/viewer?StudyInstanceUIDs=${study.studyInstanceUID || study._id}`;
                  window.open(ohifUrl, '_blank');
                }}
                className="p-2 hover:bg-indigo-50 rounded-lg transition-all group hover:scale-110"
                title="DICOM Viewer"
              >
                <Eye className="w-4 h-4 text-indigo-600 group-hover:text-indigo-700" />
              </button>

              {/* Share Button */}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/study/${study._id}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Study link copied to clipboard!');
                }}
                className="p-2 hover:bg-sky-50 rounded-lg transition-all group hover:scale-110"
                title="Share Study"
              >
                <Share2 className="w-4 h-4 text-sky-600 group-hover:text-sky-700" />
              </button>

              {/* Verify Button */}
              {/* <button 
                className="px-2.5 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm" 
                title="Verify Report"
                onClick={handleOHIFReporting}
              >
                Verify
              </button> */}

              {/* Status Icons */}
              {/* {study.workflowStatus === 'report_verified' && (
                <div className="p-1 text-green-600" title="Verified">
                  <CheckCircle className="w-4 h-4 fill-current" />
                </div>
              )}

              {study.workflowStatus === 'report_rejected' && (
                <div className="p-1 text-red-600" title="Rejected">
                  <XCircle className="w-4 h-4 fill-current" />
                </div>
              )} */}
            </>
          )}

            {(userRoles.includes('admin') || userRoles.includes('super_admin')) && 
            ['report_drafted', 'report_finalized', 'verification_pending', 'report_verified', 'report_completed'].includes(study.workflowStatus) && (
                <button
                    onClick={() => onShowRevertModal(study)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                    title="Revert to Radiologist"
                >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert</span>
                </button>
            )}

          {/* RADIOLOGIST ACTIONS */}
          {userAccountRoles.includes('radiologist') && !userAccountRoles.includes('admin') && !userAccountRoles.includes('assignor') && (
            <>
              <button
                onClick={handleOHIFReporting}
                className="p-2 hover:bg-emerald-50 rounded-lg transition-all group hover:scale-110"
                title="OHIF + Reporting"
              >
                <Monitor className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
              </button>

              <button
                onClick={() => onViewReport?.(study)}
                className="p-2 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110"
                title="View Report"
              >
                <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
              </button>
            </>
          )}

          {/* VERIFIER ACTIONS */}
          {userAccountRoles.includes('verifier') && !userAccountRoles.includes('admin') && !userAccountRoles.includes('assignor') && (
            <>
              <button 
                className="p-2 hover:bg-blue-50 rounded-lg transition-all group hover:scale-110" 
                title="View Report"
                onClick={() => onViewReport?.(study)}
              >
                <FileText className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
              </button>

              <button 
                className="p-2 hover:bg-purple-50 rounded-lg transition-all group hover:scale-110" 
                title="DICOM Viewer"
                onClick={() => {
                  const ohifUrl = `/ohif/viewer?StudyInstanceUIDs=${study.studyInstanceUID || study._id}`;
                  window.open(ohifUrl, '_blank');
                }}
              >
                <Eye className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
              </button>

              <button 
                className="px-2.5 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm" 
                title="Open OHIF + Reporting for Verification"
                onClick={handleOHIFReporting}
              >
                Verify
              </button>

              {/* {study.workflowStatus === 'report_verified' && (
                <div className="p-1 text-green-600" title="Verified">
                  <CheckCircle className="w-4 h-4 fill-current" />
                </div>
              )}

              {study.workflowStatus === 'report_rejected' && (
                <div className="p-1 text-red-600" title="Rejected">
                  <XCircle className="w-4 h-4 fill-current" />
                </div>
              )} */}
            </>
          )}

          {/* FALLBACK ACTION */}
          
        </div>
      </td>

      {showDownloadOptions && (
        <DownloadOptions
          study={study}
          isOpen={showDownloadOptions}
          onClose={() => setShowDownloadOptions(false)}
          position={downloadPosition}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal
          study={study}
          availableAssignees={availableAssignees}
          onSubmit={handleAssignmentSubmit}
          onClose={handleCloseAssignmentModal}
          position={assignmentModalPosition}
          searchTerm={assignInputValue}
        />
      )}
    </tr>
  );
};

// ✅ TABLE FOOTER
const TableFooter = ({ pagination, onPageChange, onRecordsPerPageChange, displayedRecords, loading }) => {
  const { currentPage, totalPages, totalRecords, recordsPerPage, hasNextPage, hasPrevPage } = pagination;
  const recordsPerPageOptions = [10, 25, 50, 100];

  const startRecord = totalRecords === 0 ? 0 : ((currentPage - 1) * recordsPerPage) + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700 font-medium">
          Showing <span className="font-bold text-gray-900">{startRecord}</span> to{' '}
          <span className="font-bold text-gray-900">{endRecord}</span> of{' '}
          <span className="font-bold text-gray-900">{totalRecords}</span> records
        </span>

        <div className="flex items-center space-x-2">
          <label htmlFor="recordsPerPage" className="text-sm text-gray-700 font-medium">
            Show:
          </label>
          <select
            id="recordsPerPage"
            value={recordsPerPage}
            onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {recordsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option} per page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className={`p-2 rounded-lg transition-all ${
            hasPrevPage ? 'bg-gray-800 hover:bg-black text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 font-medium">Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) onPageChange(page);
            }}
            className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          <span className="text-sm text-gray-700 font-medium">of {totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className={`p-2 rounded-lg transition-all ${
            hasNextPage ? 'bg-gray-800 hover:bg-black text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ✅ MAIN WORKLIST TABLE - ALL COLUMNS, NO RESTRICTIONS, RESIZABLE
const WorklistTable = ({ 
  studies = [], 
  loading = false, 
  selectedStudies = [],
  onSelectAll, 
  onSelectStudy,
  onPatienIdClick,
  onAssignDoctor,
  availableAssignees = { radiologists: [], verifiers: [] },
  onAssignmentSubmit,
  onUpdateStudyDetails,
  userRole = 'viewer',
  userRoles = [],
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
  headerColor
}) => {
  const userAccountRoles = userRoles.length > 0 ? userRoles : [userRole];

  // ✅ ADD COLUMN RESIZING HOOK
  const { columnWidths, getColumnWidth, handleColumnResize, resetColumnWidths } = useColumnResizing(
    `admin-worklist-widths`,
    []
  );

  const [detailedView, setDetailedView] = useState({ show: false, studyId: null });
  const [reportModal, setReportModal] = useState({ show: false, studyId: null, studyData: null });
  const [studyNotes, setStudyNotes] = useState({ show: false, studyId: null });
  const [patientEditModal, setPatientEditModal] = useState({ show: false, study: null });
  const [timelineModal, setTimelineModal] = useState({ show: false, studyId: null, studyData: null });
  const [documentsModal, setDocumentsModal] = useState({ show: false, studyId: null });

  const [revertModal, setRevertModal] = useState({ show: false, study: null });
  const[printModal, setPrintModal] = useState({ show: false, report: false });

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

  const handleViewStudy = useCallback((study) => {
    handleShowDetailedView(study._id);
  }, [handleShowDetailedView]);

  const handleShowRevertModal = useCallback((study) => {
  setRevertModal({ show: true, study });
}, []);

const handleRevertSuccess = useCallback(() => {
  setRevertModal({ show: false, study: null });
  // Optionally refresh the study list
  window.location.reload();
}, []);

const handleShowPrintModal = useCallback((report) => {
  setPrintModal({ show: true, report });
}, []);  

const handleClosePrintModal = useCallback(() => {
  setPrintModal({ show: false, report: false });

},[]);


  const handleEditPatient = useCallback((study) => {
    setPatientEditModal({ show: true, study });
  }, []);

  const handleSavePatientEdit = useCallback(async (formData) => {
    await onUpdateStudyDetails?.(formData);
    setPatientEditModal({ show: false, study: null });
  }, [onUpdateStudyDetails]);

  const handleShowDocuments = useCallback((studyId) => {
    setDocumentsModal({ show: true, studyId });
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
            tableLayout: 'fixed',
            width: '100%',
            minWidth: 'max-content'
          }}
        >
          {/* ✅ DYNAMIC COLORED HEADER WITH RESIZABLE COLUMNS - ALL COLUMNS */}
          <thead className="sticky top-0 z-10">
            <tr className={`text-xs font-bold bg-gradient-to-r ${headerColor?.gradient || 'from-gray-800 via-gray-900 to-black'} ${headerColor?.textColor || 'text-white'} shadow-lg`}>
              {/* 1. SELECTION */}
              <ResizableTableHeader
                columnId="selection"
                label=""
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
              
              {/* 2. BHARAT PACS ID */}
              <ResizableTableHeader
                columnId="bharatPacsId"
                label={<>BHARAT<br/>PACS ID</>}
                width={getColumnWidth('bharatPacsId')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.BHARAT_PACS_ID.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.BHARAT_PACS_ID.maxWidth}
              />
              
              {/* 3. ORGANIZATION */}
              <ResizableTableHeader
                columnId="organization"
                label="ORGANIZATION"
                width={getColumnWidth('organization')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.ORGANIZATION.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.ORGANIZATION.maxWidth}
              />
              
              {/* 4. CENTER NAME */}
              <ResizableTableHeader
                columnId="centerName"
                label={<>CENTER<br/>NAME</>}
                width={getColumnWidth('centerName')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.maxWidth}
              />

              <ResizableTableHeader
                columnId="centerName"
                label={<>Location<br/>NAME</>}
                width={getColumnWidth('centerName')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.CENTER_NAME.maxWidth}
              />

              {/* 5. TIMELINE */}
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

              {/* 6. PATIENT NAME / UHID */}
              <ResizableTableHeader
                columnId="patientName"
                label={<>PT NAME /<br/>UHID</>}
                width={getColumnWidth('patientName')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_NAME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_NAME.maxWidth}
              />

              {/* 7. AGE/SEX */}
              <ResizableTableHeader
                columnId="ageGender"
                label={<>AGE/<br/>SEX</>}
                width={getColumnWidth('ageGender')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.AGE_GENDER.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.AGE_GENDER.maxWidth}
              />

              {/* 8. MODALITY */}
              <ResizableTableHeader
                columnId="modality"
                label="MODALITY"
                width={getColumnWidth('modality')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.MODALITY.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.MODALITY.maxWidth}
              />

              {/* 9. VIEW */}
              <ResizableTableHeader
                columnId="viewOnly"
                label=""
                width={getColumnWidth('viewOnly')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.VIEW_ONLY.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.VIEW_ONLY.maxWidth}
              >
                <Eye className="w-4 h-4 mx-auto" />
              </ResizableTableHeader>

              {/* 10. SERIES/IMAGES */}
              <ResizableTableHeader
                columnId="studySeriesImages"
                label={<>SERIES/<br/>IMAGES</>}
                width={getColumnWidth('studySeriesImages')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_SERIES_IMAGES.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_SERIES_IMAGES.maxWidth}
              />

              {/* 11. PT ID */}
              <ResizableTableHeader
                columnId="patientId"
                label="PT ID"
                width={getColumnWidth('patientId')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_ID.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.PATIENT_ID.maxWidth}
              />

              {/* 12. REFERRAL DOCTOR */}
              <ResizableTableHeader
                columnId="referralDoctor"
                label={<>REFERRAL<br/>DOCTOR</>}
                width={getColumnWidth('referralDoctor')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.REFERRAL_DOCTOR.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.REFERRAL_DOCTOR.maxWidth}
              />

              {/* 13. CLINICAL HISTORY */}
              <ResizableTableHeader
                columnId="clinicalHistory"
                label={<>CLINICAL<br/>HISTORY</>}
                width={getColumnWidth('clinicalHistory')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.CLINICAL_HISTORY.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.CLINICAL_HISTORY.maxWidth}
              />

              {/* 14. STUDY DATE/TIME */}
              <ResizableTableHeader
                columnId="studyDateTime"
                label={<>STUDY<br/>DATE/TIME</>}
                width={getColumnWidth('studyDateTime')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_DATE_TIME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_DATE_TIME.maxWidth}
              />

              {/* 15. UPLOAD DATE/TIME */}
              <ResizableTableHeader
                columnId="uploadDateTime"
                label={<>UPLOAD<br/>DATE/TIME</>}
                width={getColumnWidth('uploadDateTime')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.UPLOAD_DATE_TIME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.UPLOAD_DATE_TIME.maxWidth}
              />

              {/* 16. RADIOLOGIST */}
              <ResizableTableHeader
                columnId="assignedRadiologist"
                label="RADIOLOGIST"
                width={getColumnWidth('assignedRadiologist')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_RADIOLOGIST.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_RADIOLOGIST.maxWidth}
              />

              {/* 17. LOCK/UNLOCK */}
              <ResizableTableHeader
                columnId="studyLock"
                label={<>LOCK/<br/>UNLOCK</>}
                width={getColumnWidth('studyLock')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_LOCK.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.STUDY_LOCK.maxWidth}
              />

              {/* 18. STATUS */}
              <ResizableTableHeader
                columnId="status"
                label="STATUS"
                width={getColumnWidth('status')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.STATUS.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.STATUS.maxWidth}
              />

              {/* 19. PRINT REPORT */}
              <ResizableTableHeader
                columnId="printCount"
                label={<>PRINT<br/>REPORT</>}
                width={getColumnWidth('printCount')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.PRINT_COUNT.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.PRINT_COUNT.maxWidth}
              />

               <ResizableTableHeader
              columnId="rejectionReason"
              label="Rejection Reason"
              width={getColumnWidth('rejectionReason')}
              minWidth={UNIFIED_WORKLIST_COLUMNS.REJECTION_REASON.minWidth}
              maxWidth={UNIFIED_WORKLIST_COLUMNS.REJECTION_REASON.maxWidth}
              onResize={handleColumnResize}
            />

              {/* 20. VERIFIED BY */}
              <ResizableTableHeader
                columnId="assignedVerifier"
                label={<>VERIFIED<br/>BY</>}
                width={getColumnWidth('assignedVerifier')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_VERIFIER.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.ASSIGNED_VERIFIER.maxWidth}
              />

              {/* 21. VERIFIED DATE/TIME */}
              <ResizableTableHeader
                columnId="verifiedDateTime"
                label={<>VERIFIED<br/>DATE/TIME</>}
                width={getColumnWidth('verifiedDateTime')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.VERIFIED_DATE_TIME.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.VERIFIED_DATE_TIME.maxWidth}
              />

              {/* 22. ACTIONS */}
              <ResizableTableHeader
                columnId="actions"
                label="ACTIONS"
                width={getColumnWidth('actions')}
                onResize={handleColumnResize}
                minWidth={UNIFIED_WORKLIST_COLUMNS.ACTIONS.minWidth}
                maxWidth={UNIFIED_WORKLIST_COLUMNS.ACTIONS.maxWidth}
              />
            </tr>
          </thead>

          <tbody>
            {studies.map((study, index) => (
              <StudyRow
                key={study._id}
                study={study}
                index={index}
                selectedStudies={selectedStudies}
                availableAssignees={availableAssignees}
                onSelectStudy={onSelectStudy}
                onPatienIdClick={onPatienIdClick}
                onAssignDoctor={onAssignDoctor}
                onShowDetailedView={handleShowDetailedView}
                onViewReport={handleViewReport}
                onShowStudyNotes={handleShowStudyNotes}
                onViewStudy={handleViewStudy}
                onEditPatient={handleEditPatient}
                onAssignmentSubmit={onAssignmentSubmit}
                onShowTimeline={handleShowTimeline}
                onToggleLock={handleToggleStudyLock}
                onShowDocuments={handleShowDocuments}
                onShowRevertModal={handleShowRevertModal} // ✅ ADD THIS

                userRole={userRole}
                userRoles={userAccountRoles}
                getColumnWidth={getColumnWidth}
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

      {/* MODALS */}
      {detailedView.show && <StudyDetailedView studyId={detailedView.studyId} onClose={() => setDetailedView({ show: false, studyId: null })} />}


      {reportModal.show && <ReportModal isOpen={reportModal.show} studyId={reportModal.studyId} studyData={reportModal.studyData} onShowPrintModal={handleShowPrintModal} onClose={() => setReportModal({ show: false, studyId: null, studyData: null })} />}


      {studyNotes.show && <StudyNotesComponent studyId={studyNotes.studyId} isOpen={studyNotes.show} onClose={() => setStudyNotes({ show: false, studyId: null })} />}
      {patientEditModal.show && <PatientEditModal study={patientEditModal.study} isOpen={patientEditModal.show} onClose={() => setPatientEditModal({ show: false, study: null })} onSave={handleSavePatientEdit} />}
      {timelineModal.show && <TimelineModal isOpen={timelineModal.show} onClose={() => setTimelineModal({ show: false, studyId: null, studyData: null })} studyId={timelineModal.studyId} studyData={timelineModal.studyData} />}
      {documentsModal.show && (
        <StudyDocumentsManager
          studyId={documentsModal.studyId}
          isOpen={documentsModal.show}
          onClose={() => setDocumentsModal({ show: false, studyId: null })}
        />
      )}
      {/* ✅ ADD REVERT MODAL */}
{revertModal.show && (
  <RevertModal
    isOpen={revertModal.show}
    study={revertModal.study}
    onClose={() => setRevertModal({ show: false, study: null })}
    onSuccess={handleRevertSuccess}
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

export default WorklistTable;