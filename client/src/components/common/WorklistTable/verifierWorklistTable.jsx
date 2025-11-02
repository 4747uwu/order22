import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, FileText, Eye, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// ✅ Import modals
import AssignmentModal from '../../assigner/AssignmentModal';
import StudyDetailedView from '../PatientDetailedView';
import ReportModal from '../ReportModal/ReportModal';

const ROW_HEIGHT = 38;

// ✅ ADD MISSING UTILITY FUNCTIONS
const getStatusColor = (status) => {
  switch (status) {
    case 'report_finalized':
    case 'report_drafted':
      return 'bg-blue-100 text-blue-800';
    case 'verification_in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'report_verified':
      return 'bg-green-100 text-green-800';
    case 'report_rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatWorkflowStatus = (status) => {
  switch (status) {
    case 'report_finalized': return 'Finalized';
    case 'report_drafted': return 'Drafted';
    case 'verification_in_progress': return 'Verifying';
    case 'report_verified': return 'Verified';
    case 'report_rejected': return 'Rejected';
    default: return status || 'Unknown';
  }
};

// ✅ VERIFICATION STATUS DOT
const StatusDot = ({ status, priority }) => {
  const getStatusInfo = () => {
    if (priority === 'EMERGENCY') return { color: 'bg-red-500', pulse: true };
    
    switch (status) {
      case 'report_finalized':
      case 'report_drafted':
        return { color: 'bg-blue-500', pulse: false };
      case 'verification_in_progress':
        return { color: 'bg-yellow-500', pulse: true };
      case 'report_verified':
        return { color: 'bg-green-500', pulse: false };
      case 'report_rejected':
        return { color: 'bg-red-500', pulse: false };
      default:
        return { color: 'bg-gray-400', pulse: false };
    }
  };

  const { color, pulse } = getStatusInfo();
  
  return (
    <div 
      className={`w-2.5 h-2.5 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
      title={formatWorkflowStatus(status)}
    />
  );
};

// ✅ UPDATED: Verification action buttons with OHIF + Reporting
const VerificationActions = ({ study, onViewReport, onOpenOHIFReporting }) => {
  const canVerify = ['report_finalized', 'report_drafted'].includes(study.workflowStatus);
  const isVerified = study.workflowStatus === 'report_verified';
  const isRejected = study.workflowStatus === 'report_rejected';

  return (
    <div className="flex items-center space-x-1">
      {/* View Report */}
      <button 
        className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
        title="View Report"
        onClick={() => onViewReport && onViewReport(study)}
      >
        <FileText className="w-3.5 h-3.5" />
      </button>

      {/* DICOM Viewer */}
      <button 
        className="p-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" 
        title="DICOM Viewer"
        onClick={() => {
          const ohifUrl = `/ohif/viewer?StudyInstanceUIDs=${study.studyInstanceUID || study._id}`;
          window.open(ohifUrl, '_blank');
        }}
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {/* ✅ NEW: OHIF + Reporting Button (replaces verify modal) */}
      {canVerify && (
        <button 
          className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors" 
          title="Open OHIF + Reporting for Verification"
          onClick={() => onOpenOHIFReporting && onOpenOHIFReporting(study)}
        >
          OHIF + Reporting
        </button>
      )}

      {/* Status Indicators */}
      {isVerified && (
        <div className="p-1 text-green-600" title="Verified">
          <CheckCircle className="w-3.5 h-3.5 fill-current" />
        </div>
      )}

      {isRejected && (
        <div className="p-1 text-red-600" title="Rejected">
          <XCircle className="w-3.5 h-3.5 fill-current" />
        </div>
      )}
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

// ✅ STUDY ROW FOR VERIFICATION
const StudyRow = ({ index, style, data }) => {
  const { studies, visibleColumns, selectedStudies, callbacks } = data;
  const study = studies[index];

  if (!study) return null;

  const isSelected = selectedStudies?.includes(study._id);
  const isEmergency = study.priority === 'EMERGENCY';
  
  const rowClasses = `flex items-center w-full h-full text-xs border-b border-gray-300 transition-all duration-150 hover:bg-gray-50 ${
    isSelected ? 'bg-blue-50 border-blue-200' : 
    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
  } ${isEmergency ? 'bg-red-50 border-red-200' : ''}`;

  // ✅ HANDLE USER ICON CLICK - Opens detailed view
  const handleUserIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (callbacks.onShowDetailedView) {
      callbacks.onShowDetailedView(study._id);
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
              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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

        {/* ✅ PATIENT ID */}
        {visibleColumns.patientId && (
          <div className="flex-1 min-w-[100px] px-2 flex items-center border-r border-gray-200">
            <button 
              className={`text-blue-600 font-medium hover:underline truncate transition-colors ${
                isEmergency ? 'text-red-700' : ''
              }`}
              onClick={handleUserIconClick}
            >
              {study.patientId || study.patientInfo?.patientID || 'N/A'}
              {isEmergency && (
                <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-bold bg-red-600 text-white">
                  🚨
                </span>
              )}
            </button>
          </div>
        )}

        {/* ✅ PATIENT NAME */}
        {visibleColumns.patientName && (
          <div className="flex-1 min-w-[120px] px-2 flex items-center border-r border-gray-200">
            <div className={`font-medium truncate ${isEmergency ? 'text-red-900' : 'text-gray-900'}`}>
              {study.patientName || study.patientInfo?.patientName || 'Unknown Patient'}
            </div>
          </div>
        )}

        {/* ✅ AGE/SEX */}
        {visibleColumns.ageGender && (
          <div className="flex-shrink-0 w-16 px-1 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center text-xs ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {study.patientInfo?.age || 'N/A'} / {study.patientInfo?.gender || 'N/A'}
            </div>
          </div>
        )}

        {/* ✅ MODALITY */}
        {visibleColumns.modality && (
          <div className="flex-shrink-0 w-16 px-1 flex items-center justify-center border-r border-gray-200">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              isEmergency ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'
            }`}>
              {study.modality || 'N/A'}
            </span>
          </div>
        )}

        {/* ✅ STUDY DATE */}
        {visibleColumns.studyDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              <div className="font-medium text-xs">{formatDate(study.studyDate)}</div>
              <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                {formatTime(study.studyDate)}
              </div>
            </div>
          </div>
        )}

        {/* ✅ REPORTED DATE - Fixed to use proper data source */}
        {visibleColumns.reportedDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {/* ✅ FIXED: Use the correct field path for reported date */}
              {study.reportInfo?.finalizedAt || study._raw?.reportInfo?.finalizedAt ? (
                <>
                  <div className="font-medium text-xs">
                    {formatDate(study.reportInfo?.finalizedAt || study._raw?.reportInfo?.finalizedAt)}
                  </div>
                  <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                    {formatTime(study.reportInfo?.finalizedAt || study._raw?.reportInfo?.finalizedAt)}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-xs">Not reported</div>
              )}
            </div>
          </div>
        )}

        {/* ✅ REPORTED BY - Fixed to use proper data source */}
        {visibleColumns.reportedBy && (
          <div className="flex-1 min-w-[120px] px-2 flex items-center border-r border-gray-200">
            <div className={`text-xs ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {/* ✅ FIXED: Check multiple sources for reported by info */}
              {(() => {
                // Priority 1: Formatted reportedBy from studyFormatter
                if (study.reportedBy) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={study.reportedBy}>
                        Dr. {study.reportedBy}
                      </div>
                      {study.reportedByRole && (
                        <div className="text-xs text-gray-500 capitalize">
                          {study.reportedByRole}
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Priority 2: Raw data reporterName
                if (study._raw?.reportInfo?.reporterName) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={study._raw.reportInfo.reporterName}>
                        {study._raw.reportInfo.reporterName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Radiologist
                      </div>
                    </div>
                  );
                }
                
                // Priority 3: Check _reportCreator
                if (study._raw?._reportCreator?.fullName) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={study._raw._reportCreator.fullName}>
                        {study._raw._reportCreator.fullName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {/* {study._raw._reportCreator.role || 'Radiologist'} */}
                      </div>
                    </div>
                  );
                }
                
                // Priority 4: Check assignment info
                if (study._raw?.assignment?.[0]?.assignedTo?.fullName) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={study._raw.assignment[0].assignedTo.fullName}>
                        {study._raw.assignment[0].assignedTo.fullName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {/* {study._raw.assignment[0].assignedTo.role || 'Radiologist'} */}
                      </div>
                    </div>
                  );
                }
                
                return <div className="text-gray-400">N/A</div>;
              })()}
            </div>
          </div>
        )}

        {/* ✅ VERIFIED DATE - Fixed to use proper data source */}
        {visibleColumns.verifiedDate && (
          <div className="flex-1 min-w-[80px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className={`text-center ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {/* ✅ FIXED: Use the correct field path for verified date */}
              {study._raw?.reportInfo?.verificationInfo?.verifiedAt ? (
                <>
                  <div className="font-medium text-xs">
                    {formatDate(study._raw.reportInfo.verificationInfo.verifiedAt)}
                  </div>
                  <div className={`text-xs ${isEmergency ? 'text-red-500' : 'text-gray-500'}`}>
                    {formatTime(study._raw.reportInfo.verificationInfo.verifiedAt)}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-xs">Not verified</div>
              )}
            </div>
          </div>
        )}

        {/* ✅ VERIFIED BY - Fixed to use proper data source */}
        {visibleColumns.verifiedBy && (
          <div className="flex-1 min-w-[120px] px-2 flex items-center border-r border-gray-200">
            <div className={`text-xs ${isEmergency ? 'text-red-700' : 'text-gray-600'}`}>
              {/* ✅ FIXED: Check multiple sources for verified by info */}
              {(() => {
                // Priority 1: Formatted verifiedBy from studyFormatter
                if (study.verifiedBy) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={study.verifiedBy}>
                        {study.verifiedBy}
                      </div>
                      {/* {study.verifiedByRole && (
                        <div className="text-xs text-gray-500 capitalize">
                          {study.verifiedByRole}
                        </div>
                      )} */}
                      {/* {study.verificationNotes && (
                        <div 
                          className="text-xs text-blue-600 truncate max-w-[100px]" 
                          title={study.verificationNotes}
                        >
                          📝 {study.verificationNotes}
                        </div>
                      )} */}
                    </div>
                  );
                }
                
                // Priority 2: Raw verification data (populated object)
                const verifiedBy = study._raw?.reportInfo?.verificationInfo?.verifiedBy;
                if (verifiedBy && typeof verifiedBy === 'object' && verifiedBy.fullName) {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={verifiedBy.fullName}>
                        {verifiedBy.fullName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {verifiedBy.role || 'Verifier'}
                      </div>
                      {study._raw?.reportInfo?.verificationInfo?.verificationNotes && (
                        <div 
                          className="text-xs text-blue-600 truncate max-w-[100px]" 
                          title={study._raw.reportInfo.verificationInfo.verificationNotes}
                        >
                          📝 Notes
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Priority 3: Raw verification data (just ID)
                if (verifiedBy && typeof verifiedBy === 'string') {
                  return (
                    <div className="space-y-0.5">
                      <div className="font-medium truncate" title={`User ${verifiedBy.substring(0, 8)}...`}>
                        User {verifiedBy.substring(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        Verifier
                      </div>
                    </div>
                  );
                }
                
                return <div className="text-gray-400">N/A</div>;
              })()}
            </div>
          </div>
        )}

        {/* ✅ VERIFICATION STATUS - Enhanced with proper status detection */}
        {visibleColumns.verificationStatus && (
          <div className="flex-1 min-w-[100px] px-2 flex items-center justify-center border-r border-gray-200">
            <div className="flex items-center space-x-1">
              <StatusDot status={study.workflowStatus} priority={study.priority} />
              {/* ✅ FIXED: Use proper verification status */}
              <span className={`text-xs font-medium ${
                study._raw?.reportInfo?.verificationInfo?.verificationStatus === 'verified' || study.workflowStatus === 'report_verified' ? 'text-green-600' :
                study._raw?.reportInfo?.verificationInfo?.verificationStatus === 'rejected' || study.workflowStatus === 'report_rejected' ? 'text-red-600' :
                study.workflowStatus === 'verification_in_progress' ? 'text-blue-600' :
                'text-gray-500'
              }`}>
                {(() => {
                  // Use verification status from reportInfo if available
                  const verificationStatus = study._raw?.reportInfo?.verificationInfo?.verificationStatus;
                  if (verificationStatus) {
                    switch (verificationStatus) {
                      case 'verified': return 'Verified';
                      case 'rejected': return 'Rejected';
                      case 'in_progress': return 'In Progress';
                      case 'pending': return 'Pending';
                      default: return verificationStatus;
                    }
                  }
                  
                  // Fallback to workflow status
                  switch (study.workflowStatus) {
                    case 'report_verified': return 'Verified';
                    case 'report_rejected': return 'Rejected';
                    case 'verification_in_progress': return 'In Progress';
                    case 'report_finalized':
                    case 'report_drafted': return 'Pending';
                    default: return 'Unknown';
                  }
                })()}
              </span>
            </div>
          </div>
        )}

        {/* ✅ VERIFICATION ACTIONS */}
        {visibleColumns.actions && (
          <div className="flex-shrink-0 w-24 px-1 flex items-center justify-center">
            <VerificationActions 
              study={study} 
              onViewReport={callbacks.onViewReport}
              onOpenOHIFReporting={callbacks.onOpenOHIFReporting}
            />
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
  onVerifyComplete
}) => {
  
  const navigate = useNavigate();
  
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

  const visibleColumns = useMemo(() => {
    const visible = {};
    for (const key in columnConfig) {
      if (columnConfig[key]?.visible) {
        visible[key] = true;
      }
    }
    return visible;
  }, [columnConfig]);

  // ✅ NEW: Detailed view handlers
  const handleShowDetailedView = useCallback((studyId) => {
    setDetailedView({
      show: true,
      studyId: studyId
    });
  }, []);

  const handleCloseDetailedView = useCallback(() => {
    setDetailedView({
      show: false,
      studyId: null
    });
  }, []);

  // ✅ NEW: Report modal handlers
  const handleViewReport = useCallback((study) => {
    setReportModal({
      show: true,
      studyId: study._id,
      studyData: {
        patientName: study.patientName || study.patientInfo?.patientName,
        patientId: study.patientId || study.patientInfo?.patientID,
        studyDate: study.studyDate,
        modality: study.modality
      }
    });
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setReportModal({
      show: false,
      studyId: null,
      studyData: null
    });
  }, []);

  // ✅ NEW: OHIF + Reporting handler (replaces verify modal)
  const handleOpenOHIFReporting = useCallback((study) => {
    console.log('🌐 [Verifier] Opening OHIF + Reporting for verification:', study._id);
    
    // ✅ UPDATED: Use openOHIF=true to ensure OHIF version loads
    navigate(`/online-reporting/${study._id}?openOHIF=true&verifier=true&verification=true`);
    
    toast.success('Opening OHIF + Reporting for verification...', { 
      icon: '🔍',
      duration: 3000
    });
  }, [navigate]);

  const virtualListData = useMemo(() => ({
    studies,
    visibleColumns,
    selectedStudies,
    callbacks: { 
      onSelectStudy, 
      onPatienIdClick, 
      onShowDetailedView: handleShowDetailedView,
      onViewReport: handleViewReport,
      onOpenOHIFReporting: handleOpenOHIFReporting
    }
  }), [studies, visibleColumns, selectedStudies, onSelectStudy, onPatienIdClick, handleShowDetailedView, handleViewReport, handleOpenOHIFReporting]);

  const allSelected = studies?.length > 0 && selectedStudies?.length === studies?.length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">Loading studies...</p>
        </div>
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No studies found</h3>
          <p className="text-sm">No reports available for verification</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white relative">
      
      {/* ✅ VERIFICATION HEADER */}
      <div className="flex items-center bg-gray-100 border-b border-gray-300 text-xs font-bold text-gray-800 uppercase tracking-wide sticky top-0 z-10 flex-shrink-0">
        
        {visibleColumns.checkbox && (
          <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={allSelected}
              onChange={(e) => onSelectAll?.(e.target.checked)}
            />
          </div>
        )}

        {visibleColumns.workflowStatus && (
          <div className="flex-shrink-0 w-8 px-1 py-2.5 text-center border-r border-gray-300">
            Status
          </div>
        )}
        
        {/* ✅ DATA HEADERS */}
        {visibleColumns.patientId && <div className="flex-1 min-w-[100px] px-2 py-2.5 border-r border-gray-300">Patient ID</div>}
        {visibleColumns.patientName && <div className="flex-1 min-w-[120px] px-2 py-2.5 border-r border-gray-300">Patient Name</div>}
        {visibleColumns.ageGender && <div className="flex-shrink-0 w-16 px-1 py-2.5 text-center border-r border-gray-300">Age/Sex</div>}
        {visibleColumns.modality && <div className="flex-shrink-0 w-16 px-1 py-2.5 text-center border-r border-gray-300">Modality</div>}
        {visibleColumns.studyDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Study Date</div>}
        {visibleColumns.reportedDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Reported Date</div>}
        {visibleColumns.reportedBy && <div className="flex-1 min-w-[100px] px-2 py-2.5 border-r border-gray-300">Reported By</div>}
        {visibleColumns.verifiedDate && <div className="flex-1 min-w-[80px] px-2 py-2.5 text-center border-r border-gray-300">Verified Date</div>}
        {visibleColumns.verifiedBy && <div className="flex-1 min-w-[100px] px-2 py-2.5 border-r border-gray-300">Verified By</div>}
        {visibleColumns.verificationStatus && <div className="flex-1 min-w-[80px] px-2 py-2.5 border-r border-gray-300">Status</div>}
        {visibleColumns.actions && <div className="flex-shrink-0 w-24 px-1 py-2.5 text-center">Actions</div>}
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

      {/* ✅ DETAILED VIEW MODAL */}
      {detailedView.show && (
        <StudyDetailedView
          studyId={detailedView.studyId}
          onClose={handleCloseDetailedView}
        />
      )}

      {/* ✅ REPORT MODAL */}
      {reportModal.show && (
        <ReportModal
          isOpen={reportModal.show}
          studyId={reportModal.studyId}
          studyData={reportModal.studyData}
          onClose={handleCloseReportModal}
        />
      )}
    </div>
  );
};

export default WorklistTable;