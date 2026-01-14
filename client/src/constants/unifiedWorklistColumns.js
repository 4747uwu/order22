// ✅ UNIFIED WORKLIST COLUMNS - WITH DEFAULT WIDTHS
export const UNIFIED_WORKLIST_COLUMNS = {
  // ========== CORE ACTIONS ==========
  SELECTION: {
    id: 'selection',
    label: 'Select',
    description: 'Row selection checkbox',
    category: 'actions',
    tables: ['assignor', 'verifier'],
    alwaysVisible: true,
    defaultWidth: 50,
    minWidth: 40,
    maxWidth: 80
  },
  
  ACTIONS: {
    id: 'actions',
    label: 'Actions',
    description: 'Available actions',
    category: 'actions',
    tables: ['assignor', 'radiologist', 'verifier'],
    alwaysVisible: true,
    defaultWidth: 200,
    minWidth: 150,
    maxWidth: 300
  },

  // ========== COMMON CORE COLUMNS ==========
  BHARAT_PACS_ID: {
    id: 'bharatPacsId',
    label: 'Xcentic ID / BP ID',
    description: 'Unique study identifier',
    category: 'study',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 200
  },

  CENTER_NAME: {
    id: 'centerName',
    label: 'Sub Center / Center Name',
    description: 'Sub-center or lab location',
    category: 'lab',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 150,
    minWidth: 100,
    maxWidth: 250
  },

  TIMELINE: {
    id: 'timeline',
    label: 'Timeline',
    description: 'Study timeline and events',
    category: 'workflow',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 60,
    minWidth: 50,
    maxWidth: 80
  },

  PATIENT_NAME: {
    id: 'patientName',
    label: 'Patient Name / PT NAME',
    description: 'Full name of patient',
    category: 'patient',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 180,
    minWidth: 120,
    maxWidth: 800
  },

  PATIENT_ID: {
    id: 'patientId',
    label: 'Patient ID',
    description: 'Unique patient identifier',
    category: 'patient',
    tables: ['verifier'],
    defaultWidth: 120,
    minWidth: 80,
    maxWidth: 200
  },

  AGE_GENDER: {
    id: 'ageGender',
    label: 'Age/Sex',
    description: 'Patient age and gender',
    category: 'patient',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 80,
    minWidth: 60,
    maxWidth: 120
  },

  MODALITY: {
    id: 'modality',
    label: 'Modality',
    description: 'Imaging modality',
    category: 'study',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 90,
    minWidth: 70,
    maxWidth: 150
  },

  PRIORITY: {
    id: 'priority',
    label: 'Priority',
    description: 'Study priority level',
    category: 'workflow',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 90,
    minWidth: 70,
    maxWidth: 120
  },

  VIEW_ONLY: {
    id: 'viewOnly',
    label: 'View',
    description: 'View images only (Eye icon)',
    category: 'actions',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 60,
    minWidth: 50,
    maxWidth: 80
  },

  DOWNLOAD_VIEWER: {
    id: 'downloadViewer',
    label: 'Download/Viewer',
    description: 'Download and OHIF viewer',
    category: 'actions',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 150,
    minWidth: 120,
    maxWidth: 200
  },

  STUDY_SERIES_IMAGES: {
    id: 'studySeriesImages',
    label: 'Study/Series/Images',
    description: 'Study description and counts',
    category: 'study',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 200
  },

  PATIENT_ID_ACCESSION: {
    id: 'patientIdAccession',
    label: 'Patient ID / Acc. No.',
    description: 'Patient ID and accession number',
    category: 'patient',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 130,
    minWidth: 100,
    maxWidth: 200
  },

  ACCESSION_NUMBER: {
    id: 'accessionNumber',
    label: 'Accession Number',
    description: 'Study accession number',
    category: 'study',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 130,
    minWidth: 100,
    maxWidth: 200
  },

  REFERRAL_DOCTOR: {
    id: 'referralDoctor',
    label: 'Referral Doctor',
    description: 'Referring physician name',
    category: 'physician',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 250
  },

  REFERRING_PHYSICIAN: {
    id: 'referringPhysician',
    label: 'Referring Physician',
    description: 'Referring physician name',
    category: 'physician',
    tables: ['verifier'],
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 250
  },

  CLINICAL_HISTORY: {
    id: 'clinicalHistory',
    label: 'Clinical History',
    description: 'Patient clinical history',
    category: 'clinical',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 300,
    minWidth: 200,
    maxWidth: 600
  },

  STUDY_DATE: {
    id: 'studyDate',
    label: 'Study Date',
    description: 'When study was performed',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 110,
    minWidth: 90,
    maxWidth: 150
  },

  STUDY_TIME: {
    id: 'studyTime',
    label: 'Study Time',
    description: 'Time of study',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 90,
    minWidth: 70,
    maxWidth: 120
  },

  STUDY_DATE_TIME: {
    id: 'studyDateTime',
    label: 'Study Date/Time',
    description: 'When study was performed',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 110,
    minWidth: 90,
    maxWidth: 150
  },

  UPLOAD_DATE_TIME: {
    id: 'uploadDateTime',
    label: 'Upload Date/Time',
    description: 'When study was uploaded',
    category: 'timing',
    tables: ['assignor', 'radiologist'],
    defaultWidth: 110,
    minWidth: 90,
    maxWidth: 150
  },

  REPORTED_DATE_TIME: {
    id: 'reportedDateTime',
    label: 'Reported Date/Time',
    description: 'When report was finalized',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'], // ✅ FIXED: Added assignor and radiologist
    defaultWidth: 110,
    minWidth: 90,
    maxWidth: 150
  },

  VERIFIED_DATE_TIME: {
    id: 'verifiedDateTime',
    label: 'Verified Date/Time',
    description: 'When report was verified',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'], // ✅ FIXED: Added assignor and radiologist
    defaultWidth: 110,
    minWidth: 90,
    maxWidth: 150
  },

  ASSIGNED_RADIOLOGIST: {
    id: 'assignedRadiologist',
    label: 'Radiologist / Reported By',
    description: 'Assigned radiologist name',
    category: 'assignment',
    tables: ['assignor', 'radiologist', 'verifier'], // ✅ Already correct
    defaultWidth: 190,
    minWidth: 150,
    maxWidth: 300
  },

  ASSIGNED_VERIFIER: {
    id: 'assignedVerifier',
    label: 'Verified By',
    description: 'Assigned verifier name',
    category: 'assignment',
    tables: ['assignor', 'radiologist', 'verifier'], // ✅ FIXED: Added assignor and radiologist
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 250
  },

  LAB_NAME: {
    id: 'labName',
    label: 'Lab Name',
    description: 'Laboratory or center name',
    category: 'lab',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 140,
    minWidth: 100,
    maxWidth: 250
  },

  STATUS: {
    id: 'status',
    label: 'Status',
    description: 'Current workflow status',
    category: 'workflow',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 140,
    minWidth: 100,
    maxWidth: 200
  },

  REPORT_STATUS: {
    id: 'reportStatus',
    label: 'Report Status',
    description: 'Report verification status',
    category: 'report',
    tables: ['verifier'],
    defaultWidth: 130,
    minWidth: 100,
    maxWidth: 180
  },

  TAT: {
    id: 'tat',
    label: 'TAT',
    description: 'Turnaround time',
    category: 'timing',
    tables: ['assignor', 'radiologist', 'verifier'],
    defaultWidth: 90,
    minWidth: 60,
    maxWidth: 120
  },

  PRINT_COUNT: {
    id: 'printCount',
    label: 'Print Report',
    description: 'Number of times printed',
    category: 'report',
    tables: ['assignor'],
    defaultWidth: 100,
    minWidth: 80,
    maxWidth: 150
  },

  REJECTION_REASON: {
    id: 'rejectionReason',
    label: 'Rejection Reason',
    description: 'Why report was rejected',
    category: 'report',
    tables: ['radiologist'],
    defaultWidth: 220,
    minWidth: 150,
    maxWidth: 400
  }
};

// ✅ ROLE-SPECIFIC DEFAULT COLUMNS (Single Role) - EXACT MATCH
export const SINGLE_ROLE_DEFAULTS = {
  assignor: [
    'bharatPacsId',
    'centerName',
    'timeline',
    'patientName',
    'ageGender',
    'modality',
    'viewOnly',
    'downloadViewer',
    'studySeriesImages',
    'patientIdAccession',
    'referralDoctor',
    'clinicalHistory',
    'studyDateTime',
    'uploadDateTime',
    'assignedRadiologist',
    'status',
    'printCount',
    'actions'
  ],

  radiologist: [
    'bharatPacsId',
    'centerName',
    'timeline',
    'patientName',
    'ageGender',
    'modality',
    'viewOnly',
    'downloadViewer',
    'studySeriesImages',
    'patientIdAccession',
    'referralDoctor',
    'clinicalHistory',
    'studyDateTime',
    'uploadDateTime',
    'status',
    'rejectionReason',
    'actions'
  ],

  verifier: [
    'selection',
    'patientId',
    'patientName',
    'ageGender',
    'modality',
    'studyDateTime',
    'reportedDateTime',
    'assignedRadiologist',
    'verifiedDateTime',
    'assignedVerifier',
    'status',
    'actions'
  ]
};

// ✅ MULTI-ROLE COMBINATIONS - MERGED COLUMNS (NO EXTRA COLUMNS)
export const MULTI_ROLE_DEFAULTS = {
  // Assignor + Radiologist
  'assignor+radiologist': [
    'bharatPacsId',
    'centerName',
    'timeline',
    'patientName',
    'ageGender',
    'modality',
    'viewOnly',
    'downloadViewer',
    'studySeriesImages',
    'patientIdAccession',
    'referralDoctor',
    'clinicalHistory',
    'studyDateTime',
    'uploadDateTime',
    'verifiedDateTime',
    'verifiedAt',
    'assignedRadiologist',
    'status',
    'rejectionReason',
    'printCount',
    'actions'
  ],

  // Assignor + Verifier
  'assignor+verifier': [
    'selection',
    'bharatPacsId',
    'centerName',
    'timeline',
    'patientName',
    'ageGender',
    'modality',
    'studyDateTime',
    'assignedRadiologist',
    // 'reportedDateTime',
    // 'verifiedDateTime',
    'assignedVerifier',
    'status',
    'printCount',
    'actions'
  ],

  // Radiologist + Verifier
  'radiologist+verifier': [
    'selection',
    'patientId',
    'patientName',
    'ageGender',
    'modality',
    'studyDateTime',
    'assignedRadiologist',
    'reportedDateTime',
    'verifiedDateTime',
    'assignedVerifier',
    'status',
    'rejectionReason',
    'actions'
  ],

  // Triple combination: Assignor + Radiologist + Verifier
  'assignor+radiologist+verifier': [
    'selection',
    'bharatPacsId',
    'centerName',
    'timeline',
    'patientName',
    'ageGender',
    'modality',
    'viewOnly',
    'downloadViewer',
    'studySeriesImages',
    'patientIdAccession',
    'referralDoctor',
    'clinicalHistory',
    'studyDateTime',
    'uploadDateTime',
    'reportedDateTime',
    'verifiedDateTime',
    'assignedRadiologist',
    'assignedVerifier',
    'status',
    'rejectionReason',
    'printCount',
    'actions'
  ]
};

// ✅ HELPER: Get default columns for user based on their account roles
export const getDefaultColumnsForUser = (accountRoles = []) => {
  // If no roles or single role, use single role defaults
  if (accountRoles.length === 0) return [];
  if (accountRoles.length === 1) {
    return SINGLE_ROLE_DEFAULTS[accountRoles[0]] || [];
  }

  // Multi-role: create sorted key
  const roleKey = accountRoles.sort().join('+');
  
  // Check if we have a predefined combination
  if (MULTI_ROLE_DEFAULTS[roleKey]) {
    return MULTI_ROLE_DEFAULTS[roleKey];
  }

  // Fallback: merge all single role defaults (deduplicate)
  const mergedColumns = new Set();
  accountRoles.forEach(role => {
    const roleColumns = SINGLE_ROLE_DEFAULTS[role] || [];
    roleColumns.forEach(col => mergedColumns.add(col));
  });

  return Array.from(mergedColumns);
};

// ✅ HELPER: Get all available columns
export const getAllColumns = () => {
  return Object.values(UNIFIED_WORKLIST_COLUMNS);
};

// ✅ HELPER: Get column by ID
export const getColumnById = (id) => {
  return Object.values(UNIFIED_WORKLIST_COLUMNS).find(col => col.id === id);
};

// ✅ HELPER: Check if column is always visible
export const isColumnAlwaysVisible = (columnId) => {
  const column = getColumnById(columnId);
  return column?.alwaysVisible || false;
};

// ✅ HELPER: Get columns available for specific roles
export const getColumnsForRoles = (roles = []) => {
  return Object.values(UNIFIED_WORKLIST_COLUMNS).filter(col => {
    return roles.some(role => col.tables.includes(role));
  });
};