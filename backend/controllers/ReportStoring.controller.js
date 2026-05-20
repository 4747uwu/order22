import mongoose from 'mongoose';
import Report from '../models/reportModel.js';
import DicomStudy, { ACTION_TYPES } from '../models/dicomStudyModel.js';
import Patient from '../models/patientModel.js';
import User from '../models/userModel.js';
import Organization from '../models/organisation.js';
import { updateWorkflowStatus } from '../utils/workflowStatusManager.js';

// ── Legacy actionLog sanitizer ───────────────────────────────────
// Some historical writes (e.g. studyCopy.controller.js via $push)
// stored the enum KEY ('STUDY_COPIED') instead of the VALUE
// ('study_copied'). Mongoose validation now rejects those on save.
// Normalize any such entries before we try to save the study.
const ACTION_TYPE_VALUES = new Set(Object.values(ACTION_TYPES));
const ACTION_TYPE_KEY_TO_VALUE = Object.fromEntries(
    Object.entries(ACTION_TYPES).map(([k, v]) => [k, v])
);

const sanitizeActionLog = (study) => {
    if (!Array.isArray(study?.actionLog)) return;
    for (const entry of study.actionLog) {
        if (!entry || !entry.actionType) continue;
        if (ACTION_TYPE_VALUES.has(entry.actionType)) continue;
        // Upper-case key written by mistake → map to its value
        if (ACTION_TYPE_KEY_TO_VALUE[entry.actionType]) {
            entry.actionType = ACTION_TYPE_KEY_TO_VALUE[entry.actionType];
            continue;
        }
        // Last-ditch: lowercase it and see if that matches
        const lowered = String(entry.actionType).toLowerCase();
        if (ACTION_TYPE_VALUES.has(lowered)) entry.actionType = lowered;
    }
};
export const storeDraftReport = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { 
            templateName, 
            placeholders, 
            htmlContent,
            templateId,
            templateInfo,
            capturedImages = [],
            existingReportId  // ✅ CRITICAL: Accept existingReportId from frontend
        } = req.body;

        console.log(req.body)
        
        const currentUser = req.user;
        
        console.log('📝 [Draft Store] Starting draft report storage:', {
            studyId,
            userId: currentUser._id,
            userRole: currentUser.role,
            isAdmin: currentUser.role === 'admin' || currentUser.role === 'super_admin'
        });

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            console.error('❌ [Draft Store] Invalid study ID:', studyId);
            return res.status(400).json({
                success: false,
                message: 'Valid study ID is required'
            });
        }

        const reportContent = htmlContent || placeholders?.['--Content--'] || '';
        if (!reportContent.trim()) {
            console.error('❌ [Draft Store] Empty report content');
            return res.status(400).json({
                success: false,
                message: 'Report content is required'
            });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const study = await DicomStudy.findById(studyId)
                .populate('patient', 'fullName patientId dateOfBirth gender')
                .populate('sourceLab', 'name identifier settings.requireReportVerification')
                .session(session);

            if (!study) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Study not found'
                });
            }

            // ✅ FIX: Reject draft save if study already completed/verified.
            // Also check if the specific report being saved is already finalized
            // (catches the race where finalize completed between the auto-save
            // request being sent and arriving at the server).
            const LOCKED_STATUSES = ['report_completed', 'verification_pending', 'final_report_downloaded', 'report_verified'];
            const isAutoSave = req.body.isAutoSave === true;
            if (isAutoSave) {
                if (LOCKED_STATUSES.includes(study.workflowStatus)) {
                    await session.abortTransaction();
                    console.log(`⚠️ [Draft Store] Auto-save rejected — study status is locked: ${study.workflowStatus}`);
                    return res.status(200).json({
                        success: false,
                        message: `Auto-save skipped — study already in ${study.workflowStatus} state`,
                        skipped: true
                    });
                }
                // Also check if the target report is already finalized
                const existingReportId = req.body.existingReportId;
                if (existingReportId && mongoose.Types.ObjectId.isValid(existingReportId)) {
                    const targetReport = await Report.findById(existingReportId).session(session);
                    if (targetReport && targetReport.reportStatus === 'finalized') {
                        await session.abortTransaction();
                        console.log(`⚠️ [Draft Store] Auto-save rejected — report ${existingReportId} already finalized`);
                        return res.status(200).json({
                            success: false,
                            message: 'Auto-save skipped — report already finalized',
                            skipped: true
                        });
                    }
                }
            }

            if (!study.organizationIdentifier) {
                study.organizationIdentifier = currentUser.organizationIdentifier;
            }

            const hasAccess = study.organizationIdentifier === currentUser.organizationIdentifier;
            if (!hasAccess) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this study'
                });
            }

            const organization = await Organization.findOne({
                identifier: currentUser.organizationIdentifier
            }).session(session);

            // ✅ DETERMINE DOCTOR ID AND NAME - Use assigned doctor if admin
            const { doctorId, doctorName } = await determineDoctorForReport(currentUser, study, session);

            // ✅ FIX: Priority order for finding existing report:
            // 1. Use existingReportId if provided (manual save after first save, or auto-save with known id)
            // 2. Fallback findOne by studyId+doctorId is DISABLED for auto-saves —
            //    it was the mechanism that merged two unrelated null-id reports
            //    into one document. Auto-saves with no id must always create a
            //    new doc; the frontend will then send that id on subsequent saves.
            let existingReport = null;

            if (existingReportId && mongoose.Types.ObjectId.isValid(existingReportId)) {
                existingReport = await Report.findById(existingReportId).session(session);
                console.log('🔍 [Draft Store] Using existingReportId:', existingReportId, '→ found:', !!existingReport);
            }

            if (!existingReport && !isAutoSave) {
                // Only fall back to the generic lookup for explicit (manual) saves.
                // Never for auto-saves — otherwise two concurrent null-id
                // auto-saves for different reports can collapse into one doc.
                existingReport = await Report.findOne({
                    dicomStudy: studyId,
                    doctorId: doctorId,
                    reportStatus: { $in: ['draft', 'report_drafted'] }
                }).sort({ createdAt: -1 }).session(session);
                console.log('🔍 [Draft Store] Manual-save fallback → found:', !!existingReport, existingReport?._id);
            } else if (!existingReport && isAutoSave) {
                console.log('🔍 [Draft Store] Auto-save with no id → will create a new draft');
            }

            const now = new Date();

            const patientInfo = {
                fullName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                patientName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                age: study.patientInfo?.age || study.patient?.age || 'N/A',
                gender: study.patient?.gender || study.patientInfo?.gender || 'N/A',
                dateOfBirth: study.patient?.dateOfBirth,
                clinicalHistory: study.clinicalHistory?.clinicalHistory || study.patient?.clinicalHistory || 'N/A'
            };

            const referringPhysicianName = (
                (typeof study.referringPhysician === 'object' && study.referringPhysician?.name?.trim()) ||
                (typeof study.referringPhysician === 'string' && study.referringPhysician.trim()) ||
                study.referringPhysicianName?.trim() ||
                'N/A'
            );

            // ✅ FILENAME: Use doctor name (not admin)
            const patientNameForFilename = (study.patientInfo?.patientName || study.patient?.fullName || 'unknown_patient')
                .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const fileName = `${patientNameForFilename}_draft_${Date.now()}.docx`;

            const reportData = {
                reportId: existingReport?.reportId || `RPT_${studyId}_${Date.now()}`,
                organizationIdentifier: currentUser.organizationIdentifier,
                organization: organization?._id,
                patient: study.patient?._id,
                patientId: study.patientId,
                dicomStudy: studyId,
                studyInstanceUID: study.studyInstanceUID || study.orthancStudyID || studyId.toString(),
                orthancStudyID: study.orthancStudyID,
                accessionNumber: study.accessionNumber,
                // ✅ FIXED: If admin, createdBy should be the doctor, not the admin
                createdBy: currentUser.role === 'admin' || currentUser.role === 'super_admin' 
                    ? doctorId  // Use doctor's ID
                    : currentUser._id,  // Use current user's ID
                doctorId: doctorId,            // ✅ Use assigned doctor ID
                reportContent: {
                    htmlContent: reportContent,
                    templateInfo: templateInfo || { templateId: templateId || null, templateName: templateName || 'Custom Template', templateCategory: 'General', templateTitle: templateName || 'Draft Report' },
                    placeholders: placeholders || {},
                    capturedImages: capturedImages.map((img, index) => ({
                        ...img,
                        capturedBy: currentUser._id,
                        displayOrder: img.displayOrder ?? index
                    })),
                    statistics: {
                        wordCount: reportContent.split(/\s+/).length,
                        characterCount: reportContent.length,
                        pageCount: 1,
                        imageCount: capturedImages.length // ✅ NEW
                    }
                },
                reportType: 'draft',
                reportStatus: 'draft',
                exportInfo: { format: 'docx', fileName: fileName },  // ✅ Use doctor name
                patientInfo: patientInfo,
                studyInfo: {
                    studyDate: study.studyDate,
                    modality: study.modality || study.modalitiesInStudy?.join(', '),
                    examDescription: study.examDescription || study.studyDescription,
                    institutionName: study.institutionName,
                    referringPhysician: {
                        name: referringPhysicianName,
                        institution: typeof study.referringPhysician === 'object' ? study.referringPhysician?.institution || '' : '',
                        contactInfo: typeof study.referringPhysician === 'object' ? study.referringPhysician?.contactInfo || '' : ''
                    },
                    seriesCount: study.seriesCount,
                    instanceCount: study.instanceCount,
                    priority: study.studyPriority || study.assignment?.priority,
                    caseType: study.caseType
                },
                workflowInfo: { draftedAt: existingReport?.workflowInfo?.draftedAt || now, statusHistory: existingReport?.workflowInfo?.statusHistory || [] },
                systemInfo: { dataSource: 'online_reporting_system' }
            };

            reportData.workflowInfo.statusHistory.push({
                status: 'draft',
                changedAt: now,
                changedBy: currentUser._id,
                notes: existingReport ? 'Draft report updated' : 'Draft report created',
                userRole: currentUser.role
            });

            let savedReport;
            if (existingReport) {
                Object.assign(existingReport, reportData);
                savedReport = await existingReport.save({ session });
            } else {
                savedReport = new Report(reportData);
                await savedReport.save({ session });
            }

            await updateStudyReportStatus(study, savedReport, session);

            // ✅ FIX: Draft always sets report_drafted — NO verification needed for drafts
            study.workflowStatus = 'report_drafted';
            study.currentCategory = 'DRAFT';
            if (!study.reportInfo) study.reportInfo = {};
            study.reportInfo.draftedAt = now;
            study.reportInfo.reporterName = doctorName;

            if (!study.statusHistory) study.statusHistory = [];
            study.statusHistory.push({
                status: 'report_drafted',
                changedAt: now,
                changedBy: currentUser._id,
                note: `Draft report ${existingReport ? 'updated' : 'created'} by ${currentUser.fullName} for ${doctorName}`
            });

            sanitizeActionLog(study);
            await study.save({ session });
            await session.commitTransaction();

            // ✅ FIX: requiresVerification is NOT applicable for drafts — removed from response
            res.status(200).json({
                success: true,
                message: existingReport ? 'Draft report updated successfully' : 'Draft report created successfully',
                data: {
                    reportId: savedReport._id,
                    documentId: savedReport.reportId,
                    doctorName: doctorName,
                    filename: savedReport.exportInfo.fileName,
                    reportType: savedReport.reportType,
                    reportStatus: savedReport.reportStatus,
                    studyWorkflowStatus: study.workflowStatus,
                    isAutoSave: req.body.isAutoSave || false,
                    nextStep: 'Draft saved — finalize when ready'
                }
            });

        } catch (error) {
            // ✅ FIX: Only abort if transaction hasn't been committed yet
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ [Draft Store] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while storing draft report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ UPDATED HELPER: Determine correct doctor ID and name
const determineDoctorForReport = async (currentUser, study, session) => {
    let doctorId = currentUser._id;
    let doctorName = currentUser.fullName;
    
    // ✅ If admin/super_admin, use assigned doctor instead
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
        console.log('👨‍💼 [Report] Admin creating report, using assigned doctor instead');
        
        if (study.assignment && study.assignment.length > 0) {
            const latestAssignment = study.assignment[study.assignment.length - 1];
            
            if (latestAssignment.assignedTo) {
                doctorId = latestAssignment.assignedTo;
                
                // Fetch assigned doctor's name
                try {
                    const assignedDoctor = await User.findById(latestAssignment.assignedTo)
                        .select('fullName')
                        .session(session);
                    
                    if (assignedDoctor) {
                        doctorName = assignedDoctor.fullName;
                        console.log('✅ [Report] Using assigned doctor:', {
                            doctorId: doctorId.toString(),
                            doctorName: doctorName,
                            createdByAdmin: currentUser.fullName,
                            originalAdmin: currentUser._id.toString()
                        });
                    }
                } catch (e) {
                    console.warn('⚠️ Could not fetch assigned doctor name:', e.message);
                }
            }
        } else {
            console.warn('⚠️ Admin creating report but no assigned doctor found');
        }
    }
    
    return { doctorId, doctorName };
};

/**
 * Mirror finalized report(s) to the original study when this study is a copy.
 * Runs fire-and-forget after the main transaction commits — failure here must
 * never roll back or block the primary response.
 */
const mirrorReportToSourceStudy = async (copiedStudy, savedReports) => {
    if (!copiedStudy.isCopiedStudy || !copiedStudy.copiedFrom?.studyId) return;

    const reportsArray = Array.isArray(savedReports) ? savedReports : [savedReports];
    console.log(`🔄 [Mirror] Mirroring ${reportsArray.length} report(s) from ${copiedStudy.bharatPacsId} → source study ${copiedStudy.copiedFrom.studyId}`);

    try {
        const originalStudy = await DicomStudy.findById(copiedStudy.copiedFrom.studyId)
            .populate('sourceLab', 'name identifier settings.requireReportVerification');

        if (!originalStudy) {
            console.warn(`⚠️ [Mirror] Source study not found: ${copiedStudy.copiedFrom.studyId}`);
            return;
        }

        const originalOrg = await Organization.findOne({ identifier: originalStudy.organizationIdentifier });
        if (!originalOrg) {
            console.warn(`⚠️ [Mirror] Original org not found: ${originalStudy.organizationIdentifier}`);
            return;
        }

        const now = new Date();
        const mirroredReportRefs = [];

        for (const savedReport of reportsArray) {
            const mirroredReport = new Report({
                reportId: `MIRROR_${savedReport._id}_${Date.now()}`,
                organizationIdentifier: originalStudy.organizationIdentifier,
                organization: originalOrg._id,
                patient: originalStudy.patient,
                patientId: originalStudy.patientId,
                dicomStudy: originalStudy._id,
                studyInstanceUID: originalStudy.studyInstanceUID || originalStudy.orthancStudyID,
                orthancStudyID: originalStudy.orthancStudyID,
                accessionNumber: originalStudy.accessionNumber,
                createdBy: savedReport.createdBy,
                doctorId: savedReport.doctorId,
                reportContent: savedReport.reportContent,
                reportType: 'finalized',
                reportStatus: 'finalized',
                exportInfo: { ...savedReport.exportInfo },
                patientInfo: savedReport.patientInfo,
                studyInfo: savedReport.studyInfo,
                workflowInfo: {
                    draftedAt: savedReport.workflowInfo?.draftedAt || now,
                    finalizedAt: now,
                    statusHistory: [{
                        status: 'finalized',
                        changedAt: now,
                        notes: `Mirrored from ${copiedStudy.organizationIdentifier} (${copiedStudy.bharatPacsId})`,
                        userRole: 'system'
                    }]
                },
                systemInfo: {
                    dataSource: 'migrated_data',
                    mirroredFrom: {
                        copiedStudyId: copiedStudy._id,
                        copiedStudyBharatPacsId: copiedStudy.bharatPacsId,
                        organizationIdentifier: copiedStudy.organizationIdentifier,
                        originalReportId: savedReport._id,
                        mirroredAt: now
                    }
                }
            });

            await mirroredReport.save();

            mirroredReportRefs.push({
                reportId: mirroredReport._id,
                reportType: 'finalized',
                reportStatus: 'finalized',
                createdAt: now,
                fileName: mirroredReport.exportInfo?.fileName
            });

            console.log(`✅ [Mirror] ${savedReport._id} → ${mirroredReport._id} in ${originalStudy.organizationIdentifier}`);
        }

        const requiresVerification = originalStudy.sourceLab?.settings?.requireReportVerification;
        const newStatus = requiresVerification ? 'verification_pending' : 'report_completed';
        const newCategory = requiresVerification ? 'VERIFICATION_PENDING' : 'COMPLETED';

        await DicomStudy.findByIdAndUpdate(originalStudy._id, {
            $push: {
                reports: { $each: mirroredReportRefs },
                'reportInfo.modernReports': {
                    $each: mirroredReportRefs.map(r => ({
                        reportId: r.reportId,
                        reportType: r.reportType,
                        createdAt: r.createdAt
                    }))
                },
                statusHistory: {
                    status: newStatus,
                    changedAt: now,
                    note: `Report mirrored from ${copiedStudy.organizationIdentifier} (${copiedStudy.bharatPacsId})`
                }
            },
            $set: {
                workflowStatus: newStatus,
                currentCategory: newCategory,
                'currentReportStatus.hasReports': true,
                'currentReportStatus.latestReportId': mirroredReportRefs[mirroredReportRefs.length - 1].reportId,
                'currentReportStatus.latestReportStatus': 'finalized',
                'currentReportStatus.latestReportType': 'finalized',
                'reportInfo.finalizedAt': now,
                ...(requiresVerification
                    ? { 'reportInfo.sentForVerificationAt': now }
                    : { 'reportInfo.completedAt': now, 'reportInfo.completedWithoutVerification': true }
                )
            }
        });

        console.log(`✅ [Mirror] Original study ${originalStudy.bharatPacsId || originalStudy._id} → ${newStatus}`);

    } catch (err) {
        console.error('❌ [Mirror] Failed to mirror report to source study:', err.message);
        // intentionally not rethrowing — mirror failure must not affect the primary response
    }
};

// ✅ UPDATED: storeFinalizedReport
export const storeFinalizedReport = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { templateName, placeholders, htmlContent, templateId, templateInfo, format = 'docx', capturedImages = [], existingReportId } = req.body;

        const currentUser = req.user;

        console.log('🏁 [Finalize Store] Starting finalized report storage:', {
            studyId,
            userId: currentUser._id,
            userRole: currentUser.role,
            isAdmin: currentUser.role === 'admin' || currentUser.role === 'super_admin'
        });

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({ success: false, message: 'Valid study ID is required' });
        }

        const reportContent = htmlContent || placeholders?.['--Content--'] || '';
        if (!reportContent.trim()) {
            return res.status(400).json({ success: false, message: 'Report content is required for finalization' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const study = await DicomStudy.findById(studyId)
                .populate('patient', 'fullName patientId dateOfBirth gender')
                .populate('sourceLab', 'name identifier settings.requireReportVerification')
                .session(session);

            if (!study) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Study not found' });
            }

            if (!study.organizationIdentifier) {
                study.organizationIdentifier = currentUser.organizationIdentifier;
            }

            const hasAccess = study.organizationIdentifier === currentUser.organizationIdentifier;
            if (!hasAccess) {
                await session.abortTransaction();
                return res.status(403).json({ success: false, message: 'Access denied to this study' });
            }

            const organization = await Organization.findOne({
                identifier: currentUser.organizationIdentifier
            }).session(session);

            // ✅ DETERMINE DOCTOR ID AND NAME - Use assigned doctor if admin
            const { doctorId, doctorName } = await determineDoctorForReport(currentUser, study, session);

            // ✅ NEW: Check if study was previously downloaded — if so, this is a reprint
            const wasPreviouslyDownloaded = study.statusHistory?.some(
                s => s.status === 'final_report_downloaded'
            );

            if (wasPreviouslyDownloaded) {
                study.reprintNeeded = true;
                console.log('🖨️ [Finalize Store] Study was previously downloaded — setting reprintNeeded = true');
            }

            // ✅ FIX: Use existingReportId from frontend if available (points to
            // the exact draft that was auto-saved). Without this, the generic
            // query below might find the wrong draft or a stale record, causing
            // reports to "disappear" or retain draft filenames after finalize.
            let existingReport = null;
            if (existingReportId && mongoose.Types.ObjectId.isValid(existingReportId)) {
                existingReport = await Report.findById(existingReportId).session(session);
                console.log(`✅ [Finalize Store] Using existingReportId=${existingReportId} → found=${!!existingReport}`);
            }
            if (!existingReport) {
                existingReport = await Report.findOne({
                    dicomStudy: studyId,
                    doctorId: doctorId
                }).sort({ createdAt: -1 }).session(session);
            }

            const now = new Date();

            const patientInfo = {
                fullName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                patientName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                age: study.patientInfo?.age || study.patient?.age || 'N/A',
                gender: study.patient?.gender ||
                       study.patientInfo?.gender ||
                       placeholders?.['--agegender--']?.split(' / ')[1] || 'N/A',
                dateOfBirth: study.patient?.dateOfBirth,
                clinicalHistory: study.clinicalHistory?.clinicalHistory ||
                               study.patient?.clinicalHistory || 'N/A'
            };

            const referringPhysicianName = (
                (typeof study.referringPhysician === 'object' && study.referringPhysician?.name?.trim()) ||
                (typeof study.referringPhysician === 'string' && study.referringPhysician.trim()) ||
                study.referringPhysicianName?.trim() ||
                'N/A'
            );

            // ✅ FIX: Use a proper finalized filename — never carry over the
            // draft name. The old code set fileName to just the patient name
            // without extension or status, so the draft filename persisted.
            const patientNameForFilename = (study.patientInfo?.patientName || study.patient?.fullName || 'unknown_patient')
                .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const fileName = `${patientNameForFilename}_final_${Date.now()}.${format || 'docx'}`;

            const reportData = {
                reportId: existingReport?.reportId || `RPT_${studyId}_${Date.now()}`,
                organizationIdentifier: currentUser.organizationIdentifier,
                organization: organization?._id,
                patient: study.patient?._id,
                patientId: study.patientId,
                dicomStudy: studyId,
                studyInstanceUID: study.studyInstanceUID || study.orthancStudyID || studyId.toString(),
                orthancStudyID: study.orthancStudyID,
                accessionNumber: study.accessionNumber,
                // ✅ FIXED: If admin, createdBy should be the doctor, not the admin
                createdBy: currentUser.role === 'admin' || currentUser.role === 'super_admin' 
                    ? doctorId  // Use doctor's ID
                    : currentUser._id,  // Use current user's ID
                doctorId: doctorId,            // ✅ Use assigned doctor ID
                reportContent: {
                    htmlContent: reportContent,
                    templateInfo: templateInfo || { templateId: templateId || null, templateName: templateName || 'Custom Template', templateCategory: 'General', templateTitle: templateName || 'Finalized Report' },
                    placeholders: placeholders || {},
                    capturedImages: capturedImages.map((img, index) => ({
                        ...img,
                        capturedBy: currentUser._id,
                        displayOrder: img.displayOrder ?? index
                    })),
                    statistics: {
                        wordCount: reportContent.split(/\s+/).length,
                        characterCount: reportContent.length,
                        pageCount: 1,
                        imageCount: capturedImages.length
                    }
                },
                reportType: 'finalized',
                reportStatus: 'finalized',
                exportInfo: { format: format, fileName: fileName },  // ✅ Use doctor name
                patientInfo: patientInfo,
                studyInfo: {
                    studyDate: study.studyDate,
                    modality: study.modality || study.modalitiesInStudy?.join(', '),
                    examDescription: study.examDescription || study.studyDescription,
                    institutionName: study.institutionName,
                    referringPhysician: {
                        name: referringPhysicianName,
                        institution: typeof study.referringPhysician === 'object' ? study.referringPhysician?.institution || '' : '',
                        contactInfo: typeof study.referringPhysician === 'object' ? study.referringPhysician?.contactInfo || '' : ''
                    },
                    seriesCount: study.seriesCount,
                    instanceCount: study.instanceCount,
                    priority: study.studyPriority || study.assignment?.priority,
                    caseType: study.caseType
                },
                workflowInfo: { draftedAt: existingReport?.workflowInfo?.draftedAt || now, finalizedAt: now, statusHistory: existingReport?.workflowInfo?.statusHistory || [] },
                systemInfo: { dataSource: 'online_reporting_system' }
            };

            reportData.workflowInfo.statusHistory.push({
                status: 'finalized',
                changedAt: now,
                changedBy: currentUser._id,
                notes: existingReport ? 'Draft report finalized' : 'Report created and finalized',
                userRole: currentUser.role
            });

            let savedReport;
            if (existingReport) {
                Object.assign(existingReport, reportData);
                savedReport = await existingReport.save({ session });
            } else {
                savedReport = new Report(reportData);
                await savedReport.save({ session });
            }

            await updateStudyReportStatus(study, savedReport, session);

            const doctorInfo = await mongoose.model('Doctor').findOne({ userAccount: doctorId }).select('requireReportVerification').session(session);
            const requiresVerification = study.sourceLab?.settings?.requireReportVerification || doctorInfo?.requireReportVerification;

            if (requiresVerification) {
                // ✅ Goes to verification — verifier.controller.js handles reprintNeeded logic
                // when verifier APPROVES: if reprintNeeded=true → report_reprint_needed
                //                        if reprintNeeded=false → report_completed
                study.workflowStatus = 'verification_pending';
                study.currentCategory = 'VERIFICATION_PENDING';
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.sentForVerificationAt = now;
                study.reportInfo.finalizedAt = now;
                study.reportInfo.reporterName = doctorName;

                console.log(`📋 [Finalize Store] Sent for verification | reprintNeeded=${study.reprintNeeded}`);

            } else {
                // ✅ NO verification needed — handle reprint directly here
                if (wasPreviouslyDownloaded) {
                    // ✅ Was downloaded before + no verifier = straight to reprint_needed
                    study.workflowStatus = 'report_reprint_needed';
                    study.currentCategory = 'REPRINT_NEED';
                    if (!study.reportInfo) study.reportInfo = {};
                    study.reportInfo.finalizedAt = now;
                    study.reportInfo.reporterName = doctorName;
                    study.reportInfo.completedWithoutVerification = true;

                    console.log('🖨️ [Finalize Store] No verifier + previously downloaded → report_reprint_needed');
                } else {
                    // ✅ Normal first-time completion
                    study.workflowStatus = 'report_completed';
                    study.currentCategory = 'COMPLETED';
                    if (!study.reportInfo) study.reportInfo = {};
                    study.reportInfo.completedAt = now;
                    study.reportInfo.finalizedAt = now;
                    study.reportInfo.reporterName = doctorName;
                    study.reportInfo.completedWithoutVerification = true;

                    console.log('✅ [Finalize Store] First-time completion → report_completed');
                }
            }

            if (!study.statusHistory) study.statusHistory = [];
            study.statusHistory.push({
                status: study.workflowStatus,
                changedAt: now,
                changedBy: currentUser._id,
                note: `Report finalized by ${doctorName}${requiresVerification ? ' - sent for verification' : wasPreviouslyDownloaded ? ' - reprint needed' : ' - completed'}`
            });

            sanitizeActionLog(study);
            await study.save({ session });
            await session.commitTransaction();

            // Mirror to original study if this is a copied study (fire-and-forget)
            if (study.isCopiedStudy) {
                mirrorReportToSourceStudy(study, savedReport);
            }

            res.status(200).json({
                success: true,
                message: requiresVerification
                    ? 'Report sent for verification successfully'
                    : wasPreviouslyDownloaded
                    ? 'Report marked for reprint'
                    : 'Report finalized successfully',
                data: {
                    reportId: savedReport._id,
                    documentId: savedReport.reportId,
                    doctorName: doctorName,
                    filename: savedReport.exportInfo.fileName,
                    reportType: savedReport.reportType,
                    reportStatus: savedReport.reportStatus,
                    studyWorkflowStatus: study.workflowStatus,
                    requiresVerification: requiresVerification,
                    isReprint: wasPreviouslyDownloaded,
                    nextStep: requiresVerification
                        ? 'Report sent to verifier for approval'
                        : wasPreviouslyDownloaded
                        ? 'Report marked for reprint — will be processed'
                        : 'Report completed and ready for download'
                }
            });

        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ [Finalize Store] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while storing finalized report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ NEW: Store multiple reports for same study
export const storeMultipleReports = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { 
            reports = [],  // Array of report objects
            overwrite = false
        } = req.body;

        const currentUser = req.user;

        console.log('📚 [Multi-Report] Starting multi-report storage:', {
            studyId,
            reportCount: reports.length,
            userId: currentUser._id,
            userRole: currentUser.role,
            overwrite
        });

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid study ID is required'
            });
        }

        if (!Array.isArray(reports) || reports.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one report is required'
            });
        }

        // Validate each report has content
        const invalidReports = reports.findIndex(r => !r.htmlContent?.trim());
        if (invalidReports !== -1) {
            return res.status(400).json({
                success: false,
                message: `Report ${invalidReports + 1} has empty content`
            });
        }

        // ✅ GUARD: Reject payloads where two reports carry the same existingReportId.
        // Without this, the upsert loop below runs Object.assign + save() into the
        // same Report document twice, silently collapsing two reports into one.
        const seenIds = new Set();
        for (let i = 0; i < reports.length; i++) {
            const id = reports[i].existingReportId;
            if (!id) continue;
            if (seenIds.has(id)) {
                console.error(`❌ [Multi-Report] Duplicate existingReportId in payload: ${id} (report ${i + 1})`);
                return res.status(400).json({
                    success: false,
                    message: `Duplicate existingReportId detected (report ${i + 1}). Refresh the page and try again.`,
                    duplicateId: id
                });
            }
            seenIds.add(id);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const study = await DicomStudy.findById(studyId)
                .populate('patient', 'fullName patientId dateOfBirth gender')
                .populate('sourceLab', 'name identifier settings.requireReportVerification')
                .session(session);

            if (!study) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Study not found'
                });
            }

            if (!study.organizationIdentifier) {
                study.organizationIdentifier = currentUser.organizationIdentifier;
            }

            const hasAccess = study.organizationIdentifier === currentUser.organizationIdentifier;
            if (!hasAccess) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this study'
                });
            }

            const organization = await Organization.findOne({
                identifier: currentUser.organizationIdentifier
            }).session(session);

            const { doctorId, doctorName } = await determineDoctorForReport(currentUser, study, session);

            // ✅ NEW: Same reprint check for multi-report
            const wasPreviouslyDownloaded = study.statusHistory?.some(
                s => s.status === 'final_report_downloaded'
            );

            if (wasPreviouslyDownloaded) {
                study.reprintNeeded = true;
                console.log('🖨️ [Multi-Report] Study was previously downloaded — setting reprintNeeded = true');
            }

            let existingReport = await Report.findOne({
                dicomStudy: studyId,
                doctorId: doctorId
            }).sort({ createdAt: -1 }).session(session);

            const now = new Date();

            const patientInfo = {
                fullName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                patientName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                age: study.patientInfo?.age || study.patient?.age || 'N/A',
                gender: study.patient?.gender || 
                       study.patientInfo?.gender || 
                       placeholders?.['--agegender--']?.split(' / ')[1] || 'N/A',
                dateOfBirth: study.patient?.dateOfBirth,
                clinicalHistory: study.clinicalHistory?.clinicalHistory || 
                               study.patient?.clinicalHistory || 'N/A'
            };

            const referringPhysicianName = (
                (typeof study.referringPhysician === 'object' && study.referringPhysician?.name?.trim()) ||
                (typeof study.referringPhysician === 'string' && study.referringPhysician.trim()) ||
                study.referringPhysicianName?.trim() ||
                'N/A'
            );

            // ✅ FILENAME: Use doctor name (not admin)
            const patientNameForFilename = (study.patientInfo?.patientName || study.patient?.fullName || 'unknown_patient')
                .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const fileName = patientNameForFilename;

            const savedReports = [];
            for (let i = 0; i < reports.length; i++) {
                const reportData = reports[i];
                const reportNumber = i + 1;

                // ✅ UPSERT: find existing report by ID if provided, otherwise create new
                let existingReport = null;
                if (reportData.existingReportId && mongoose.Types.ObjectId.isValid(reportData.existingReportId)) {
                    existingReport = await Report.findById(reportData.existingReportId).session(session);
                    console.log(`🔍 [Multi-Report] Report ${reportNumber}: existingReportId=${reportData.existingReportId} → found=${!!existingReport}`);
                }

                // ✅ FIX: Always generate a proper finalized filename.
                // The old code used existingReport.exportInfo.fileName which
                // carried the draft/autosave name (e.g. _autosave_123.docx),
                // causing finalized reports to show "draft" in their name.
                const fileNameForReport = reports.length > 1
                    ? `${patientNameForFilename}_report_${reportNumber}_${Date.now()}.docx`
                    : `${patientNameForFilename}_final_${Date.now()}.docx`;

                const reportFields = {
                    reportId: existingReport?.reportId || `RPT_${studyId}_${reportNumber}_${Date.now()}`,
                    organizationIdentifier: currentUser.organizationIdentifier,
                    organization: organization?._id,
                    patient: study.patient?._id,
                    patientId: study.patientId,
                    dicomStudy: studyId,
                    studyInstanceUID: study.studyInstanceUID || study.orthancStudyID || studyId.toString(),
                    orthancStudyID: study.orthancStudyID,
                    accessionNumber: study.accessionNumber,
                    createdBy: currentUser.role === 'admin' || currentUser.role === 'super_admin' ? doctorId : currentUser._id,
                    doctorId: doctorId,
                    reportContent: {
                        htmlContent: reportData.htmlContent,
                        templateInfo: reportData.templateInfo || {},
                        placeholders: reportData.placeholders || {},
                        capturedImages: reportData.capturedImages?.map((img, idx) => ({
                            ...img,
                            capturedBy: currentUser._id,
                            displayOrder: idx
                        })) || [],
                        statistics: {
                            wordCount: reportData.htmlContent.split(/\s+/).length,
                            characterCount: reportData.htmlContent.length,
                            pageCount: 1,
                            imageCount: reportData.capturedImages?.length || 0
                        }
                    },
                    reportType: reportData.reportType || 'finalized',
                    reportStatus: reportData.reportStatus || 'finalized',
                    exportInfo: { format: reportData.format || 'docx', fileName: fileNameForReport },
                    patientInfo: patientInfo,
                    studyInfo: {
                        studyDate: study.studyDate,
                        modality: study.modality || study.modalitiesInStudy?.join(', '),
                        examDescription: study.examDescription,
                        institutionName: study.institutionName,
                        referringPhysician: { name: referringPhysicianName, institution: '', contactInfo: '' },
                        seriesCount: study.seriesCount,
                        instanceCount: study.instanceCount,
                        priority: study.priority,
                        caseType: study.caseType
                    },
                    workflowInfo: {
                        draftedAt: existingReport?.workflowInfo?.draftedAt || now,
                        ...(reportData.reportType !== 'draft' && reportData.reportStatus !== 'draft' && { finalizedAt: now }),
                        statusHistory: existingReport?.workflowInfo?.statusHistory || []
                    },
                    systemInfo: { dataSource: 'online_reporting_system' }
                };

                const entryStatus = reportData.reportStatus || reportData.reportType || 'finalized';
                reportFields.workflowInfo.statusHistory.push({
                    status: entryStatus,
                    changedAt: now,
                    changedBy: currentUser._id,
                    notes: existingReport ? `Report ${reportNumber} updated` : `Report ${reportNumber} created`,
                    userRole: currentUser.role
                });

                let savedReport;
                if (existingReport) {
                    Object.assign(existingReport, reportFields);
                    savedReport = await existingReport.save({ session });
                    console.log(`✅ [Multi-Report] Report ${reportNumber} UPDATED:`, existingReport._id);
                } else {
                    savedReport = new Report(reportFields);
                    await savedReport.save({ session });
                    console.log(`✅ [Multi-Report] Report ${reportNumber} CREATED:`, savedReport._id);
                }
                savedReports.push(savedReport);
            }

            // ✅ Track every saved report on the study, not just the last one.
            // The helper pushes one entry into study.reports[] and
            // study.reportInfo.modernReports[] per call, so looping it keeps
            // those arrays aligned with what actually exists in the Report
            // collection.
            for (const saved of savedReports) {
                await updateStudyReportStatus(study, saved, session);
            }

            // Check if this is a draft save or a finalized save
            const isDraftOperation = reports.every(r => r.reportStatus === 'draft' || r.reportType === 'draft');
            const doctorInfo = await mongoose.model('Doctor').findOne({ userAccount: doctorId }).select('requireReportVerification').session(session);
            const requiresVerification = study.sourceLab?.settings?.requireReportVerification || doctorInfo?.requireReportVerification;

            if (isDraftOperation) {
                // Mirror single-report draft workflow — no verification flow for drafts
                study.workflowStatus = 'report_drafted';
                study.currentCategory = 'DRAFT';
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.draftedAt = now;
                study.reportInfo.reporterName = doctorName;
                study.reportInfo.multipleReports = savedReports.length > 1;
                study.reportInfo.reportCount = savedReports.length;
            } else if (requiresVerification) {
                study.workflowStatus = 'verification_pending';
                study.currentCategory = 'VERIFICATION_PENDING';
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.sentForVerificationAt = now;
                study.reportInfo.finalizedAt = now;
                study.reportInfo.reporterName = doctorName;
                study.reportInfo.multipleReports = savedReports.length > 1;
                study.reportInfo.reportCount = savedReports.length;
            } else {
                // ✅ NEW: Reprint check for no-verification path
                if (wasPreviouslyDownloaded) {
                    study.workflowStatus = 'report_reprint_needed';
                    study.currentCategory = 'REPRINT_NEED';
                } else {
                    study.workflowStatus = 'report_completed';
                    study.currentCategory = 'COMPLETED';
                }
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.completedAt = now;
                study.reportInfo.finalizedAt = now;
                study.reportInfo.reporterName = doctorName;
                study.reportInfo.multipleReports = savedReports.length > 1;
                study.reportInfo.reportCount = savedReports.length;
                study.reportInfo.completedWithoutVerification = true;
            }

            if (!study.statusHistory) study.statusHistory = [];
            study.statusHistory.push({
                status: study.workflowStatus,
                changedAt: now,
                changedBy: currentUser._id,
                note: `${savedReports.length} report(s) ${isDraftOperation ? 'drafted' : requiresVerification ? 'sent for verification' : wasPreviouslyDownloaded ? 'reprint needed' : 'finalized'} by ${doctorName}`
            });

            sanitizeActionLog(study);
            await study.save({ session });
            await session.commitTransaction();

            // Mirror to original study if this is a copied study and not a draft (fire-and-forget)
            if (study.isCopiedStudy && !isDraftOperation) {
                mirrorReportToSourceStudy(study, savedReports);
            }

            res.status(200).json({
                success: true,
                message: `${savedReports.length} report(s) ${requiresVerification ? 'sent for verification' : 'finalized'} successfully`,
                data: {
                    reports: savedReports.map(r => ({
                        reportId: r._id,
                        documentId: r.reportId,
                        filename: r.exportInfo.fileName,
                        reportType: r.reportType,
                        reportStatus: r.reportStatus
                    })),
                    totalReports: savedReports.length,
                    studyWorkflowStatus: study.workflowStatus,
                    requiresVerification: requiresVerification,
                    nextStep: requiresVerification 
                        ? 'Reports sent to verifier for approval' 
                        : 'Reports completed and ready for download'
                }
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ [Multi-Report] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while storing multiple reports',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



// ✅ GET STUDY REPORTS - For ReportModal
export const getStudyReports = async (req, res) => {
    try {
        const { studyId } = req.params;
        const currentUser = req.user;
        const needsFullContent = req.path.includes('all-reports');
        
        console.log('📄 [Get Reports] Fetching reports for study:', studyId, { needsFullContent });

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({ success: false, message: 'Valid study ID is required' });
        }

        // ✅ FIX: No status filter — return ALL reports regardless of status
        const reports = await Report.find({
            dicomStudy: studyId,
            organizationIdentifier: currentUser.organizationIdentifier
            // ❌ REMOVED: reportStatus filter — was excluding verified reports
        })
        .populate('doctorId', 'fullName email role')
        .populate('verifierId', 'fullName email role')
        .populate('createdBy', 'fullName email role')
        .sort({ createdAt: 1 }) // ✅ ASC so Report 1 is oldest, Report 2 is newest
        .lean();

        console.log('📄 [Get Reports] Found reports:', reports.length);

        if (needsFullContent) {
            // ✅ Return FULL report data including htmlContent for editor loading
            const fullReports = reports.map(report => ({
                _id: report._id,
                reportId: report.reportId,
                reportType: report.reportType,
                reportStatus: report.reportStatus,
                reportContent: {
                    htmlContent: report.reportContent?.htmlContent || '',       // ✅ Full content
                    capturedImages: report.reportContent?.capturedImages || [],
                    templateInfo: report.reportContent?.templateInfo || null,
                    placeholders: report.reportContent?.placeholders || {},
                    statistics: report.reportContent?.statistics || {}
                },
                exportInfo: report.exportInfo,
                patientInfo: report.patientInfo,
                studyInfo: report.studyInfo,
                workflowInfo: report.workflowInfo,
                doctorId: report.doctorId,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt
            }));

            return res.status(200).json({
                success: true,
                data: {
                    reports: fullReports,
                    count: fullReports.length,
                    studyId: studyId
                }
            });
        }

        // ✅ Original formatted response for the reports listing modal (no htmlContent needed)
        const formattedReports = reports.map(report => ({
            _id: report._id,
            filename: report.exportInfo?.fileName || `report_${report._id}.${report.exportInfo?.format || 'docx'}`,
            reportType: report.reportType,
            reportStatus: report.reportStatus,
            uploadedAt: report.workflowInfo?.finalizedAt || report.createdAt,
            uploadedBy: report.doctorId?.fullName || report.createdBy?.fullName || 'Unknown',
            size: report.exportInfo?.fileSize || 0,
            contentType: report.exportInfo?.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            verificationStatus: report.verificationInfo?.verificationStatus || 'pending',
            verifiedBy: report.verifierId?.fullName,
            verifiedAt: report.verificationInfo?.verifiedAt,
            downloadUrl: report.exportInfo?.downloadUrl,
            wordCount: report.reportContent?.statistics?.wordCount || 0,
            characterCount: report.reportContent?.statistics?.characterCount || 0
        }));

        res.status(200).json({
            success: true,
            data: {
                reports: formattedReports,
                count: formattedReports.length,
                studyId: studyId
            }
        });

    } catch (error) {
        console.error('❌ [Get Reports] Error fetching study reports:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching reports',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ NEW: Get all reports WITH full htmlContent for editor loading
export const getAllReportsWithContent = async (req, res) => {
    try {
        const { studyId } = req.params;
        const currentUser = req.user;

        console.log('📄 [All Reports] Fetching ALL reports with full content for study:', studyId);

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({ success: false, message: 'Valid study ID is required' });
        }

        // ✅ FIX: No status filter — fetch ALL reports including verified ones
        const reports = await Report.find({
            dicomStudy: studyId,
            organizationIdentifier: currentUser.organizationIdentifier
            // ❌ REMOVED: reportStatus filter
        })
        .populate('doctorId', 'fullName email role')
        .populate('createdBy', 'fullName email role')
        .sort({ createdAt: 1 })
        .lean();

        console.log('📄 [All Reports] Found:', reports.length, 'reports');
        reports.forEach((r, i) => {
            console.log(`  Report ${i + 1}: status=${r.reportStatus}, contentLength=${r.reportContent?.htmlContent?.length || 0}`);
        });

        // ✅ Return COMPLETE report data — no stripping
        const fullReports = reports.map(report => ({
            _id: report._id,
            reportId: report.reportId,
            reportType: report.reportType,
            reportStatus: report.reportStatus,
            reportContent: {
                htmlContent: report.reportContent?.htmlContent || '',
                capturedImages: report.reportContent?.capturedImages || [],
                templateInfo: report.reportContent?.templateInfo || null,
                placeholders: report.reportContent?.placeholders || {},
                statistics: report.reportContent?.statistics || {}
            },
            exportInfo: report.exportInfo || {},
            doctorId: report.doctorId,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt
        }));

        res.status(200).json({
            success: true,
            data: {
                reports: fullReports,
                count: fullReports.length,
                studyId
            }
        });

    } catch (error) {
        console.error('❌ [All Reports] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching all reports',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



// ✅ DOWNLOAD REPORT
export const downloadReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const currentUser = req.user;
        
        console.log('⬇️ [Download Report] Starting download for report:', reportId);

        if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid report ID is required'
            });
        }

        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Verify access
        if (report.organizationIdentifier !== currentUser.organizationIdentifier) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this report'
            });
        }

        // Track download
        await report.addDownload(currentUser._id, 'final');

        // If download URL exists, redirect
        if (report.exportInfo?.downloadUrl) {
            console.log('✅ [Download Report] Redirecting to download URL');
            res.status(200).json({
                success: true,
                data: {
                    downloadUrl: report.exportInfo.downloadUrl,
                    fileName: report.exportInfo.fileName,
                    contentType: report.exportInfo.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Download URL not available for this report'
            });
        }

    } catch (error) {
        console.error('❌ [Download Report] Error downloading report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while downloading report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ HELPER FUNCTION - Update study report status
const updateStudyReportStatus = async (study, report, session) => {
    try {
        console.log('🔄 [Helper] Updating study report status for study:', study._id);
        
        // ✅ FIX: reportCount was incrementing on every save including updates,
        // so a single report auto-saved 4 times showed reportCount=4 while
        // reports.length=1. Compute from the actual reports array instead.
        const existingIndex = (study.reports || []).findIndex(
            r => r.reportId?.toString() === report._id.toString()
        );
        const willAddNewEntry = existingIndex === -1;
        const projectedCount = (study.reports?.length || 0) + (willAddNewEntry ? 1 : 0);

        study.currentReportStatus = {
            hasReports: true,
            latestReportId: report._id,
            latestReportStatus: report.reportStatus,
            latestReportType: report.reportType,
            reportCount: projectedCount,
            lastReportedAt: new Date(),
            lastReportedBy: report.doctorId
        };

        // Add to modern reports
        if (!study.reportInfo) {
            study.reportInfo = {};
        }
        if (!study.reportInfo.modernReports) {
            study.reportInfo.modernReports = [];
        }
        
        // ✅ FIX: Check if report already exists to avoid duplicates
        const reportExists = study.reportInfo.modernReports.some(
            r => r.reportId?.toString() === report._id.toString()
        );
        
        if (!reportExists) {
            study.reportInfo.modernReports.push({
                reportId: report._id,
                reportType: report.reportType,
                createdAt: new Date()
            });
        }

        // Add to reports array
        if (!study.reports) {
            study.reports = [];
        }
        
        // ✅ FIX: Check if report already exists to avoid duplicates
        const legacyReportExists = study.reports.some(
            r => r.reportId?.toString() === report._id.toString()
        );
        
        if (!legacyReportExists) {
            study.reports.push({
                reportId: report._id,
                reportType: report.reportType,
                reportStatus: report.reportStatus,
                createdBy: report.createdBy,
                fileName: report.exportInfo?.fileName
            });
        }

        // ✅ CRITICAL FIX: Save the study with session
        sanitizeActionLog(study);
        await study.save({ session });
        
        console.log('✅ [Helper] Study report status updated and saved:', {
            hasReports: study.currentReportStatus.hasReports,
            reportCount: study.currentReportStatus.reportCount,
            modernReportsCount: study.reportInfo.modernReports.length,
            reportsArrayCount: study.reports.length
        });
    } catch (error) {
        console.error('❌ [Helper] Error updating study report status:', error);
        throw error;
    }
};


// Add this new endpoint to get report content for editing
export const getReportForEditing = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { reportId } = req.query; // Optional - get specific report
        const currentUser = req.user;

        console.log('📝 [Report Edit] Getting report for editing:', {
            studyId,
            reportId,
            userId: currentUser._id,
            specificReport: !!reportId
        });

        // Find the report to edit
        let report;
        
        if (reportId) {
            // ✅ Get specific report by ID
            console.log('📝 [Report Edit] Loading specific report:', reportId);
            report = await Report.findById(reportId)
                .populate('doctorId', 'fullName email')
                .populate('patient', 'fullName patientId')
                .populate('dicomStudy');
                
            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Specific report not found'
                });
            }
            
            // Verify the report belongs to the specified study
            if (report.dicomStudy._id.toString() !== studyId) {
                return res.status(400).json({
                    success: false,
                    message: 'Report does not belong to the specified study'
                });
            }
        } else {
            // Get latest draft or finalized report (original logic)
            report = await Report.findOne({
                dicomStudy: studyId,
                reportStatus: { $in: ['draft', 'report_drafted', 'finalized', 'verified', 'report_verified'] },
                organizationIdentifier: currentUser.organizationIdentifier
            })
            .sort({ 
                // Prioritize finalized reports for verification
                reportStatus: 1, // 'draft' < 'finalized' alphabetically
                createdAt: -1 
            })
            .populate('doctorId', 'fullName email')
            .populate('patient', 'fullName patientId')
            .populate('dicomStudy');
        }

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'No report found for editing'
            });
        }

        // Check access permissions
        if (report.organizationIdentifier !== currentUser.organizationIdentifier) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this report'
            });
        }

        console.log('✅ [Report Edit] Report found for editing:', {
            reportId: report._id,
            reportType: report.reportType,
            reportStatus: report.reportStatus,
            contentLength: report.reportContent?.htmlContent?.length || 0,
            specificReportRequested: !!reportId
        });

        res.status(200).json({
            success: true,
            data: {
                report: {
                    _id: report._id,
                    reportId: report.reportId,
                    reportType: report.reportType,
                    reportStatus: report.reportStatus,
                    reportContent: report.reportContent,
                    templateInfo: report.reportContent?.templateInfo,
                    placeholders: report.reportContent?.placeholders,
                    exportInfo: report.exportInfo,
                    createdAt: report.createdAt,
                    updatedAt: report.updatedAt,
                    workflowInfo: report.workflowInfo,
                    doctorId: report.doctorId
                },
                studyInfo: {
                    workflowStatus: report.dicomStudy?.workflowStatus,
                    patientInfo: report.dicomStudy?.patientInfo,
                    studyDate: report.dicomStudy?.studyDate,
                    modality: report.dicomStudy?.modality
                }
            },
            source: reportId ? 'specific_report_edit' : 'latest_report_edit'
        });

    } catch (error) {
        console.error('❌ [Report Edit] Error getting report for editing:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while getting report for editing',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ DELETE REPORT
export const deleteReport = async (req, res) => {
    try {
        console.log('🗑️ [Delete Report] Deleting report:', req.params.reportId);
        const { reportId } = req.params;
        const user = req.user;

        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        if (report.organizationIdentifier !== user.organizationIdentifier) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Remove references from DicomStudy and update report count
        await DicomStudy.findByIdAndUpdate(report.dicomStudy, {
            $pull: {
                reports: { reportId: report._id },
                'reportInfo.modernReports': { reportId: report._id }
            },
            $inc: { 'currentReportStatus.reportCount': -1 }
        });

        await Report.findByIdAndDelete(reportId);

        // Update remaining report count metadata
        const remainingCount = await Report.countDocuments({ dicomStudy: report.dicomStudy });
        await DicomStudy.findByIdAndUpdate(report.dicomStudy, {
            $set: {
                'currentReportStatus.hasReports': remainingCount > 0,
                'currentReportStatus.reportCount': remainingCount,
                'reportInfo.multipleReports': remainingCount > 1,
                'reportInfo.reportCount': remainingCount
            }
        });

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting report:', error);
        res.status(500).json({ success: false, message: 'Failed to delete report' });
    }
};

// ✅ RENAME REPORT
export const renameReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { filename } = req.body;
        const user = req.user;

        if (!filename?.trim()) {
            return res.status(400).json({ success: false, message: 'Filename is required' });
        }

        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        if (report.organizationIdentifier !== user.organizationIdentifier) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const ext = report.exportInfo?.format || 'docx';
        const newFileName = `${filename.trim()}.${ext}`;

        await Report.findByIdAndUpdate(reportId, { $set: { 'exportInfo.fileName': newFileName } });
        res.json({ success: true, message: 'Report renamed successfully', data: { filename: newFileName } });
    } catch (error) {
        console.error('❌ Error renaming report:', error);
        res.status(500).json({ success: false, message: 'Failed to rename report' });
    }
};

// Add this to the existing exports
export default {
    storeDraftReport,
    storeFinalizedReport,
    storeMultipleReports,
    getAllReportsWithContent,
    getStudyReports,
    downloadReport,
    getReportForEditing,
    deleteReport,
    renameReport
};