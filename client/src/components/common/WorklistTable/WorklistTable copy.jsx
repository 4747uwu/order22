import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Copy, UserPlus, Lock, Unlock, Edit, Clock, Download, Paperclip, MessageSquare, FileText } from 'lucide-react';
// ✅ Import modals
import AssignmentModal from '../../assigner/AssignmentModal';
import StudyDetailedView from '../PatientDetailedView';
import ReportModal from '../ReportModal/ReportModal';
import StudyNotesComponent from '../StudyNotes/StudyNotesComponent';
import TimelineModal from '../TimelineModal';
import DownloadOptions from '../DownloadOptions/DownloadOptions';
import api from '../../../services/api'

// ✅ UTILITY FUNCTIONS
const getStatusColor = (status) => {
  switch (status) {
    case 'new_study_received':
    case 'pending_assignment':
      return 'bg-yellow-100 text-yellow-800';
    case 'assigned_to_doctor':
    case 'doctor_opened_report':
    case 'report_in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'report_drafted':
    case 'report_finalized':
    case 'final_report_downloaded':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
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

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
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

// ✅ ACTION DROPDOWN COMPONENT
const ActionDropdown = ({ study, onViewReport, onShowStudyNotes, onViewStudy }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 w-full justify-center"
      >
        Actions
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[9999]">
            <div className="py-1">
              <button
                onClick={() => { onViewStudy?.(study); setIsOpen(false); }}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Study
              </button>
              
              <button
                onClick={() => { onViewReport?.(study); setIsOpen(false); }}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Report
              </button>
              
              <button
                onClick={() => { onShowStudyNotes?.(study._id); setIsOpen(false); }}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Study Notes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-800 text-white">
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              disabled={loading}
            >
              Close
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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

// ✅ MAIN STUDY ROW COMPONENT
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
  userRole
}) => {
  const assignInputRef = useRef(null);
  const downloadButtonRef = useRef(null);
  const [assignInputValue, setAssignInputValue] = useState('');
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
  const hasNotes = study.discussions && study.discussions.length > 0;
  const hasAttachments = study.attachments && study.attachments.length > 0;
  const canToggleLock = userRole === 'admin' || userRole === 'assignor';

  // ✅ SYNC INPUT VALUE WITH RADIOLOGIST NAME (ONLY WHEN NOT FOCUSED)
  useEffect(() => {
    if (!inputFocused && !showAssignmentModal) {
      // Only show radiologist name when input is NOT focused
      setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
    }
  }, [isAssigned, study.radiologist, inputFocused, showAssignmentModal]);

  const rowClasses = `${
    isSelected ? 'bg-blue-100' : 
    isAssigned ? 'bg-green-50' : 
    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
  } ${isUrgent ? 'border-l-4 border-l-red-600' : ''} hover:bg-blue-50 transition-colors`;

  // ✅ FIX: Clear input value when modal opens to show ALL radiologists
  const handleAssignInputFocus = (e) => {
    if (isLocked) {
      toast.error(`Locked by ${study.studyLock?.lockedByName}`, { icon: '🔒' });
      e.target.blur();
      return;
    }

    setInputFocused(true);
    
    // ✅ CRITICAL FIX: Clear input value to show full list
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

  // ✅ FIX: Reset input value when modal closes
  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setInputFocused(false);
    
    // ✅ Reset to radiologist name or empty
    setAssignInputValue(isAssigned && study.radiologist ? study.radiologist : '');
  };

  const handleAssignmentSubmit = async (assignmentData) => {
    await onAssignmentSubmit(assignmentData);
    handleCloseAssignmentModal();
  };

  // ✅ Handle download button click
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

  // ✅ Handle lock toggle
  const handleLockToggle = async (e) => {
    e.stopPropagation();

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
      {/* BP ID */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '100px' }}>
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-mono font-medium text-gray-800 truncate" title={study.bharatPacsId}>
            {study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id?.substring(0, 10)}
          </span>
          <button
            onClick={() => copyToClipboard(study.bharatPacsId !== 'N/A' ? study.bharatPacsId : study._id, 'BP ID')}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </td>

      {/* CENTER NAME */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '140px' }}>
        <div className="text-xs font-semibold text-gray-900 truncate" title={study.organizationName}>
          {study.organizationName || '-'}
        </div>
      </td>

      {/* SUB CENTER */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '130px' }}>
        <div className="text-xs text-gray-700 truncate" title={study.centerName}>
          {study.centerName || '-'}
        </div>
      </td>

      {/* TRACK CASE - ✅ REDUCED WIDTH */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '50px' }}>
        <button
          onClick={() => onShowTimeline?.(study)}
          className="p-1.5 hover:bg-purple-100 rounded-full transition-colors"
          title="View Timeline"
        >
          <Clock className="w-4 h-4 text-purple-600" />
        </button>
      </td>

      {/* PT NAME / UHID */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '160px' }}>
        <button 
          className="w-full text-left hover:underline"
          onClick={() => onPatienIdClick?.(study.patientId, study)}
        >
          <div className="text-xs font-semibold text-gray-900 truncate" title={study.patientName}>
            {study.patientName || '-'}
            {isUrgent && <span className="ml-1">🚨</span>}
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            UHID: {study.patientId || '-'}
          </div>
        </button>
      </td>

      {/* AGE/SEX */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '70px' }}>
        <div className="text-xs font-medium text-gray-800">
          {study.ageGender !== 'N/A' ? study.ageGender : 
           study.patientAge && study.patientSex ? 
           `${study.patientAge}/${study.patientSex.charAt(0)}` : '-'}
        </div>
      </td>

      {/* MODALITY - ✅ REDUCED WIDTH */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '70px' }}>
        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
          isUrgent ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'
        }`}>
          {study.modality || '-'}
        </span>
      </td>

      {/* STUDY / SERIES / IMAGES */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '90px' }}>
        <div className="text-[10px] text-gray-600">Study: 1</div>
        <div className="text-xs font-medium text-gray-800">S: {study.seriesCount || 0}</div>
        <div className="text-[10px] text-gray-500">I: {study.instanceCount || 0}</div>
      </td>

      {/* PT ID / ACC NO */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '110px' }}>
        <div className="text-[11px] text-gray-700 truncate">ID: {study.patientId || '-'}</div>
        <div className="text-[10px] text-gray-500 truncate">Acc: {study.accessionNumber || '-'}</div>
      </td>

      {/* REFERRAL DOCTOR */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '375px' }}>
        <div className="text-xs text-gray-700 truncate" title={study.referralNumber}>
          {study.referralNumber !== 'N/A' ? study.referralNumber : '-'}
        </div>
      </td>

      {/* CLINICAL HISTORY */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '825px' }}>
        <div className="text-xs text-gray-700 line-clamp-2" title={study.clinicalHistory}>
          {study.clinicalHistory || '-'}
        </div>
        <button
          onClick={() => onEditPatient?.(study)}
          className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1 font-medium"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
      </td>

      {/* STUDY DATE/TIME */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '100px' }}>
        <div className="text-[11px] font-medium text-gray-800">{formatDate(study.studyDate)}</div>
        <div className="text-[10px] text-gray-500">{study.studyTime || '-'}</div>
      </td>

      {/* UPLOAD DATE/TIME */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '100px' }}>
        <div className="text-[11px] font-medium text-gray-800">{formatDate(study.createdAt)}</div>
        <div className="text-[10px] text-gray-500">{formatTime(study.createdAt)}</div>
      </td>

      {/* RADIOLOGIST */}
      <td className="px-2 py-3 border-r border-b border-gray-300" style={{ width: '150px' }}>
        <div className="relative">
          <input
            ref={assignInputRef}
            type="text"
            value={assignInputValue}
            onChange={(e) => setAssignInputValue(e.target.value)}
            onFocus={handleAssignInputFocus}
            onBlur={() => {
              // ✅ Delay to allow modal click
              setTimeout(() => {
                if (!showAssignmentModal) {
                  setInputFocused(false);
                }
              }, 200);
            }}
            placeholder={isLocked ? "🔒 Locked" : "Search radiologist..."}
            disabled={isLocked}
            className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-2 focus:ring-blue-500 ${
              isLocked ? 'bg-gray-100 cursor-not-allowed' : 
              isAssigned && !inputFocused ? 'bg-green-50 border-green-300 text-green-800 font-medium' : 
              'bg-white border-gray-300'
            }`}
          />
          {isAssigned && !inputFocused && !isLocked && (
            <div className="w-2 h-2 bg-green-500 rounded-full absolute right-2 top-2" />
          )}
          {isLocked && (
            <Lock className="w-4 h-4 text-red-600 absolute right-2 top-2" />
          )}
        </div>
      </td>

      {/* CASE STATUS - ✅ REDUCED WIDTH */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '90px' }}>
        <span className={`px-2 py-1 rounded text-[10px] font-medium ${getStatusColor(study.workflowStatus)}`}>
          {study.caseStatus || formatWorkflowStatus(study.workflowStatus)}
        </span>
      </td>

      {/* VIEW - ✅ REDUCED WIDTH */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '60px' }}>
        <button
          onClick={() => onViewStudy?.(study)}
          className="text-xs text-blue-600 hover:underline font-semibold px-2 py-1"
        >
          View
        </button>
      </td>

      {/* PRINT REPORT */}
      <td className="px-2 py-3 text-center border-r border-b border-gray-300" style={{ width: '90px' }}>
        <div className="text-xs text-gray-700">{study.printCount > 0 ? `${study.printCount} prints` : 'No prints'}</div>
      </td>

      {/* ACTION - ✅ ENHANCED WITH DOWNLOAD & LOCK TOGGLE */}
      <td className="px-2 py-3 text-center border-b border-gray-300" style={{ width: '200px' }}>
        <div className="flex items-center justify-center gap-1">
          {/* Download Options */}
          <button
            ref={downloadButtonRef}
            onClick={handleDownloadClick}
            className="p-1.5 hover:bg-blue-100 rounded-full transition-colors group"
            title="Download Options"
          >
            <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-800" />
          </button>

          {/* ✅ Study Lock/Unlock Toggle - MAKE SURE THIS IS PRESENT */}
          
            <button
              onClick={handleLockToggle}
              disabled={togglingLock}
              className={`p-1.5 rounded-full transition-colors group ${
                togglingLock ? 'opacity-50 cursor-not-allowed' : 
                isLocked ? 'hover:bg-red-100' : 'hover:bg-gray-100'
              }`}
              title={isLocked ? `Locked by ${study.studyLock?.lockedByName} - Click to unlock` : 'Lock Study'}
            >
              {isLocked ? (
                <Lock className="w-4 h-4 text-red-600 group-hover:text-red-800" />
              ) : (
                <Unlock className="w-4 h-4 text-gray-500 group-hover:text-red-600" />
              )}
            </button>
          

          {/* Attachments */}
          <button
            onClick={() => console.log('Show attachments:', study._id)}
            className={`p-1.5 rounded-full transition-colors group ${
              hasAttachments ? 'bg-green-100' : 'hover:bg-gray-100'
            }`}
            title={hasAttachments ? `${study.attachments.length} attachment(s)` : 'No attachments'}
          >
            <Paperclip className={`w-4 h-4 ${
              hasAttachments ? 'text-green-600' : 'text-gray-400'
            } group-hover:text-green-800`} />
          </button>

          {/* Study Notes */}
          <button
            onClick={() => onShowStudyNotes?.(study._id)}
            className={`p-1.5 rounded-full transition-colors group ${
              hasNotes ? 'bg-green-100' : 'hover:bg-gray-100'
            }`}
            title={hasNotes ? `${study.discussions.length} note(s)` : 'No notes'}
          >
            <MessageSquare className={`w-4 h-4 ${
              hasNotes ? 'text-green-600' : 'text-gray-400'
            } group-hover:text-green-800`} />
          </button>

          {/* View Report */}
          <button
            onClick={() => onViewReport?.(study)}
            className="p-1.5 hover:bg-purple-100 rounded-full transition-colors group"
            title="View Report"
          >
            <FileText className="w-4 h-4 text-purple-600 group-hover:text-purple-800" />
          </button>

          {/* Action Dropdown */}
          <ActionDropdown 
            study={study}
            onViewReport={onViewReport}
            onShowStudyNotes={onShowStudyNotes}
            onViewStudy={onViewStudy}
          />
        </div>
      </td>

      {/* Download Options Modal */}
      {showDownloadOptions && (
        <DownloadOptions
          study={study}
          isOpen={showDownloadOptions}
          onClose={() => setShowDownloadOptions(false)}
          position={downloadPosition}
        />
      )}

      {/* ASSIGNMENT MODAL */}
      {showAssignmentModal && (
        <AssignmentModal
          study={study}
          availableAssignees={availableAssignees}
          onSubmit={handleAssignmentSubmit}
          onClose={handleCloseAssignmentModal}
          position={assignmentModalPosition}
          searchTerm={assignInputValue} // ✅ This will be empty string on open
        />
      )}
    </tr>
  );
};

// ✅ MAIN WORKLIST TABLE
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
  userRole = 'viewer', // ✅ NEW: Pass user role
  onToggleStudyLock // ✅ NEW: Lock toggle handler
}) => {
  
  const [assignmentModal, setAssignmentModal] = useState({ show: false, study: null });
  const [detailedView, setDetailedView] = useState({ show: false, studyId: null });
  const [reportModal, setReportModal] = useState({ show: false, studyId: null, studyData: null });
  const [studyNotes, setStudyNotes] = useState({ show: false, studyId: null });
  const [patientEditModal, setPatientEditModal] = useState({ show: false, study: null });
  const [timelineModal, setTimelineModal] = useState({ show: false, studyId: null, studyData: null });

  // Handlers
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

  const handleEditPatient = useCallback((study) => {
    setPatientEditModal({ show: true, study });
  }, []);

  const handleSavePatientEdit = useCallback(async (formData) => {
    try {
      await onUpdateStudyDetails?.(formData);
      setPatientEditModal({ show: false, study: null });
    } catch (error) {
      throw error;
    }
  }, [onUpdateStudyDetails]);

  // ✅ NEW: Handle study lock toggle
  const handleToggleStudyLock = useCallback(async (studyId, shouldLock) => {
    try {
      console.log("yes it is there")
      
      const response = await api.post(`/admin/toggle-study-lock/${studyId}`, {
        shouldLock
      });

      console.log(response)

      if (response.data.success) {
        // Refresh study data or update local state
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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
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
    <div className="w-full h-full flex flex-col bg-white border border-gray-300">
      {/* ✅ SCROLLABLE TABLE CONTAINER */}
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full border-collapse" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
          {/* ✅ EXCEL-LIKE HEADER - GREEN */}
          <thead className="sticky top-0 z-10">
            <tr className="text-white text-xs font-bold bg-gradient-to-r from-green-600 to-green-700">
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '100px' }}>BP ID</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '140px' }}>CENTER<br/>NAME</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '130px' }}>SUB<br/>CENTER</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '50px' }}>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '160px' }}>PT NAME /<br/>UHID</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '70px' }}>AGE/<br/>SEX</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '70px' }}>MOD</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '90px' }}>STUDY /<br/>SERIES /<br/>IMAGES</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '110px' }}>PT ID/<br/>ACC. NO.</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '375px' }}>REFERRAL<br/>DOCTOR</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '825px' }}>CLINICAL<br/>HISTORY</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '100px' }}>STUDY<br/>DATE/TIME</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '100px' }}>UPLOAD<br/>DATE/TIME</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '150px' }}>RADIOLOGIST</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '90px' }}>STATUS</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '60px' }}>VIEW</th>
              <th className="px-2 py-3 text-center border-r border-green-800" style={{ width: '90px' }}>PRINT<br/>REPORT</th>
              <th className="px-2 py-3 text-center" style={{ width: '80px' }}>
                <div className="flex items-center justify-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <Lock className="w-3.5 h-3.5" />
                  <MessageSquare className="w-3.5 h-3.5" />
                  ACTION
                </div>
              </th>
            </tr>
          </thead>

          {/* ✅ TABLE BODY */}
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
                userRole={userRole}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ MODALS */}
      {detailedView.show && <StudyDetailedView studyId={detailedView.studyId} onClose={() => setDetailedView({ show: false, studyId: null })} />}
      {reportModal.show && <ReportModal isOpen={reportModal.show} studyId={reportModal.studyId} studyData={reportModal.studyData} onClose={() => setReportModal({ show: false, studyId: null, studyData: null })} />}
      {studyNotes.show && <StudyNotesComponent studyId={studyNotes.studyId} isOpen={studyNotes.show} onClose={() => setStudyNotes({ show: false, studyId: null })} />}
      {patientEditModal.show && <PatientEditModal study={patientEditModal.study} isOpen={patientEditModal.show} onClose={() => setPatientEditModal({ show: false, study: null })} onSave={handleSavePatientEdit} />}
      {timelineModal.show && <TimelineModal isOpen={timelineModal.show} onClose={() => setTimelineModal({ show: false, studyId: null, studyData: null })} studyId={timelineModal.studyId} studyData={timelineModal.studyData} />}
    </div>
  );
};

export default WorklistTable;