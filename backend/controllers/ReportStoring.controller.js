import mongoose from 'mongoose';
import Report from '../models/reportModel.js';
import DicomStudy from '../models/dicomStudyModel.js';
import Patient from '../models/patientModel.js';
import User from '../models/userModel.js';
import Organization from '../models/organisation.js';
import { updateWorkflowStatus } from '../utils/workflowStatusManager.js';
export const storeDraftReport = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { 
            templateName, 
            placeholders, 
            htmlContent,
            templateId,
            templateInfo,
            capturedImages = [] // ✅ NEW: Accept captured images
        } = req.body;

        console.log(req.body)
        
        const currentUser = req.user;
        
        console.log('📝 [Draft Store] Starting draft report storage:', {
            studyId,
            userId: currentUser._id,
            userRole: currentUser.role,
            templateName,
            contentLength: htmlContent?.length || placeholders?.['--Content--']?.length || 0,
            hasTemplateInfo: !!templateInfo,
            hasPlaceholders: !!placeholders,
            capturedImagesCount: capturedImages.length // ✅ NEW
        });

        // Validate required data
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

        console.log('✅ [Draft Store] Validation passed, starting transaction');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log('🔍 [Draft Store] Finding study with ID:', studyId);
            
            // 1. Find the study with organization info
            const study = await DicomStudy.findById(studyId)
                .populate('patient', 'fullName patientId dateOfBirth gender')
                .populate('sourceLab', 'name identifier settings.requireReportVerification')
                .session(session);

            console.log('🔍 [Draft Store] Study found:', {
                studyExists: !!study,
                studyId: study?._id,
                patientExists: !!study?.patient,
                organizationIdentifier: study?.organizationIdentifier,
                studyInstanceUID: study?.studyInstanceUID,
                orthancStudyID: study?.orthancStudyID
            });

            if (!study) {
                console.error('❌ [Draft Store] Study not found in database');
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Study not found'
                });
            }

            // ✅ FIX: Handle missing organizationIdentifier
            if (!study.organizationIdentifier) {
                console.log('⚠️ [Draft Store] Study missing organizationIdentifier, setting from user');
                study.organizationIdentifier = currentUser.organizationIdentifier;
                await study.save({ session });
            }

            // 2. Verify user has access to this study
            console.log('🔐 [Draft Store] Checking access:', {
                studyOrg: study.organizationIdentifier,
                userOrg: currentUser.organizationIdentifier,
                hasAccess: study.organizationIdentifier === currentUser.organizationIdentifier
            });

            const hasAccess = study.organizationIdentifier === currentUser.organizationIdentifier;
            if (!hasAccess) {
                console.error('❌ [Draft Store] Access denied');
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this study'
                });
            }

            // 3. Get user's organization
            console.log('🏢 [Draft Store] Finding organization:', currentUser.organizationIdentifier);
            const organization = await Organization.findOne({
                identifier: currentUser.organizationIdentifier
            }).session(session);

            console.log('🏢 [Draft Store] Organization found:', {
                orgExists: !!organization,
                orgId: organization?._id,
                orgName: organization?.name
            });

            // ✅ FIX: Check for ANY existing report (draft OR finalized) for this study by THIS doctor
            console.log('📄 [Draft Store] Checking for existing report');
            let existingReport = await Report.findOne({
                dicomStudy: studyId,
                doctorId: currentUser._id
            }).sort({ createdAt: -1 }).session(session); // Get the latest report

            console.log('📄 [Draft Store] Existing report check:', {
                existingReportExists: !!existingReport,
                existingReportId: existingReport?._id,
                existingReportStatus: existingReport?.reportStatus,
                existingReportType: existingReport?.reportType
            });

            const now = new Date();

            // ✅ ENHANCED: Better patient info extraction
            const patientInfo = {
                fullName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                patientName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                age: placeholders?.['--agegender--']?.split(' / ')[0] || 
                     study.patientInfo?.age || 
                     study.patient?.age || 'N/A',
                gender: study.patient?.gender || 
                       study.patientInfo?.gender || 
                       placeholders?.['--agegender--']?.split(' / ')[1] || 'N/A',
                dateOfBirth: study.patient?.dateOfBirth,
                clinicalHistory: study.clinicalHistory?.clinicalHistory || 
                               study.patient?.clinicalHistory || 'N/A'
            };

            console.log('👤 [Draft Store] Patient info prepared:', patientInfo);

            // ✅ FIX: Handle referringPhysician data safely
            const referringPhysicianData = placeholders?.['--referredby--'] || 
                                          study.referringPhysician || 
                                          study.referringPhysicianName || 
                                          'N/A';

            const referringPhysicianName = typeof referringPhysicianData === 'string' 
                ? referringPhysicianData
                : typeof referringPhysicianData === 'object' && referringPhysicianData?.name
                ? referringPhysicianData.name
                : 'N/A';

            console.log('👨‍⚕️ [Draft Store] Referring physician processed:', {
                original: referringPhysicianData,
                processed: referringPhysicianName,
                type: typeof referringPhysicianName
            });

            const reportData = {
                // ✅ ADD: Required reportId field  
                reportId: existingReport?.reportId || `RPT_${studyId}_${Date.now()}`,
                
                // Core identifiers
                organizationIdentifier: currentUser.organizationIdentifier,
                organization: organization?._id,
                
                // References
                patient: study.patient?._id,
                patientId: study.patientId,
                dicomStudy: studyId,
                
                // ✅ FIX: Handle studyInstanceUID properly with fallbacks
                studyInstanceUID: study.studyInstanceUID || study.orthancStudyID || studyId.toString(),
                orthancStudyID: study.orthancStudyID,
                accessionNumber: study.accessionNumber,
                
                // Personnel
                createdBy: currentUser._id,
                doctorId: currentUser._id,
                
                // Report content
                reportContent: {
                    htmlContent: reportContent,
                    templateInfo: templateInfo || {
                        templateId: templateId || null,
                        templateName: templateName || 'Custom Template',
                        templateCategory: 'General',
                        templateTitle: templateName || 'Draft Report'
                    },
                    placeholders: placeholders || {},
                    // ✅ NEW: Include captured images
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
                
                // Report metadata
                reportType: 'draft',
                reportStatus: 'draft',
                
                // Export info
                exportInfo: {
                    format: 'docx',
                    fileName: templateName || `draft_${studyId}_${Date.now()}.docx`
                },
                
                // Patient info (denormalized)
                patientInfo: patientInfo,
                
                // ✅ FIX: Study info with proper referringPhysician structure
                studyInfo: {
                    studyDate: study.studyDate,
                    modality: study.modality || study.modalitiesInStudy?.join(', '),
                    examDescription: study.examDescription || study.studyDescription,
                    institutionName: study.institutionName,
                    // ✅ FIX: Ensure referringPhysician.name is always a string
                    referringPhysician: {
                        name: referringPhysicianName,
                        institution: typeof study.referringPhysician === 'object' 
                            ? study.referringPhysician?.institution || ''
                            : '',
                        contactInfo: typeof study.referringPhysician === 'object' 
                            ? study.referringPhysician?.contactInfo || ''
                            : ''
                    },
                    seriesCount: study.seriesCount,
                    instanceCount: study.instanceCount,
                    priority: study.studyPriority || study.assignment?.priority,
                    caseType: study.caseType
                },
                
                // Workflow tracking
                workflowInfo: {
                    draftedAt: existingReport?.workflowInfo?.draftedAt || now,
                    statusHistory: existingReport?.workflowInfo?.statusHistory || []
                },
                
                // System info
                systemInfo: {
                    dataSource: 'online_reporting_system'
                }
            };

            // Add status history entry
            reportData.workflowInfo.statusHistory.push({
                status: 'draft',
                changedAt: now,
                changedBy: currentUser._id,
                notes: existingReport ? 'Draft report updated' : 'Draft report created',
                userRole: currentUser.role
            });

            // ✅ ADD: Validate report data before saving
            console.log('🔍 [Draft Store] Validating report data structure');
            const validationErrors = [];
            
            if (!reportData.reportId) validationErrors.push('reportId is required');
            if (!reportData.studyInstanceUID) validationErrors.push('studyInstanceUID is required');
            if (!reportData.organizationIdentifier) validationErrors.push('organizationIdentifier is required');
            if (!reportData.patientId) validationErrors.push('patientId is required');
            if (typeof reportData.studyInfo?.referringPhysician?.name !== 'string') {
                validationErrors.push('studyInfo.referringPhysician.name must be a string');
            }

            if (validationErrors.length > 0) {
                console.error('❌ [Draft Store] Validation errors:', validationErrors);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report data',
                    errors: validationErrors
                });
            }

            console.log('✅ [Draft Store] Report data validation passed');
            console.log('💾 [Draft Store] Report data prepared, saving...');

            let savedReport;

            if (existingReport) {
                // ✅ Update the SAME report to finalized status
                console.log('📝 [Finalize Store] Converting existing report to finalized:', existingReport._id, `(was ${existingReport.reportStatus})`);
                Object.assign(existingReport, reportData);
                savedReport = await existingReport.save({ session });
                console.log('✅ [Finalize Store] Existing report converted to finalized successfully');
            } else {
                // ✅ Only create new if no existing report found (edge case)
                console.log('📝 [Finalize Store] Creating new finalized report (no draft found)');
                savedReport = new Report(reportData);
                await savedReport.save({ session });
                console.log('✅ [Finalize Store] New finalized report created successfully');
            }

            // 5. Update DicomStudy with report reference
            console.log('🔄 [Draft Store] Updating study report status');
            await updateStudyReportStatus(study, savedReport, session);

            // ✅ CRITICAL FIX: Set workflow status to report_drafted (NOT verification_pending)
            console.log('🔄 [Draft Store] Updating workflow status to report_drafted');

            study.workflowStatus = 'report_drafted';
            study.currentCategory = 'DRAFT';
            
            if (!study.reportInfo) study.reportInfo = {};
            study.reportInfo.draftedAt = now;
            study.reportInfo.reporterName = currentUser.fullName;

            // Add to status history
            if (!study.statusHistory) {
                study.statusHistory = [];
            }
            study.statusHistory.push({
                status: 'report_drafted',
                changedAt: now,
                changedBy: currentUser._id,
                note: `Draft report ${existingReport ? 'updated' : 'created'} by ${currentUser.fullName}`
            });

            // Save the study
            await study.save({ session });
            console.log('✅ [Draft Store] Workflow status updated to: report_drafted');

            // ✅ COMMIT TRANSACTION
            console.log('💾 [Draft Store] Committing transaction');
            await session.commitTransaction();

            console.log('✅ [Draft Store] Draft report stored successfully:', {
                reportId: savedReport._id,
                reportType: savedReport.reportType,
                reportStatus: savedReport.reportStatus,
                fileName: savedReport.exportInfo.fileName,
                studyWorkflowStatus: 'report_drafted'
            });

            res.status(200).json({
                success: true,
                message: 'Draft report saved successfully',
                data: {
                    reportId: savedReport._id,
                    documentId: savedReport.reportId,
                    filename: savedReport.exportInfo.fileName,
                    reportType: savedReport.reportType,
                    reportStatus: savedReport.reportStatus,
                    createdAt: savedReport.createdAt,
                    downloadUrl: savedReport.exportInfo.downloadUrl,
                    studyWorkflowStatus: 'report_drafted'
                }
            });

        } catch (error) {
            console.error('❌ [Draft Store] Transaction error:', error);
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ [Draft Store] Error storing draft report:', error);
        console.error('❌ [Draft Store] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error while storing draft report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ FIXED storeFinalizedReport - Updates same report from draft to finalized
export const storeFinalizedReport = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { 
            templateName, 
            placeholders, 
            htmlContent,
            templateId,
            templateInfo,
            format = 'docx',
            capturedImages = []
        } = req.body;

        console.log(req.body)
        
        const currentUser = req.user;
        
        console.log('🏁 [Finalize Store] Starting finalized report storage:', {
            studyId,
            userId: currentUser._id,
            userRole: currentUser.role,
            templateName,
            format,
            contentLength: htmlContent?.length || placeholders?.['--Content--']?.length || 0,
            hasTemplateInfo: !!templateInfo,
            hasPlaceholders: !!placeholders,
            capturedImagesCount: capturedImages.length
        });

        // Validate required data
        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            console.error('❌ [Finalize Store] Invalid study ID:', studyId);
            return res.status(400).json({
                success: false,
                message: 'Valid study ID is required'
            });
        }

        const reportContent = htmlContent || placeholders?.['--Content--'] || '';
        if (!reportContent.trim()) {
            console.error('❌ [Finalize Store] Empty report content');
            return res.status(400).json({
                success: false,
                message: 'Report content is required for finalization'
            });
        }

        console.log('✅ [Finalize Store] Validation passed, starting transaction');

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log('🔍 [Finalize Store] Finding study with ID:', studyId);
            
            // 1. Find the study with organization info
            const study = await DicomStudy.findById(studyId)
                .populate('patient', 'fullName patientId dateOfBirth gender')
                .populate('sourceLab', 'name identifier settings.requireReportVerification')
                .session(session);

            console.log('🔍 [Finalize Store] Study found:', {
                studyExists: !!study,
                studyId: study?._id,
                patientExists: !!study?.patient,
                organizationIdentifier: study?.organizationIdentifier,
                studyInstanceUID: study?.studyInstanceUID,
                orthancStudyID: study?.orthancStudyID
            });

            if (!study) {
                console.error('❌ [Finalize Store] Study not found in database');
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Study not found'
                });
            }

            // ✅ FIX: Handle missing organizationIdentifier
            if (!study.organizationIdentifier) {
                console.log('⚠️ [Finalize Store] Study missing organizationIdentifier, setting from user');
                study.organizationIdentifier = currentUser.organizationIdentifier;
            }

            // 2. Verify user has access to this study
            console.log('🔐 [Finalize Store] Checking access:', {
                studyOrg: study.organizationIdentifier,
                userOrg: currentUser.organizationIdentifier,
                hasAccess: study.organizationIdentifier === currentUser.organizationIdentifier
            });

            const hasAccess = study.organizationIdentifier === currentUser.organizationIdentifier;
            if (!hasAccess) {
                console.error('❌ [Finalize Store] Access denied');
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this study'
                });
            }

            // 3. Get user's organization
            console.log('🏢 [Finalize Store] Finding organization:', currentUser.organizationIdentifier);
            const organization = await Organization.findOne({
                identifier: currentUser.organizationIdentifier
            }).session(session);

            console.log('🏢 [Finalize Store] Organization found:', {
                orgExists: !!organization,
                orgId: organization?._id,
                orgName: organization?.name
            });

            // ✅ CRITICAL FIX: Find ANY existing report for this study by this doctor
            console.log('📄 [Finalize Store] Checking for existing report to finalize');
            let existingReport = await Report.findOne({
                dicomStudy: studyId,
                doctorId: currentUser._id
            }).sort({ createdAt: -1 }).session(session); // Get the latest report

            console.log('📄 [Finalize Store] Existing report check:', {
                existingReportExists: !!existingReport,
                existingReportId: existingReport?._id,
                existingReportStatus: existingReport?.reportStatus,
                existingReportType: existingReport?.reportType
            });

            const now = new Date();

            // ✅ ENHANCED: Better patient info extraction
            const patientInfo = {
                fullName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                patientName: study.patientInfo?.patientName || study.patient?.fullName || 'Unknown Patient',
                age: placeholders?.['--agegender--']?.split(' / ')[0] || 
                     study.patientInfo?.age || 
                     study.patient?.age || 'N/A',
                gender: study.patient?.gender || 
                       study.patientInfo?.gender || 
                       placeholders?.['--agegender--']?.split(' / ')[1] || 'N/A',
                dateOfBirth: study.patient?.dateOfBirth,
                clinicalHistory: study.clinicalHistory?.clinicalHistory || 
                               study.patient?.clinicalHistory || 'N/A'
            };

            console.log('👤 [Finalize Store] Patient info prepared:', patientInfo);

            // ✅ FIX: Handle referringPhysician data safely
            const referringPhysicianData = placeholders?.['--referredby--'] || 
                                          study.referringPhysician || 
                                          study.referringPhysicianName || 
                                          'N/A';

            const referringPhysicianName = typeof referringPhysicianData === 'string' 
                ? referringPhysicianData
                : typeof referringPhysicianData === 'object' && referringPhysicianData?.name
                ? referringPhysicianData.name
                : 'N/A';

            console.log('👨‍⚕️ [Finalize Store] Referring physician processed:', {
                original: referringPhysicianData,
                processed: referringPhysicianName,
                type: typeof referringPhysicianName
            });

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
                createdBy: existingReport?.createdBy || currentUser._id,
                doctorId: currentUser._id,
                reportContent: {
                    htmlContent: reportContent,
                    templateInfo: templateInfo || {
                        templateId: templateId || null,
                        templateName: templateName || 'Custom Template',
                        templateCategory: 'General',
                        templateTitle: templateName || 'Finalized Report'
                    },
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
                exportInfo: {
                    format: format,
                    fileName: templateName || `finalized_${studyId}_${Date.now()}.${format}`
                },
                patientInfo: patientInfo,
                studyInfo: {
                    studyDate: study.studyDate,
                    modality: study.modality || study.modalitiesInStudy?.join(', '),
                    examDescription: study.examDescription || study.studyDescription,
                    institutionName: study.institutionName,
                    // ✅ FIX: Ensure referringPhysician.name is always a string
                    referringPhysician: {
                        name: referringPhysicianName,
                        institution: typeof study.referringPhysician === 'object' 
                            ? study.referringPhysician?.institution || ''
                            : '',
                        contactInfo: typeof study.referringPhysician === 'object' 
                            ? study.referringPhysician?.contactInfo || ''
                            : ''
                    },
                    seriesCount: study.seriesCount,
                    instanceCount: study.instanceCount,
                    priority: study.studyPriority || study.assignment?.priority,
                    caseType: study.caseType
                },
                workflowInfo: {
                    draftedAt: existingReport?.workflowInfo?.draftedAt || now,
                    finalizedAt: now,
                    statusHistory: existingReport?.workflowInfo?.statusHistory || []
                },
                systemInfo: {
                    dataSource: 'online_reporting_system'
                }
            };

            // Add finalization to status history
            reportData.workflowInfo.statusHistory.push({
                status: 'finalized',
                changedAt: now,
                changedBy: currentUser._id,
                notes: existingReport ? 'Draft report finalized' : 'Report created and finalized',
                userRole: currentUser.role
            });

            // ✅ Validate report data before saving
            console.log('🔍 [Finalize Store] Validating report data structure');
            const validationErrors = [];
            
            if (!reportData.reportId) validationErrors.push('reportId is required');
            if (!reportData.studyInstanceUID) validationErrors.push('studyInstanceUID is required');
            if (!reportData.organizationIdentifier) validationErrors.push('organizationIdentifier is required');
            if (!reportData.patientId) validationErrors.push('patientId is required');
            if (typeof reportData.studyInfo?.referringPhysician?.name !== 'string') {
                validationErrors.push('studyInfo.referringPhysician.name must be a string');
            }

            if (validationErrors.length > 0) {
                console.error('❌ [Finalize Store] Validation errors:', validationErrors);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report data',
                    errors: validationErrors
                });
            }

            console.log('✅ [Finalize Store] Report data validation passed');
            console.log('💾 [Finalize Store] Report data prepared, saving...');

            let savedReport;

            if (existingReport) {
                // ✅ Update the SAME report to finalized status
                console.log('📝 [Finalize Store] Converting existing report to finalized:', existingReport._id, `(was ${existingReport.reportStatus})`);
                Object.assign(existingReport, reportData);
                savedReport = await existingReport.save({ session });
                console.log('✅ [Finalize Store] Existing report converted to finalized successfully');
            } else {
                // ✅ Only create new if no existing report found (edge case)
                console.log('📝 [Finalize Store] Creating new finalized report (no draft found)');
                savedReport = new Report(reportData);
                await savedReport.save({ session });
                console.log('✅ [Finalize Store] New finalized report created successfully');
            }

            // 5. Update DicomStudy with finalized report reference
            console.log('🔄 [Finalize Store] Updating study report status');
            await updateStudyReportStatus(study, savedReport, session);

            // ✅ UPDATE WORKFLOW STATUS BASED ON VERIFICATION REQUIREMENT
            console.log('🔄 [Finalize Store] Updating workflow status');

            // Check if verification is required
            const doctorInfo = await mongoose.model('Doctor').findOne({ 
                userAccount: currentUser._id 
            }).select('requireReportVerification').session(session);

            const requiresVerification = study.sourceLab?.settings?.requireReportVerification || 
                                        doctorInfo?.requireReportVerification;

            console.log('📋 [Finalize Store] Verification required:', requiresVerification);

            if (requiresVerification) {
                study.workflowStatus = 'verification_pending';
                study.currentCategory = 'VERIFICATION_PENDING';
                
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.sentForVerificationAt = now;
                study.reportInfo.finalizedAt = now;
                study.reportInfo.reporterName = currentUser.fullName;
            } else {
                study.workflowStatus = 'report_completed';
                study.currentCategory = 'COMPLETED';
                
                if (!study.reportInfo) study.reportInfo = {};
                study.reportInfo.completedAt = now;
                study.reportInfo.finalizedAt = now;
                study.reportInfo.reporterName = currentUser.fullName;
                study.reportInfo.completedWithoutVerification = true;
            }

            // Add to status history
            if (!study.statusHistory) {
                study.statusHistory = [];
            }
            study.statusHistory.push({
                status: study.workflowStatus,
                changedAt: now,
                changedBy: currentUser._id,
                note: `Report finalized by ${currentUser.fullName}${requiresVerification ? ' - sent for verification' : ' - completed'}`
            });

            // Save the study (already has report references from updateStudyReportStatus)
            await study.save({ session });
            console.log('✅ [Finalize Store] Workflow status updated to:', study.workflowStatus);

            // ✅ COMMIT TRANSACTION
            console.log('💾 [Finalize Store] Committing transaction');
            await session.commitTransaction();

            console.log('✅ [Finalize Store] Finalized report stored successfully:', {
                reportId: savedReport._id,
                reportType: savedReport.reportType,
                reportStatus: savedReport.reportStatus,
                fileName: savedReport.exportInfo.fileName,
                studyWorkflowStatus: study.workflowStatus,
                requiresVerification: requiresVerification
            });

            res.status(200).json({
                success: true,
                message: 'Report finalized and stored successfully',
                data: {
                    reportId: savedReport._id,
                    documentId: savedReport.reportId,
                    filename: savedReport.exportInfo.fileName,
                    reportType: savedReport.reportType,
                    reportStatus: savedReport.reportStatus,
                    finalizedAt: savedReport.workflowInfo.finalizedAt,
                    studyWorkflowStatus: study.workflowStatus,
                    requiresVerification: requiresVerification,
                    nextStep: requiresVerification
                        ? 'Report sent to verifier for approval' 
                        : 'Report completed and ready for download',
                    createdAt: savedReport.createdAt
                }
            });

        } catch (error) {
            console.error('❌ [Finalize Store] Transaction error:', error);
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('❌ [Finalize Store] Error storing finalized report:', error);
        console.error('❌ [Finalize Store] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error while storing finalized report',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ GET STUDY REPORTS - For ReportModal
export const getStudyReports = async (req, res) => {
    try {
        const { studyId } = req.params;
        const currentUser = req.user;
        
        console.log('📄 [Get Reports] Fetching reports for study:', studyId);

        if (!studyId || !mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid study ID is required'
            });
        }

        // Find all reports for this study
        const reports = await Report.find({
            dicomStudy: studyId,
            organizationIdentifier: currentUser.organizationIdentifier
        })
        .populate('doctorId', 'fullName email role')
        .populate('verifierId', 'fullName email role')
        .populate('createdBy', 'fullName email role')
        .sort({ createdAt: -1 })
        .lean();

        console.log('📄 [Get Reports] Found reports:', reports.length);

        // Format reports for frontend
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
        
        // Update current report status
        study.currentReportStatus = {
            hasReports: true,
            latestReportId: report._id,
            latestReportStatus: report.reportStatus,
            latestReportType: report.reportType,
            reportCount: (study.currentReportStatus?.reportCount || 0) + 1,
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
                reportStatus: { $in: ['draft', 'finalized'] },
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

// Add this to the existing exports
export default {
    storeDraftReport,
    storeFinalizedReport,
    getStudyReports,
    downloadReport,
    getReportForEditing // ✅ NEW
};