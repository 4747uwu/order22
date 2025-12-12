// client/src/utils/studyFormatter.js

export const formatStudyForWorklist = (rawStudy) => {
  try {
    // ✅ BHARAT PACS ID
    const bharatPacsId = rawStudy.bharatPacsId || 'N/A';

    // ✅ ORGANIZATION INFO - from populated organization
    const organizationName = rawStudy.organization?.name || 
                            rawStudy.organizationIdentifier || 
                            'Unknown Organization';

    // ✅ CENTER/LAB INFO - from populated sourceLab
    const centerName = rawStudy.sourceLab?.name || 
                      rawStudy.sourceLab?.labName || 
                      rawStudy.sourceLab?.location || 
                      'Unknown Center';

    // ✅ PATIENT INFO - handle multiple possible sources
    const patientName = rawStudy.patientInfo?.patientName ||
                       rawStudy.patient?.patientNameRaw || 
                       (rawStudy.patient?.firstName || '') + ' ' + (rawStudy.patient?.lastName || '') ||
                       'Unknown Patient';
    
    const patientId = rawStudy.patient?.patientID || 
                     rawStudy.patientId || 
                     rawStudy.patientInfo?.patientID ||
                     'N/A';

    // ✅ AGE/GENDER FORMATTING
    const age = rawStudy.patient?.age || 
                rawStudy.patientInfo?.age || 
                'N/A';
    const gender = rawStudy.patient?.gender || 
                   rawStudy.patientInfo?.gender || 
                   'N/A';
    const ageGender = age !== 'N/A' && gender !== 'N/A' ? 
                     `${age}${gender.charAt(0).toUpperCase()}` : 
                     'N/A';

    // ✅ MODALITY
    const modality = rawStudy.modalitiesInStudy?.length > 0 ? 
                    rawStudy.modalitiesInStudy.join(', ') : 
                    (rawStudy.modality || 'N/A');

    // ✅ SERIES COUNT
    const seriesCount = rawStudy.seriesCount || 0;
    const seriesImages = `${rawStudy.seriesCount || 0}/${rawStudy.instanceCount || 0}`;

    // ✅ ACCESSION NUMBER
    const accessionNumber = rawStudy.accessionNumber || 'N/A';

    // ✅ REFERRAL NUMBER (from referring physician or accession)
    const referralNumber = rawStudy.referringPhysician?.contactInfo || 
                          rawStudy.physicians?.referring?.mobile ||
                          rawStudy.accessionNumber || 
                          'N/A';

    // ✅ CLINICAL HISTORY
    const clinicalHistory = rawStudy.clinicalHistory?.clinicalHistory || 
                           'No history provided';

    // ✅ STUDY TIME
    const studyTime = rawStudy.studyTime || 'N/A';
    const studyDate = rawStudy.studyDate ? 
                     new Date(rawStudy.studyDate).toLocaleDateString('en-US', {
                       month: 'short',
                       day: '2-digit',
                       year: 'numeric'
                     }) : 'N/A';

    // ✅ UPLOAD TIME
    const uploadTime = rawStudy.createdAt ? 
                      new Date(rawStudy.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }) : 'N/A';

    // ✅ RADIOLOGIST INFO - from assignment or category tracking
    const getRadiologistInfo = (study) => {
      // Method 1: From category tracking (most recent)
      if (study.categoryTracking?.assigned?.assignedTo) {
        const assignee = study.categoryTracking.assigned.assignedTo;
        return {
          radiologistName: assignee.fullName || `${assignee.firstName} ${assignee.lastName}`,
          radiologistEmail: assignee.email,
          radiologistRole: assignee.role
        };
      }

      // Method 2: From assignment array (latest)
      if (study.assignment?.length > 0) {
        const latestAssignment = study.assignment
          .filter(a => a.assignedTo)
          .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0];
        
        if (latestAssignment?.assignedTo) {
          const assignee = latestAssignment.assignedTo;
          if (typeof assignee === 'object') {
            return {
              radiologistName: assignee.fullName || `${assignee.firstName} ${assignee.lastName}`,
              radiologistEmail: assignee.email,
              radiologistRole: assignee.role
            };
          }
        }
      }

      // Method 3: From current report status
      if (study.currentReportStatus?.lastReportedBy) {
        const reporter = study.currentReportStatus.lastReportedBy;
        return {
          radiologistName: reporter.fullName || `${reporter.firstName} ${reporter.lastName}`,
          radiologistEmail: reporter.email,
          radiologistRole: reporter.role
        };
      }

      return {
        radiologistName: 'Unassigned',
        radiologistEmail: null,
        radiologistRole: null
      };
    };

    const radiologistInfo = getRadiologistInfo(rawStudy);

    // ✅ CASE STATUS - comprehensive workflow status
    const getCaseStatus = (study) => {
      // Priority cases
      if (study.studyPriority === 'Emergency Case' || 
          study.caseType === 'emergency' ||
          study.currentCategory === 'URGENT') {
        return {
          status: 'URGENT',
          category: study.currentCategory || 'URGENT',
          workflowStatus: study.workflowStatus,
          color: 'red'
        };
      }

      // Check current category
      const categoryMap = {
        'CREATED': { label: 'Study Created', color: 'blue' },
        'HISTORY_CREATED': { label: 'History Added', color: 'cyan' },
        'UNASSIGNED': { label: 'Pending Assignment', color: 'orange' },
        'ASSIGNED': { label: 'Assigned', color: 'purple' },
        'PENDING': { label: 'In Progress', color: 'yellow' },
        'DRAFT': { label: 'Draft Report', color: 'amber' },
        'VERIFICATION_PENDING': { label: 'Verification Pending', color: 'indigo' },
        'FINAL': { label: 'Finalized', color: 'green' },
        'REPRINT_NEED': { label: 'Reprint Required', color: 'red' }
      };

      const categoryInfo = categoryMap[study.currentCategory] || categoryMap['CREATED'];

      return {
        status: categoryInfo.label,
        category: study.currentCategory,
        workflowStatus: study.workflowStatus,
        color: categoryInfo.color
      };
    };

    const caseStatus = getCaseStatus(rawStudy);

    // ✅ STUDY LOCK INFO
    const isLocked = rawStudy.studyLock?.isLocked || false;
    const lockedBy = rawStudy.studyLock?.lockedByName || null;
    const lockedAt = rawStudy.studyLock?.lockedAt || null;


    // ✅ HAS NOTES / ATTACHMENTS FLAGS (prefer explicit DB flags, fallback to arrays)
    const hasStudyNotes = rawStudy.hasStudyNotes === true || (rawStudy.discussions && rawStudy.discussions.length > 0);
    const attachments = rawStudy.attachments || [];
    const hasAttachments = rawStudy.hasAttachments === true || attachments.length > 0;

    // ✅ ASSIGNMENT INFO - handle multiple active assignments
    const assignmentInfo = formatAssignmentInfo(rawStudy.assignment);

    // ✅ VERIFICATION INFO
    const verificationInfo = getVerificationInfo(rawStudy);
    const verificationNotes = rawStudy.reportInfo?.verificationInfo?.rejectionReason || '-'

    // ✅ PRINT HISTORY
    const printCount = rawStudy.printHistory?.length || 0;
    const lastPrint = rawStudy.printHistory?.[rawStudy.printHistory.length - 1];

    return {
      _id: rawStudy._id,
      studyInstanceUID: rawStudy.studyInstanceUID,
      orthancStudyID: rawStudy.orthancStudyID,
      
      // ✅ NEW FIELDS
      bharatPacsId,
      organizationName,
      centerName,
      
      // ✅ PATIENT INFO
      patientId,
      patientName: patientName.trim() || 'Unknown Patient',
      patientAge: age,
      patientSex: gender,
      ageGender,
      
      // ✅ STUDY INFO
      modality,
      seriesCount,
      instanceCount: rawStudy.instanceCount || 0,
      seriesImages,
      accessionNumber,
      referralNumber,
      clinicalHistory,
      studyDescription: rawStudy.studyDescription || rawStudy.examDescription || 'No Description',
      
      // ✅ DATES & TIMES
      studyDate,
      studyTime,
      uploadTime,
      uploadDate: rawStudy.createdAt,
      createdAt: rawStudy.createdAt,
      
      // ✅ RADIOLOGIST INFO
      radiologist: radiologistInfo.radiologistName,
      radiologistEmail: radiologistInfo.radiologistEmail,
      radiologistRole: radiologistInfo.radiologistRole,
      
      // ✅ CASE STATUS
      caseStatus: caseStatus.status,
      caseStatusCategory: caseStatus.category,
      caseStatusColor: caseStatus.color,
      workflowStatus: caseStatus.workflowStatus,
      
      // ✅ STUDY LOCK
      isLocked,
      lockedBy,
      lockedAt,
      
      // ✅ NOTES / ATTACHMENTS FLAGS
      hasStudyNotes,
      hasAttachments,
      
      // ✅ ASSIGNMENT INFO
      isAssigned: assignmentInfo.isAssigned,
      assignedTo: assignmentInfo.assignedToDisplay,
      assignedToIds: assignmentInfo.assignedToIds,
      assignedCount: assignmentInfo.assignedCount,
      assignedDoctors: assignmentInfo.assignedDoctors,
      assignedAt: assignmentInfo.latestAssignedAt,
      assignmentPriority: assignmentInfo.priority,
      dueDate: assignmentInfo.latestDueDate,
      
      // ✅ VERIFICATION
      verificationStatus: verificationInfo.verificationStatus,
      verifiedBy: verificationInfo.verifiedBy,
      verifiedAt: verificationInfo.verifiedAt,
      verificationNotes: verificationNotes
,
      
      // ✅ PRINT INFO
      printCount,
      lastPrintedAt: lastPrint?.printedAt,
      lastPrintedBy: lastPrint?.printedByName,
      lastPrintType: lastPrint?.printType,
      
      // ✅ TECHNICAL
      priority: rawStudy.priority || rawStudy.studyPriority || 'NORMAL',
      organizationIdentifier: rawStudy.organizationIdentifier,
      
      // ✅ CATEGORY TRACKING
      categoryTracking: {
        currentCategory: rawStudy.currentCategory,
        created: rawStudy.categoryTracking?.created,
        historyCreated: rawStudy.categoryTracking?.historyCreated,
        assigned: rawStudy.categoryTracking?.assigned,
        final: rawStudy.categoryTracking?.final,
        urgent: rawStudy.categoryTracking?.urgent,
        reprint: rawStudy.categoryTracking?.reprint
      },
      
      // ✅ KEEP RAW DATA for debugging
      _raw: rawStudy,
      _verificationInfo: verificationInfo,
      _radiologistInfo: radiologistInfo,
      _assignmentInfo: assignmentInfo,
      attachments: attachments,
      hasAttachments: hasAttachments
    };
  } catch (error) {
    console.error('Error formatting study:', error);
    return {
      _id: rawStudy._id,
      bharatPacsId: 'ERROR',
      patientId: 'ERROR',
      patientName: 'Formatting Error',
      _raw: rawStudy
    };
  }
};

// ✅ VERIFICATION INFO EXTRACTOR
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
  
  let verifiedBy = null;
  let verifiedByEmail = null;
  let verifiedByRole = null;
  
  if (verificationInfo.verifiedBy) {
    if (typeof verificationInfo.verifiedBy === 'object') {
      verifiedBy = verificationInfo.verifiedBy.fullName || 
                  `${verificationInfo.verifiedBy.firstName} ${verificationInfo.verifiedBy.lastName}`;
      verifiedByEmail = verificationInfo.verifiedBy.email;
      verifiedByRole = verificationInfo.verifiedBy.role;
    } else {
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

// ✅ ASSIGNMENT INFO FORMATTER
const formatAssignmentInfo = (assignmentArray) => {
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
  
  const activeAssignments = assignmentArray.filter(assignment => {
    const hasAssignedTo = assignment.assignedTo && 
                         (typeof assignment.assignedTo === 'object' ? assignment.assignedTo._id : assignment.assignedTo);
    return hasAssignedTo && assignment.assignedAt;
  });

  if (activeAssignments.length === 0) {
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

  const sortedAssignments = activeAssignments.sort((a, b) => 
    new Date(b.assignedAt) - new Date(a.assignedAt)
  );

  const assignedDoctors = sortedAssignments.map(assignment => {
    const assignedTo = assignment.assignedTo;
    
    let doctorInfo;
    if (typeof assignedTo === 'object' && assignedTo._id) {
      doctorInfo = {
        id: assignedTo._id.toString(),
        name: assignedTo.fullName || `${assignedTo.firstName || ''} ${assignedTo.lastName || ''}`.trim(),
        email: assignedTo.email,
        role: assignedTo.role
      };
    } else if (typeof assignedTo === 'string') {
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

  const uniqueDoctors = assignedDoctors.filter((doctor, index, self) => 
    index === self.findIndex(d => d.id === doctor.id)
  );

  const assignedToIds = uniqueDoctors.map(doctor => doctor.id);
  const assignedToDisplay = uniqueDoctors.length === 1 
    ? uniqueDoctors[0].name
    : `${uniqueDoctors.length} Doctors`;

  const latestAssignment = sortedAssignments[0];

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