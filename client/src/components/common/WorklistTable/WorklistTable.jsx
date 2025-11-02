import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import toast from 'react-hot-toast';
// ✅ Import modals
import AssignmentModal from '../../assigner/AssignmentModal';
import StudyDetailedView from '../PatientDetailedView'; // ✅ NEW: Import detailed view
import ReportModal from '../ReportModal/ReportModal'; // ✅ NEW: Import report modal
import StudyNotesComponent from '../StudyNotes/StudyNotesComponent'; // ✅ ADD THIS IMPORT

const ROW_HEIGHT = 38; // ✅ ULTRA COMPACT

// ✅ ADD MISSING UTILITY FUNCTIONS
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

// ✅ MODERN STATUS DOT
const StatusDot = ({ status, priority }) => {
  const getStatusInfo = () => {
    if (priority === 'EMERGENCY') return { color: 'bg-red-500', pulse: true };
    
    switch (status) {
      case 'new_study_received':
      case 'pending_assignment':
        return { color: 'bg-yellow-500', pulse: false };
      case 'assigned_to_doctor':
      case 'doctor_opened_report':
      case 'report_in_progress':
        return { color: 'bg-blue-500', pulse: false };
      case 'report_drafted':
      case 'report_finalized':
      case 'final_report_downloaded':
        return { color: 'bg-green-500', pulse: false };
      default:
        return { color: 'bg-gray-400', pulse: false };
    }
  };

  const { color, pulse } = getStatusInfo();
  
  return (
    <div 
      className={`w-2.5 h-2.5 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
      title={status}
    />
  );
};

// ✅ MODERN DOWNLOAD DROPDOWN
const DownloadDropdown = ({ study }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLaunchViewer = useCallback(() => {
    console.log('🖥️ Launch viewer for:', study._id);
    toast.success('🖥️ Launching viewer...');
    setIsOpen(false);
  }, [study]);

  const handleDirectDownload = useCallback(() => {
    console.log('📥 Direct download for:', study._id);
    toast.success('📥 Download started...');
    setIsOpen(false);
  }, [study]);

  const handleR2Download = useCallback(() => {
    console.log('🌐 R2 download for:', study._id);
    toast.success('🌐 R2 download started...');
    setIsOpen(false);
  }, [study]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
        title="Download Options"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-1 w-60 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={handleLaunchViewer}
                className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553 2.276A2 2 0 0121 14.09V17a2 2 0 01-2 2H5a2 2 0 01-2-2v-2.91a2 2 0 01.447-1.814L8 10m7-6v6m0 0l-3-3m3 3l3-3" />
                </svg>
                Launch Viewer
              </button>
              
              <button
                onClick={handleR2Download}
                className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                R2 CDN Download
              </button>
              
              <button 
                onClick={handleDirectDownload} 
                className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                </svg>
                Direct Download
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ✅ MODERN ACTION BUTTONS
const ActionButtons = ({ study, onViewReport, onShowStudyNotes }) => {
  return (
    <div className="flex items-center space-x-1">
      <button 
        className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors" 
        title="View Study"
        onClick={() => console.log('👁️ View:', study._id)}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      
      <DownloadDropdown study={study} />
      
      {/* ✅ UPDATED: View Report button that opens modal */}
      <button 
        className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors" 
        title="View Report"
        onClick={() => onViewReport && onViewReport(study)}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      
     
    </div>
  );
};

// ✅ UTILITY FUNCTIONS
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit'
    });
  } catch {
    return 'N/A';
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

// ✅ MODERN STUDY ROW WITH USER ICON CLICK
const StudyRow = ({ index, style, data }) => {
  const { studies, visibleColumns, selectedStudies, callbacks } = data;
  const study = studies[index];
  const assignButtonRef = useRef(null);
  console.log(study)
  if (!study) return null;

  const isSelected = selectedStudies?.includes(study._id);
  const isEmergency = study.priority === 'EMERGENCY';
  const isAssigned = study.isAssigned;
  
  const rowClasses = `flex items-center w-full h-full text-xs border-b border-gray-300 transition-all duration-150 hover:bg-gray-50 ${
    isSelected ? 'bg-blue-50 border-blue-200' : 
    isAssigned ? 'bg-green-50 border-green-200' : 
    index % 2 === 0 ? 'bg-white' : 'bg-gray-100'
  } ${isEmergency ? 'bg-red-50 border-red-200' : ''}`;

  // ✅ HANDLE USER ICON CLICK - Opens detailed view
  const handleUserIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👤 User icon clicked for study:', study._id);
    if (callbacks.onShowDetailedView) {
      callbacks.onShowDetailedView(study._id);
    }
  };

  const handleAssignClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (assignButtonRef.current && callbacks.onAssignDoctor) {
      const rect = assignButtonRef.current.getBoundingClientRect();
      const modalWidth = 350;
      
      const position = {
        top: rect.bottom + 8,
        left: rect.left - modalWidth,
        width: modalWidth
      };
      
      const modalHeight = 500;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      if (position.top + modalHeight > viewportHeight) {
        position.top = rect.top - modalHeight - 8;
      }
      
      if (position.left < 20) {
        position.left = 20;
      }
      
      if (position.left + modalWidth > viewportWidth - 20) {
        position.left = rect.left;
      }
      
      callbacks.onAssignDoctor(study, position);
    }
  };

  return (
    <div style={style} className="w-full">
      <div className={rowClasses}>
        
        {/* ✅ CHECKBOX */}
        {visibleColumns.checkbox && (
          <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
            <input
              type="checkbox"
              className="w-3 h-3 rounded border-gray-300 text-black focus:ring-black focus:ring-1"
              checked={isSelected}
              onChange={() => callbacks.onSelectStudy(study._id)}
            />
          </div>
        )}

        {/* ✅ STATUS */}
        {visibleColumns.workflowStatus && (
          <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
            <StatusDot status={study.workflowStatus} priority={study.priority} />
          </div>
        )}

        {/* ✅ USER ICON - CLICKABLE TO OPEN DETAILED VIEW */}
        <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
          <button
            onClick={handleUserIconClick}
            className="p-1 hover:bg-blue-100 rounded-full transition-colors group"
            title="View detailed patient information"
          >
            <svg className="w-3 h-3 text-gray-500 group-hover:text-blue-600 transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>
        </div>
        
        {/* ✅ OTHER ICON COLUMNS */}
        <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        
    
        {/* ✅ STUDY NOTES ICON - MAKE IT CLICKABLE */}
        <div className="flex-shrink-0 w-8 flex items-center justify-center border-r border-gray-200">
          <button
            onClick={() => callbacks.onShowStudyNotes && callbacks.onShowStudyNotes(study._id)}
            className="p-1 hover:bg-emerald-50 hover:text-emerald-600 rounded transition-colors group"
            title="Study Notes"
          >
            <svg className="w-3 h-3 text-gray-500 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>


        {/* ✅ PATIENT ID */}
        {visibleColumns.patientId && (
          <div className="flex-1 min-w-[100px] px-2 flex items-center border-r border-gray-200">
            <div className="flex flex-col w-full">
              <button 
                className={`text-black font-medium hover:underline truncate transition-colors ${
                  isEmergency ? 'text-red-700' : 'hover:text-blue-600'
                }`}
                onClick={() => callbacks.onPatienIdClick?.(study.patientId, study)}
              >
                {study.patientId || study.patient?.patientID || 'N/A'}
                {isEmergency && (
                  <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                    🚨
                  </span>
                )}
              </button>
              
              {isAssigned && (
                <div className="text-[10px] text-green-600 mt-0.5 flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="truncate">{study.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ PATIENT NAME */}
        {visibleColumns.patientName && (
          <div className="flex-1 min-w-[120px] px-2 flex items-center border-r border-gray-200">
            <div className={`font-medium truncate ${isEmergency ? 'text-red-900' : 'text-gray-900'}`}>
              {study.patientName || study.patient?.patientNameRaw || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ AGE/SEX */}
        {visibleColumns.ageGender && (
          <div className="flex-shrink-0 w-12 px-1 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.patientSex || study.patientAge || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ DESCRIPTION */}
        {visibleColumns.studyDescription && (
          <div className="flex-1 min-w-[150px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-900 font-medium' : 'text-gray-700'}`}>
              {study.studyDescription || study.description || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ SERIES */}
        {visibleColumns.seriesCount && (
          <div className="flex-shrink-0 w-12 px-1 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.seriesCount || study.numberOfSeries || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ MODALITY */}
        {visibleColumns.modality && (
          <div className="flex-shrink-0 w-24 px-1 flex items-center justify-center border-r border-gray-200">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              isEmergency ? 'bg-red-600 text-white' : 'bg-gray-200 text-black'
            }`}>
              {study.modality || 'N/A'}
            </span>
          </div>
        )}

        {/* ✅ LOCATION */}
        {visibleColumns.location && (
          <div className="flex-1 min-w-[100px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.location || study.sourceLab?.name || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ STUDY DATE */}
        {visibleColumns.studyDate && (
          <div className="flex-1 min-w-[40px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              <div className="font-medium">{formatDate(study.studyDate)}</div>
              <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                {formatTime(study.studyDate)}
              </div>
            </div>
          </div>
        )}

        {/* ✅ UPLOAD DATE */}
        {visibleColumns.uploadDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              <div className="font-medium">{formatDate(study.createdAt)}</div>
              <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                {formatTime(study.createdAt)}
              </div>
            </div>
          </div>
        )}

        {/* ✅ REPORTED DATE */}
        {visibleColumns.reportedDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.reportedDate ? (
                <>
                  <div className="font-medium">{formatDate(study.reportedDate)}</div>
                  <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                    {formatTime(study.reportedDate)}
                  </div>
                </>
              ) : (
                <div className="text-gray-400">Not reported</div>
              )}
            </div>
          </div>
        )}

        {/* ✅ REPORTED BY */}
        {visibleColumns.reportedBy && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.reportedBy || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ VERIFIED DATE */}
        {visibleColumns.verifiedDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.verifiedDate ? (
                <>
                  <div className="font-medium">{formatDate(study.verifiedDate)}</div>
                  <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                    {formatTime(study.verifiedDate)}
                  </div>
                </>
              ) : (
                <div className="text-gray-400">Not verified</div>
              )}
            </div>
          </div>
        )}

        {/* ✅ VERIFIED BY */}
        {visibleColumns.verifiedBy && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.verifiedBy || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ VERIFICATION STATUS */}
        {visibleColumns.verificationStatus && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.verificationStatus || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ ACCESSION */}
        {visibleColumns.accession && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.accessionNumber || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ SEEN BY */}
        {visibleColumns.seenBy && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center border-r border-gray-200">
            <div className={`truncate ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.seenBy || 'Not Assigned'}
            </div>
          </div>
        )}

        {/* ✅ ACTIONS */}
        {visibleColumns.actions && (
          <div className="flex-shrink-0 w-20 px-1 flex items-center justify-center border-r border-gray-200">
            <ActionButtons 
              study={study} 
              onViewReport={callbacks.onViewReport} // ✅ NEW: Pass view report callback
              onShowStudyNotes={callbacks.onShowStudyNotes} // ✅ ADD THIS
            />
          </div>
        )}

        {/* ✅ ASSIGN DOCTOR BUTTON */}
        {visibleColumns.assignedDoctor && (
          <div className="flex-shrink-0 w-20 px-1 flex items-center justify-center">
            <button 
              ref={assignButtonRef}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                isEmergency 
                  ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                  : isAssigned
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-black text-white hover:bg-gray-800'
              }`}
              onClick={handleAssignClick}
              title={isAssigned ? `Reassign from ${study.assignedTo}` : 'Assign to radiologist'}
            >
              {isEmergency && '🚨 '}
              {isAssigned ? 'Reassign' : 'Assign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ MAIN COMPONENT
const WorklistTable = ({ 
  studies = [], 
  loading = false, 
  columnConfig = {}, 
  selectedStudies = [],
  onSelectAll, 
  onSelectStudy,
  onPatienIdClick,
  onAssignDoctor,
  availableAssignees = { radiologists: [], verifiers: [] },
  onAssignmentSubmit
}) => {
  
  const [assignmentModal, setAssignmentModal] = useState({
    show: false,
    study: null,
    position: null
  });

  // ✅ NEW: Detailed view state
  const [detailedView, setDetailedView] = useState({
    show: false,
    studyId: null
  });

  // ✅ NEW: Report modal state
  const [reportModal, setReportModal] = useState({
    show: false,
    studyId: null,
    studyData: null
  });

  // ✅ NEW: Study notes state
  const [studyNotes, setStudyNotes] = useState({
    show: false,
    studyId: null
  });

  const visibleColumns = useMemo(() => {
    const visible = {};
    for (const key in columnConfig) {
      if (columnConfig[key]?.visible) {
        visible[key] = true;
      }
    }
    return visible;
  }, [columnConfig]);

  const handleAssignDoctor = useCallback((study, position) => {
    setAssignmentModal({
      show: true,
      study,
      position
    });
    
    if (onAssignDoctor) {
      onAssignDoctor(study);
    }
  }, [onAssignDoctor]);

  const handleAssignmentSubmit = useCallback(async (assignmentData) => {
    try {
      if (onAssignmentSubmit) {
        await onAssignmentSubmit(assignmentData);
      }
      setAssignmentModal({ show: false, study: null, position: null });
    } catch (error) {
      console.error('Assignment submission error:', error);
    }
  }, [onAssignmentSubmit]);

  const handleCloseAssignmentModal = useCallback(() => {
    setAssignmentModal({ show: false, study: null, position: null });
  }, []);

  // ✅ NEW: Detailed view handlers
  const handleShowDetailedView = useCallback((studyId) => {
    console.log('🔍 Opening detailed view for study:', studyId);
    setDetailedView({
      show: true,
      studyId: studyId
    });
  }, []);

  const handleCloseDetailedView = useCallback(() => {
    console.log('❌ Closing detailed view');
    setDetailedView({
      show: false,
      studyId: null
    });
  }, []);

  // ✅ NEW: Report modal handlers
  const handleViewReport = useCallback((study) => {
    console.log('📄 Opening report modal for study:', study._id);
    setReportModal({
      show: true,
      studyId: study._id,
      studyData: {
        patientName: study.patientName,
        patientId: study.patientId,
        studyDate: study.studyDate,
        modality: study.modality
      }
    });
  }, []);

  const handleCloseReportModal = useCallback(() => {
    console.log('❌ Closing report modal');
    setReportModal({
      show: false,
      studyId: null,
      studyData: null
    });
  }, []);

  // ✅ NEW: Study notes handlers
  const handleShowStudyNotes = useCallback((studyId) => {
    console.log('📝 Opening study notes for:', studyId);
    setStudyNotes({
      show: true,
      studyId: studyId
    });
  }, []);

  const handleCloseStudyNotes = useCallback(() => {
    console.log('❌ Closing study notes');
    setStudyNotes({
      show: false,
      studyId: null
    });
  }, []);

  const virtualListData = useMemo(() => ({
    studies,
    visibleColumns,
    selectedStudies,
    callbacks: { 
      onSelectStudy, 
      onPatienIdClick, 
      onAssignDoctor: handleAssignDoctor,
      onShowDetailedView: handleShowDetailedView,
      onViewReport: handleViewReport,
      onShowStudyNotes: handleShowStudyNotes // ✅ ADD THIS
    }
  }), [studies, visibleColumns, selectedStudies, onSelectStudy, onPatienIdClick, handleAssignDoctor, handleShowDetailedView, handleViewReport, handleShowStudyNotes]);

  const allSelected = studies?.length > 0 && selectedStudies?.length === studies?.length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">Loading studies...</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No studies found</h3>
          <p className="text-sm">Try adjusting your search or filter criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white relative">
      
      {/* ✅ MODERN HEADER */}
      <div className="flex items-center bg-gray-100 border-b border-gray-300 text-xs font-bold text-gray-800 uppercase tracking-wide sticky top-0 z-10 flex-shrink-0">
        
        {visibleColumns.checkbox && (
          <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded border-gray-300 text-black focus:ring-black focus:ring-1"
              checked={allSelected}
              onChange={(e) => onSelectAll?.(e.target.checked)}
            />
          </div>
        )}

        {visibleColumns.workflowStatus && (
          <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
            s
          </div>
        )}
        
        {/* ✅ ICON HEADERS */}
        <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300" title="Patient Info">
          <svg className="w-3 h-3 mx-auto text-gray-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
          <svg className="w-3 h-3 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
          <svg className="w-3 h-3 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        
        <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300" title="Study Notes">
          <svg className="w-3 h-3 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        {/* ✅ DATA HEADERS */}
        {visibleColumns.patientId && <div className="flex-1 min-w-[100px] px-2 py-2.5 border-r border-gray-300">Patient ID</div>}
        {visibleColumns.patientName && <div className="flex-1 min-w-[120px] px-2 py-2.5 border-r border-gray-300">Patient Name</div>}
        {visibleColumns.ageGender && <div className="flex-shrink-0 w-12 px-1 py-2.5 text-center border-r border-gray-300">A/S</div>}
        {visibleColumns.studyDescription && <div className="flex-1 min-w-[150px] px-2 py-2.5 border-r border-gray-300">Description</div>}
        {visibleColumns.seriesCount && <div className="flex-shrink-0 w-12 px-1 py-2.5 text-center border-r border-gray-300">Series</div>}
        {visibleColumns.modality && <div className="flex-shrink-0 w-24 px-1 py-2.5 text-center border-r border-gray-300">Modality</div>}
        {visibleColumns.location && <div className="flex-1 min-w-[100px] px-2 py-2.5 border-r border-gray-300">Location</div>}
        {visibleColumns.studyDate && <div className="flex-1 min-w-[40px] px-2 py-2.5 text-center border-r border-gray-300">Study Date</div>}
        {visibleColumns.uploadDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Upload Date</div>}
        {visibleColumns.reportedDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Reported Date</div>}
        {visibleColumns.reportedBy && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Reported By</div>}
        {visibleColumns.verifiedDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Verified Date</div>}
        {visibleColumns.verifiedBy && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Verified By</div>}
        {visibleColumns.verificationStatus && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Verification</div>}
        {visibleColumns.accession && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Accession</div>}
        {visibleColumns.seenBy && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Seen By</div>}
        {visibleColumns.actions && <div className="flex-shrink-0 w-20 px-1 py-2.5 text-center border-r border-gray-300">Actions</div>}
        {visibleColumns.assignedDoctor && <div className="flex-shrink-0 w-20 px-1 py-2.5 text-center">Assign</div>}
      </div>

      {/* ✅ VIRTUALIZED CONTENT */}
      <div className="w-full flex-1 relative">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={studies.length}
              itemSize={ROW_HEIGHT}
              itemData={virtualListData}
              overscanCount={10}
            >
              {StudyRow}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* ✅ ASSIGNMENT MODAL */}
      {assignmentModal.show && (
        <AssignmentModal
          study={assignmentModal.study}
          availableAssignees={availableAssignees}
          onSubmit={handleAssignmentSubmit}
          onClose={handleCloseAssignmentModal}
          position={assignmentModal.position}
        />
      )}

      {/* ✅ DETAILED VIEW MODAL */}
      {detailedView.show && (
        <StudyDetailedView
          studyId={detailedView.studyId}
          onClose={handleCloseDetailedView}
        />
      )}

      {/* ✅ NEW: REPORT MODAL */}
      {reportModal.show && (
        <ReportModal
          isOpen={reportModal.show}
          studyId={reportModal.studyId}
          studyData={reportModal.studyData}
          onClose={handleCloseReportModal}
        />
      )}

      {/* ✅ STUDY NOTES MODAL */}
      {studyNotes.show && (
        <StudyNotesComponent
          studyId={studyNotes.studyId}
          isOpen={studyNotes.show}
          onClose={handleCloseStudyNotes}
        />
      )}
    </div>
  );
};

export default WorklistTable;