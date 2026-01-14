// ✅ WORKLIST COLUMN DEFINITIONS - ALIGNED WITH ACTUAL TABLE STRUCTURE
// This file defines all available columns for different user roles in worklist tables

export const WORKLIST_COLUMNS = {
  // ✅ ACTIONS & SELECTION (Always visible)
  SELECTION: {
    id: 'selection',
    label: 'Select',
    description: 'Row selection checkbox',
    category: 'actions',
    defaultVisible: true,
    alwaysVisible: true
  },
  
  ACTIONS: {
    id: 'actions',
    label: 'Actions',
    description: 'Available actions (download, lock, report)',
    category: 'actions',
    defaultVisible: true,
    alwaysVisible: true
  },

  // ✅ ASSIGNOR TABLE COLUMNS (from actual WorklistTable.jsx)
  BHARAT_PACS_ID: {
    id: 'bharatPacsId',
    label: 'Xcentic ID',
    description: 'Unique study identifier',
    category: 'study',
    defaultVisible: true
  },

  CENTER_NAME: {
    id: 'centerName',
    label: 'Sub Center',
    description: 'Sub-center or lab location',
    category: 'lab',
    defaultVisible: true
  },

  TIMELINE: {
    id: 'timeline',
    label: 'Timeline',
    description: 'Study timeline and events',
    category: 'workflow',
    defaultVisible: true
  },

  PATIENT_NAME: {
    id: 'patientName',
    label: 'Patient Name',
    description: 'Full name of the patient',
    category: 'patient',
    defaultVisible: true
  },

  AGE_GENDER: {
    id: 'ageGender',
    label: 'Age/Sex',
    description: 'Patient age and gender',
    category: 'patient',
    defaultVisible: true
  },

  MODALITY: {
    id: 'modality',
    label: 'Modality',
    description: 'Imaging modality (CT, MRI, X-Ray, etc.)',
    category: 'study',
    defaultVisible: true
  },

  VIEW_ONLY: {
    id: 'viewOnly',
    label: 'View',
    description: 'View images only (no locking)',
    category: 'actions',
    defaultVisible: true
  },

  DOWNLOAD_VIEWER: {
    id: 'downloadViewer',
    label: 'Download/Viewer',
    description: 'Download and OHIF viewer options',
    category: 'actions',
    defaultVisible: true
  },

  STUDY_SERIES_IMAGES: {
    id: 'studySeriesImages',
    label: 'Study/Series/Images',
    description: 'Study description and counts',
    category: 'study',
    defaultVisible: true
  },

  PATIENT_ID_ACCESSION: {
    id: 'patientIdAccession',
    label: 'Patient ID / Acc. No.',
    description: 'Patient ID and accession number',
    category: 'patient',
    defaultVisible: false
  },

  REFERRAL_DOCTOR: {
    id: 'referralDoctor',
    label: 'Referral Doctor',
    description: 'Referring physician name',
    category: 'physician',
    defaultVisible: true
  },

  CLINICAL_HISTORY: {
    id: 'clinicalHistory',
    label: 'Clinical History',
    description: 'Patient clinical history and notes',
    category: 'clinical',
    defaultVisible: true
  },

  STUDY_DATE_TIME: {
    id: 'studyDateTime',
    label: 'Study Date/Time',
    description: 'When the study was performed',
    category: 'timing',
    defaultVisible: true
  },

  UPLOAD_DATE_TIME: {
    id: 'uploadDateTime',
    label: 'Upload Date/Time',
    description: 'When the study was uploaded',
    category: 'timing',
    defaultVisible: false
  },

  ASSIGNED_RADIOLOGIST: {
    id: 'assignedRadiologist',
    label: 'Radiologist',
    description: 'Assigned radiologist name',
    category: 'assignment',
    defaultVisible: true
  },

  STATUS: {
    id: 'status',
    label: 'Status',
    description: 'Current workflow status',
    category: 'workflow',
    defaultVisible: true
  },

  PRINT_COUNT: {
    id: 'printCount',
    label: 'Print Count',
    description: 'Number of times report printed',
    category: 'report',
    defaultVisible: false
  },

  // ✅ ADDITIONAL COMMON COLUMNS
  STUDY_DATE: {
    id: 'studyDate',
    label: 'Study Date',
    description: 'Date of the study',
    category: 'timing',
    defaultVisible: true
  },

  PRIORITY: {
    id: 'priority',
    label: 'Priority',
    description: 'Study priority level (Urgent/Normal)',
    category: 'workflow',
    defaultVisible: true
  },

  ASSIGNED_VERIFIER: {
    id: 'assignedVerifier',
    label: 'Verifier',
    description: 'Assigned verifier name',
    category: 'assignment',
    defaultVisible: false
  },

  LAB_NAME: {
    id: 'labName',
    label: 'Lab/Center',
    description: 'Laboratory or center name',
    category: 'lab',
    defaultVisible: true
  },

  TAT: {
    id: 'tat',
    label: 'TAT',
    description: 'Turnaround time',
    category: 'timing',
    defaultVisible: true
  },

  // ✅ DOCTOR TABLE SPECIFIC COLUMNS
  PATIENT_ID: {
    id: 'patientId',
    label: 'Patient ID',
    description: 'Unique patient identifier',
    category: 'patient',
    defaultVisible: true
  },

  PATIENT_AGE: {
    id: 'patientAge',
    label: 'Age',
    description: 'Patient age',
    category: 'patient',
    defaultVisible: true
  },

  PATIENT_GENDER: {
    id: 'patientGender',
    label: 'Gender',
    description: 'Patient gender',
    category: 'patient',
    defaultVisible: true
  },

  ACCESSION_NUMBER: {
    id: 'accessionNumber',
    label: 'Accession Number',
    description: 'Study accession number',
    category: 'study',
    defaultVisible: false
  },

  REFERRING_PHYSICIAN: {
    id: 'referringPhysician',
    label: 'Referring Physician',
    description: 'Doctor who referred the patient',
    category: 'physician',
    defaultVisible: true
  },

  REPORT_STATUS: {
    id: 'reportStatus',
    label: 'Report Status',
    description: 'Status of the report',
    category: 'report',
    defaultVisible: true
  }
};

// ✅ DEFAULT COLUMN SETS BY ROLE - USING ACTUAL TABLE COLUMN IDs
export const DEFAULT_COLUMNS_BY_ROLE = {
  assignor: [
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
    'assignedRadiologist',
    'status',
    'printCount',
    'actions'
  ],

  radiologist: [
    'patientName',
    'patientAge',
    'patientGender',
    'studyDate',
    'modality',
    'priority',
    'status',
    'referringPhysician',
    'clinicalHistory',
    'reportStatus',
    'actions'
  ],

  verifier: [
    'patientName',
    'patientAge',
    'patientGender',
    'studyDate',
    'modality',
    'priority',
    'assignedRadiologist',
    'reportStatus',
    'actions'
  ],

  admin: [
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
    'referralDoctor',
    'clinicalHistory',
    'studyDateTime',
    'assignedRadiologist',
    'status',
    'actions'
  ],

  super_admin: [
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
    'assignedRadiologist',
    'status',
    'printCount',
    'actions'
  ]
};

// ✅ COLUMN CATEGORIES FOR GROUPED UI
export const COLUMN_CATEGORIES = {
  patient: {
    label: 'Patient Information',
    icon: '👤',
    color: 'blue'
  },
  study: {
    label: 'Study Details',
    icon: '🔬',
    color: 'green'
  },
  workflow: {
    label: 'Status & Workflow',
    icon: '⚡',
    color: 'purple'
  },
  assignment: {
    label: 'Assignment Info',
    icon: '👥',
    color: 'teal'
  },
  physician: {
    label: 'Physician Details',
    icon: '👨‍⚕️',
    color: 'indigo'
  },
  lab: {
    label: 'Lab/Center Info',
    icon: '🏥',
    color: 'cyan'
  },
  report: {
    label: 'Report Information',
    icon: '📄',
    color: 'orange'
  },
  timing: {
    label: 'Timing & TAT',
    icon: '⏱️',
    color: 'red'
  },
  clinical: {
    label: 'Clinical Data',
    icon: '📋',
    color: 'pink'
  },
  actions: {
    label: 'Actions',
    icon: '⚙️',
    color: 'slate'
  }
};

// ✅ HELPER FUNCTIONS
export const getDefaultColumnsForRole = (role) => {
  return DEFAULT_COLUMNS_BY_ROLE[role] || DEFAULT_COLUMNS_BY_ROLE.assignor;
};

export const getColumnsByCategory = (category) => {
  return Object.values(WORKLIST_COLUMNS).filter(col => col.category === category);
};

export const getAllColumns = () => {
  return Object.values(WORKLIST_COLUMNS);
};

export const getColumnById = (id) => {
  return Object.values(WORKLIST_COLUMNS).find(col => col.id === id);
};

export const isColumnAlwaysVisible = (columnId) => {
  const column = getColumnById(columnId);
  return column?.alwaysVisible || false;
};
