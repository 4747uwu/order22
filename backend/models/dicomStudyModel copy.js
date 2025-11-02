// models/DicomStudy.model.js
import mongoose from 'mongoose';
import { autoCalculateTAT } from '../utils/TATutility.js';

const DicomStudySchema = new mongoose.Schema({
    // Organization Reference - CRITICAL for multi-tenancy
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: { background: true }
    },
    
    organizationIdentifier: {
        type: String,
        required: true,
        uppercase: true,
        index: { background: true }
    },
    
    studyInstanceUID: {
        type: String,
        unique: true,
        index: { unique: true, background: true }
    },
    
    // Optimized patient reference with organization
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: { background: true }
    },
    patientId: { 
        type: String, 
        required: true,
        index: { background: true }
    },
    
    // Denormalized patient data for faster queries
    patientInfo: {
        patientID: { type: String, index: { sparse: true, background: true } },
        patientName: { type: String, index: { sparse: true, background: true } },
        age: String,
        gender: { type: String, index: { sparse: true, background: true } }
    },

    // Study metadata
    studyDate: { 
        type: Date, 
        index: { background: true },
        default: Date.now
    },
    modality: { 
        type: String, 
        index: { background: true },
        enum: ['CT', 'MRI', 'XR', 'US', 'DX', 'CR', 'MG', 'NM', 'PT'],
        default: 'CT'
    },
    accessionNumber: { 
        type: String, 
        index: { sparse: true, background: true }
    },

    // Workflow management
workflowStatus: {
    type: String,
    enum: [
        'new_study_received',
        'pending_assignment',
        'assigned_to_doctor',
        'doctor_opened_report',
        'report_in_progress',
        'report_drafted',
        'report_finalized',
        'report_uploaded',
        'report_downloaded_radiologist',
        'report_downloaded',
        'final_report_downloaded',
        // ✅ NEW: Verification workflow statuses
        'report_verified',
        'report_rejected',
        'verification_in_progress',
        'archived'
    ],
    default: 'new_study_received',
    index: { background: true }
},

currentCategory: {
    type: String,
    enum: [
        'new_study_received',
        'pending_assignment',
        'assigned_to_doctor',
        'doctor_opened_report',
        'report_in_progress',
        'report_drafted',
        'report_finalized',
        'report_uploaded',
        'report_downloaded_radiologist',
        'report_downloaded',
        'final_report_downloaded',
        // ✅ NEW: Verification workflow statuses
        'report_verified',
        'report_rejected',
        'verification_in_progress',
        'archived'
    ],
    default: 'new_study_received',
    index: { background: true }
},
    generated: {
        type: String,
        enum: ['yes', 'no'],
        default: 'no',
        index: { sparse: true, background: true } // 🔥 Sparse index
    },

    technologist: {
        name: { type: String, trim: true },
        mobile: { type: String, trim: true },
        comments: { type: String, trim: true },
        reasonToSend: { type: String, trim: true }
    },
    
    // 🔧 PERFORMANCE: Assignment tracking
    assignment: [{
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: { sparse: true, background: true } // 🔥 Sparse - not all studies assigned
        },
        assignedAt: { 
            type: Date, 
            index: { sparse: true, background: true } // 🔥 Sparse index
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        dueDate: { 
            type: Date, 
            index: { sparse: true, background: true } // 🔥 Due date filtering
        },
        priority: {
            type: String,
            enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
            default: 'NORMAL',
            index: { background: true } // 🔥 Priority filtering
        }
    }],

    preProcessedDownload: {
    zipUrl: { type: String, sparse: true },
    zipFileName: { type: String },
    zipSizeMB: { type: Number },
    zipCreatedAt: { type: Date },
    zipBucket: { type: String, default: 'medical-dicom-zips' },
    zipStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
        default: 'pending',
        index: { background: true }
    },
    zipKey: { type: String },
    zipJobId: { type: String },
    zipExpiresAt: { type: Date },
    zipMetadata: {
        orthancStudyId: String,
        instanceCount: Number,
        seriesCount: Number,
        compressionRatio: Number,
        processingTimeMs: Number,
        createdBy: String,
        error: String
    },
    downloadCount: { type: Number, default: 0 },
    lastDownloaded: { type: Date }
},



    studyPriority: {
        type: String,
        enum: ['SELECT', 'Emergency Case', 'Meet referral doctor', 'MLC Case', 'Study Exception'],
        default: 'SELECT',
        index: { background: true } // 🔥 Priority queries
    },

    // 🆕 Legacy field for backward compatibility
    lastAssignedDoctor: [{
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            index: { sparse: true, background: true } // 🔥 Sparse index for historical entries
        },
        assignedAt: {
            type: Date,
            index: { sparse: true, background: true } // 🔥 Sparse index for historical entries
        }
    }],
    
    // 🔧 OPTIMIZED: Status history with size limit
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String
    }],
    
  reportInfo: {
    startedAt: Date,
    finalizedAt: Date,
    downloadedAt: Date,
    reporterName: String,
    reportContent: String,
    
    // ✅ NEW: Verification tracking
    verificationInfo: {
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: { sparse: true, background: true }
        },
        verifiedAt: {
            type: Date,
            index: { sparse: true, background: true }
        },
        verificationStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'verified', 'rejected'],
            default: 'pending',
            index: { background: true }
        },
        verificationNotes: {
            type: String,
            trim: true,
            maxlength: 2000
        },
        corrections: [{
            section: {
                type: String,
                enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
            },
            comment: {
                type: String,
                required: true,
                trim: true,
                maxlength: 1000
            },
            severity: {
                type: String,
                enum: ['minor', 'major', 'critical'],
                default: 'minor'
            },
            correctedAt: {
                type: Date,
                default: Date.now
            }
        }],
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        verificationTimeMinutes: {
            type: Number,
            min: 0
        },
        // Track verification history
        verificationHistory: [{
            action: {
                type: String,
                enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            performedAt: {
                type: Date,
                default: Date.now
            },
            notes: String
        }]
    }
},
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
    ReportAvailable: {
        type: Boolean,
        default: false,
        index: { background: true }, // 🔥 Report availability filtering
        required: false
    },
    
    // 🔧 CRITICAL: Search optimization
    searchText: { 
        type: String, 
        index: { 
            name: 'searchTextIndex',
            background: true,
            // 🔥 SUPER FAST: Text search optimization
            weights: {
                searchText: 10,
                'patientInfo.patientName': 5,
                'patientInfo.patientID': 3,
                accessionNumber: 2
            }
        }
    },
    
    uploadedReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['uploaded-report', 'generated-template'],
            default: 'uploaded-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    doctorReports: [{
        filename: String,
        contentType: String,
        data: String, // base64 encoded
        size: Number,
        reportType: {
            type: String,
            enum: ['doctor-report', 'radiologist-report'],
            default: 'doctor-report'
        },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        reportStatus: {
            type: String,
            enum: ['draft', 'finalized'],
            default: 'finalized'
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    }],

    // ✅ NEW: Modern Report References
    reports: [{
        reportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report',
            index: { sparse: true, background: true }
        },
        reportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        fileName: String,
        downloadUrl: String
    }],

    // ✅ ENHANCED: Current report status (denormalized for quick access)
    currentReportStatus: {
        hasReports: { type: Boolean, default: false },
        latestReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Report'
        },
        latestReportStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'finalized', 'verified', 'rejected']
        },
        latestReportType: {
            type: String,
            enum: ['draft', 'finalized', 'radiologist-report', 'doctor-report', 'generated-template']
        },
        reportCount: { type: Number, default: 0 },
        lastReportedAt: Date,
        lastReportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    // Add this to the existing reportInfo section to maintain backward compatibility
    reportInfo: {
        startedAt: Date,
        finalizedAt: Date,
        downloadedAt: Date,
        reporterName: String,
        reportContent: String,
        
        // ✅ NEW: Verification tracking
        verificationInfo: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: { sparse: true, background: true }
            },
            verifiedAt: {
                type: Date,
                index: { sparse: true, background: true }
            },
            verificationStatus: {
                type: String,
                enum: ['pending', 'in_progress', 'verified', 'rejected'],
                default: 'pending',
                index: { background: true }
            },
            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },
            corrections: [{
                section: {
                    type: String,
                    enum: ['findings', 'impression', 'recommendation', 'clinical_correlation', 'technique', 'other']
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },
                severity: {
                    type: String,
                    enum: ['minor', 'major', 'critical'],
                    default: 'minor'
                },
                correctedAt: {
                    type: Date,
                    default: Date.now
                }
            }],
            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 1000
            },
            verificationTimeMinutes: {
                type: Number,
                min: 0
            },
            // Track verification history
            verificationHistory: [{
                action: {
                    type: String,
                    enum: ['assigned_for_verification', 'verification_started', 'verified', 'rejected', 'corrections_requested']
                },
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                performedAt: {
                    type: Date,
                    default: Date.now
                },
                notes: String
            }]
        },

        // ✅ NEW: Link to modern report system
        modernReports: [{
            reportId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Report'
            },
            reportType: String,
            createdAt: Date
        }]
    },
    
    // 🔧 OPTIMIZED: TAT tracking
    timingInfo: {
        uploadToAssignmentMinutes: { type: Number, index: { sparse: true, background: true } }, // 🔥 Performance metrics
        assignmentToReportMinutes: { type: Number, index: { sparse: true, background: true } },
        reportToDownloadMinutes: { type: Number, index: { sparse: true, background: true } },
        totalTATMinutes: { type: Number, index: { sparse: true, background: true } } // 🔥 TAT reporting
    },
    
    // 🔧 PERFORMANCE: Lab information
    sourceLab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        index: { background: true } // 🔥 Lab filtering very common
    },
   