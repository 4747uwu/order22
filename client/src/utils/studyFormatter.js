// client/src/utils/studyFormatter.js

export const formatStudyForWorklist = (rawStudy) => {
  try {
    // ✅ PATIENT INFO - handle multiple possible sources
    const patientName = rawStudy.patientInfo?.patientName ||
                       rawStudy.patientData?.patientNameRaw || 
                       (rawStudy.patientData?.firstName || '') + ' ' + (rawStudy.patientData?.lastName || '')
                       
    
    const patientId = rawStudy.patientData?.patientID || 
                     rawStudy.patientId || 
                     rawStudy.patientInfo?.patientID ||
                     'N/A';

    // ✅ AGE/GENDER FORMATTING
    const age = rawStudy.patientData?.ageString || 
                rawStudy.patientInfo?.age || 
                'N/A';
    const gender = rawStudy.patientData?.gender || 
                   rawStudy.patientInfo?.gender || 
                   'N/A';
    const ageGender = age !== 'N/A' && gender !== 'N/A' ? 
                     `${age}${gender.charAt(0).toUpperCase()}` : 
                     'N/A';

    // ✅ STUDY INFO
    const studyDescription = rawStudy.studyDescription || 
                            rawStudy.examDescription || 
                            'No Description';
    
    const modality = rawStudy.modalitiesInStudy?.length > 0 ? 
                    rawStudy.modalitiesInStudy.join(', ') : 
                    (rawStudy.modality || 'N/A');

    // ✅ LOCATION
    const location = rawStudy.labData?.name || 
                    rawStudy.labData?.location || 
                    'Unknown Location';

    // ✅ DATES
    const studyDate = rawStudy.studyDate ? 
                     new Date(rawStudy.studyDate).toLocaleDateString('en-US', {
                       month: 'short',
                       day: '2-digit',
                       year: 'numeric'
                     }) : 'N/A';

    const uploadDate = rawStudy.createdAt ? 
                      new Date(rawStudy.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }) : 'N/A';

    // ✅ FIXED: ASSIGNMENT INFO - handle multiple active assignments
    const assignmentInfo = formatAssignmentInfo(rawStudy.assignment);
    
    // ✅ SERIES/INSTANCES
    const seriesImages = `${rawStudy.seriesCount || 0}/${rawStudy.instanceCount || 0}`;

    // ✅ ENHANCED: Extract reported information with multiple fallbacks
    const getReportedInfo = (study) => {
      // Method 1: From modern reports creator info
      if (study._reportCreator) {
        return {
          reportedBy: study._reportCreator.fullName || study._reportCreator.name,
          reportedByEmail: study._reportCreator.email,
          reportedByRole: study._reportCreator.role
        };
      }
      
      // Method 2: From reportInfo.reporterName
      if (study.reportInfo?.reporterName) {
        return {
          reportedBy: study.reportInfo.reporterName,
          reportedByEmail: null,
          reportedByRole: 'radiologist'
        };
      }
      
      // Method 3: From first assignment
      if (study.assignment?.[0]?.assignedTo) {
        const assignee = study.assignment[0].assignedTo;
        return {
          reportedBy: assignee.fullName || assignee.name,
          reportedByEmail: assignee.email,
          reportedByRole: assignee.role
        };
      }
      
      return {
        reportedBy: null,
        reportedByEmail: null,
        reportedByRole: null
      };
    };

    // ✅ ENHANCED: Extract verification information with proper population
    const getVerificationInfo = (study) => {
      const verificationInfo = study.reportInfo?.verificationInfo;
      
      if (!verificationInfo) {
        return {
          verifiedBy: null,
          verifiedByEmail: null,
          verifiedByRole: null,
          verifiedAt: null,
          verificationStatus: 'pending',
          verificationNotes: null
        };
      }
      
      // Check if verifiedBy is populated (object) or just an ID (string)
      let verifiedBy = null;
      let verifiedByEmail = null;
      let verifiedByRole = null;
      
      if (verificationInfo.verifiedBy) {
        if (typeof verificationInfo.verifiedBy === 'object') {
          // Populated user object
          verifiedBy = verificationInfo.verifiedBy.fullName || verificationInfo.verifiedBy.name;
          verifiedByEmail = verificationInfo.verifiedBy.email;
          verifiedByRole = verificationInfo.verifiedBy.role;
        } else {
          // Just an ObjectId - not populated
          verifiedBy = `User ${verificationInfo.verifiedBy.toString().substring(0, 8)}...`;
          verifiedByRole = 'verifier';
        }
      }
      
      return {
        verifiedBy,
        verifiedByEmail,
        verifiedByRole,
        verifiedAt: verificationInfo.verifiedAt,
        verificationStatus: verificationInfo.verificationStatus || 'pending',
        verificationNotes: verificationInfo.verificationNotes
      };
    };

    // ✅ GET EXTRACTED INFO
    const reportedInfo = getReportedInfo(rawStudy);
    const verificationInfo = getVerificationInfo(rawStudy);

    // ✅ ENHANCED: Format dates with proper fallbacks
    const reportedDate = rawStudy.reportInfo?.finalizedAt || 
                        rawStudy.reportInfo?.downloadedAt || 
                        rawStudy.reportInfo?.startedAt ||
                        null;

    return {
      _id: rawStudy._id,
      studyInstanceUID: rawStudy.studyInstanceUID,
      orthancStudyID: rawStudy.orthancStudyID,
      
      // ✅ FORMATTED PATIENT INFO
      patientId,
      patientName: patientName.trim() || 'Unknown Patient',
      patientAge: age,
      patientSex: gender,
      ageGender,
      
      // ✅ FORMATTED STUDY INFO
      studyDescription,
      modality,
      seriesCount: rawStudy.seriesCount || 0,
      instanceCount: rawStudy.instanceCount || 0,
      seriesImages,
      
      // ✅ FORMATTED DATES
      studyDate,
      studyTime: rawStudy.studyTime,
      uploadDate,
      createdAt: rawStudy.createdAt,
      
      // ✅ ENHANCED: Reported information with proper population
      reportedDate: reportedDate ? new Date(reportedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }) : null,
      reportedBy: reportedInfo.reportedBy,
      reportedByEmail: reportedInfo.reportedByEmail,
      reportedByRole: reportedInfo.reportedByRole,
      
      // ✅ ENHANCED: Verification information with proper population
      verifiedDate: verificationInfo.verifiedAt ? new Date(verificationInfo.verifiedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }) : null,
      verifiedBy: verificationInfo.verifiedBy,
      verifiedByEmail: verificationInfo.verifiedByEmail,
      verifiedByRole: verificationInfo.verifiedByRole,
      verificationStatus: verificationInfo.verificationStatus,
      verificationNotes: verificationInfo.verificationNotes,
      
      // ✅ DETAILED INFO: Raw verification data for debugging
      _verificationInfo: verificationInfo,
      _reportedInfo: reportedInfo,
      
      // ✅ LOCATION/LAB
      location,
      
      // ✅ WORKFLOW
      workflowStatus: rawStudy.workflowStatus,
      priority: rawStudy.priority || 'NORMAL',
      
      // ✅ ASSIGNMENT INFO - properly formatted for multiple assignments
      isAssigned: assignmentInfo.isAssigned,
      assignedTo: assignmentInfo.assignedToDisplay, // Display string for UI
      assignedToIds: assignmentInfo.assignedToIds, // Array of IDs for modal
      assignedCount: assignmentInfo.assignedCount,
      assignedDoctors: assignmentInfo.assignedDoctors, // Array of doctor objects
      assignedAt: assignmentInfo.latestAssignedAt,
      assignmentPriority: assignmentInfo.priority,
      dueDate: assignmentInfo.latestDueDate,
      assignmentStatus: assignmentInfo.status,
      
      // ✅ FULL ASSIGNMENT DATA for modal
      assignment: assignmentInfo,
      
      // ✅ TECHNICAL
      accessionNumber: rawStudy.accessionNumber || '',
      organizationIdentifier: rawStudy.organizationIdentifier,
      
      // ✅ KEEP RAW DATA for debugging
      _raw: rawStudy
    };
  } catch (error) {
    console.error('Error formatting study:', error);
    return {
      _id: rawStudy._id,
      patientId: 'ERROR',
      patientName: 'Formatting Error',
      _raw: rawStudy
    };
  }
};

// ✅ IMPROVED: Assignment info formatter to handle populated assignment data
const formatAssignmentInfo = (assignmentArray) => {
  console.log('🔍 FORMATTING ASSIGNMENTS:', assignmentArray);
  
  if (!assignmentArray || !Array.isArray(assignmentArray) || assignmentArray.length === 0) {
    return {
      isAssigned: false,
      assignedToDisplay: null,
      assignedToIds: [],
      assignedCount: 0,
      assignedDoctors: [],
      latestAssignedAt: null,
      priority: null,
      latestDueDate: null,
      status: null
    };
  }
  
  // ✅ FIX: Handle populated assignment objects properly
  const activeAssignments = assignmentArray.filter(assignment => {
    // Check if assignment has valid assignedTo
    const hasAssignedTo = assignment.assignedTo && 
                         (typeof assignment.assignedTo === 'object' ? assignment.assignedTo._id : assignment.assignedTo);
    
    console.log('🔍 CHECKING ASSIGNMENT:', {
      hasAssignedTo,
      assignedTo: assignment.assignedTo,
      assignedAt: assignment.assignedAt
    });
    
    return hasAssignedTo && assignment.assignedAt;
  });

  if (activeAssignments.length === 0) {
    console.log('❌ NO ACTIVE ASSIGNMENTS FOUND');
    return {
      isAssigned: false,
      assignedToDisplay: null,
      assignedToIds: [],
      assignedCount: 0,
      assignedDoctors: [],
      latestAssignedAt: null,
      priority: null,
      latestDueDate: null,
      status: null
    };
  }

  // Sort by assignment date (most recent first)
  const sortedAssignments = activeAssignments.sort((a, b) => 
    new Date(b.assignedAt) - new Date(a.assignedAt)
  );

  // ✅ CREATE DOCTOR OBJECTS from populated data
  const assignedDoctors = sortedAssignments.map(assignment => {
    const assignedTo = assignment.assignedTo;
    
    // Handle both populated objects and ObjectIds
    let doctorInfo;
    if (typeof assignedTo === 'object' && assignedTo._id) {
      // Populated user object
      doctorInfo = {
        id: assignedTo._id.toString(),
        name: assignedTo.fullName || `${assignedTo.firstName || ''} ${assignedTo.lastName || ''}`.trim(),
        email: assignedTo.email,
        role: assignedTo.role
      };
    } else if (typeof assignedTo === 'string') {
      // ObjectId string
      doctorInfo = {
        id: assignedTo,
        name: 'Unknown Doctor',
        email: null,
        role: 'radiologist'
      };
    } else {
      doctorInfo = {
        id: 'unknown',
        name: 'Unknown Doctor',
        email: null,
        role: 'radiologist'
      };
    }

    return {
      ...doctorInfo,
      assignedAt: assignment.assignedAt,
      priority: assignment.priority || 'NORMAL',
      dueDate: assignment.dueDate,
      status: assignment.status || 'assigned'
    };
  });

  // Remove duplicates by doctor ID
  const uniqueDoctors = assignedDoctors.filter((doctor, index, self) => 
    index === self.findIndex(d => d.id === doctor.id)
  );

  const assignedToIds = uniqueDoctors.map(doctor => doctor.id);
  const assignedToDisplay = uniqueDoctors.length === 1 
    ? uniqueDoctors[0].name
    : `${uniqueDoctors.length} Doctors`;

  const latestAssignment = sortedAssignments[0];

  console.log('✅ FORMATTED ASSIGNMENT INFO:', {
    assignedCount: uniqueDoctors.length,
    assignedToIds,
    assignedToDisplay,
    doctors: uniqueDoctors.map(d => d.name)
  });

  return {
    isAssigned: true,
    assignedToDisplay,
    assignedToIds,
    assignedCount: uniqueDoctors.length,
    assignedDoctors: uniqueDoctors,
    latestAssignedAt: latestAssignment.assignedAt,
    priority: latestAssignment.priority || 'NORMAL',
    latestDueDate: latestAssignment.dueDate,
    status: 'assigned'
  };
};

export const formatStudiesForWorklist = (rawStudies) => {
  if (!Array.isArray(rawStudies)) {
    console.warn('formatStudiesForWorklist: input is not an array');
    return [];
  }
  
  console.log('🔄 FORMATTING STUDIES:', rawStudies.length);
  return rawStudies.map(formatStudyForWorklist);
};