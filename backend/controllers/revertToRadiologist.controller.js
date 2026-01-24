import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import { updateWorkflowStatus } from '../utils/workflowStatusManager.js';

/**
 * Revert report to radiologist with reason
 * Admin can send report back to radiologist for corrections
 */
export const revertToRadiologist = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { reason, notes } = req.body;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        // Validate admin permissions
        if (!['admin', 'super_admin', 'assignor'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can revert reports to radiologists'
            });
        }

        // Validate study ID
        if (!mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid study ID'
            });
        }

        // Validate reason
        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Revert reason is required'
            });
        }

        console.log('🔄 [Revert] Admin reverting study to radiologist:', {
            studyId,
            reason: reason.substring(0, 100),
            adminId: userId,
            adminRole: userRole
        });

        // Find study and populate necessary fields
        const study = await DicomStudy.findOne({
            _id: studyId,
            organization: req.user?.organization
        })
        .populate('radiologist', 'fullName email')
        .populate('patient', 'patientName patientID');

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }

        // Check if study has a radiologist assigned
        if (!study.radiologist && !study.lastAssignedDoctor) {
            return res.status(400).json({
                success: false,
                message: 'No radiologist assigned to this study'
            });
        }

        // Check if study is in a valid state for revert
        const validStatuses = [
            'report_drafted',
            'report_finalized',
            'verification_pending',
            'report_verified',
            'report_completed'
        ];

        if (!validStatuses.includes(study.workflowStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot revert study in status: ${study.workflowStatus}. Only drafted, finalized, or verified reports can be reverted.`
            });
        }

        const previousStatus = study.workflowStatus;

        // Update study status to reverted
        study.workflowStatus = 'revert_to_radiologist';
        study.currentCategory = 'PENDING'; // Put it back in pending category

        // Initialize revertInfo if not exists
        if (!study.revertInfo) {
            study.revertInfo = {
                revertHistory: []
            };
        }

        // Add revert record to history
        const revertRecord = {
            revertedAt: new Date(),
            revertedBy: userId,
            revertedByName: req.user?.fullName || 'Admin',
            revertedByRole: userRole,
            previousStatus,
            reason: reason.trim(),
            notes: notes?.trim() || '',
            resolved: false
        };

        study.revertInfo.revertHistory.push(revertRecord);
        
        // Update current revert info
        study.revertInfo.currentRevert = revertRecord;
        study.revertInfo.isReverted = true;
        study.revertInfo.revertCount = (study.revertInfo.revertCount || 0) + 1;

        // Add to status history
        study.statusHistory.push({
            status: 'revert_to_radiologist',
            changedAt: new Date(),
            changedBy: userId,
            note: `Report reverted to radiologist. Reason: ${reason.substring(0, 200)}`
        });

        // Clear lock if study was locked
        if (study.isLocked) {
            study.isLocked = false;
            study.lockedBy = null;
            study.lockedAt = null;
        }

        // Update report info
        if (!study.reportInfo) {
            study.reportInfo = {};
        }
        study.reportInfo.revertedAt = new Date();
        study.reportInfo.revertedBy = userId;

        // Save study
        await study.save();

        console.log('✅ [Revert] Study reverted successfully:', {
            studyId,
            previousStatus,
            newStatus: 'revert_to_radiologist',
            revertCount: study.revertInfo.revertCount
        });

        // Update workflow status using utility
        try {
            await updateWorkflowStatus({
                studyId: study._id,
                status: 'revert_to_radiologist',
                note: `Admin reverted report: ${reason}`,
                user: req.user
            });
        } catch (workflowError) {
            console.warn('⚠️ [Revert] Workflow status update warning:', workflowError.message);
        }

        // Prepare response
        const radiologistInfo = study.radiologist || { fullName: 'Unknown', email: '' };
        
        res.status(200).json({
            success: true,
            message: 'Report reverted to radiologist successfully',
            data: {
                studyId: study._id,
                bharatPacsId: study.bharatPacsId,
                patientName: study.patient?.patientName || study.patientName,
                previousStatus,
                currentStatus: study.workflowStatus,
                radiologist: {
                    id: study.radiologist?._id,
                    name: radiologistInfo.fullName,
                    email: radiologistInfo.email
                },
                revertInfo: {
                    revertedAt: revertRecord.revertedAt,
                    revertedBy: revertRecord.revertedByName,
                    reason: revertRecord.reason,
                    notes: revertRecord.notes,
                    revertCount: study.revertInfo.revertCount
                }
            }
        });

    } catch (error) {
        console.error('❌ [Revert] Error reverting to radiologist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revert report to radiologist',
            error: error.message
        });
    }
};

/**
 * Get revert history for a study
 */
export const getRevertHistory = async (req, res) => {
    try {
        const { studyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid study ID'
            });
        }

        const study = await DicomStudy.findOne({
            _id: studyId,
            organization: req.user?.organization
        })
        .select('revertInfo bharatPacsId patientName')
        .populate('revertInfo.revertHistory.revertedBy', 'fullName role');

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                studyId: study._id,
                bharatPacsId: study.bharatPacsId,
                revertHistory: study.revertInfo?.revertHistory || [],
                revertCount: study.revertInfo?.revertCount || 0,
                isCurrentlyReverted: study.revertInfo?.isReverted || false
            }
        });

    } catch (error) {
        console.error('❌ [Revert] Error fetching revert history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revert history',
            error: error.message
        });
    }
};

/**
 * Resolve revert (radiologist confirms they've addressed the issues)
 */
export const resolveRevert = async (req, res) => {
    try {
        const { studyId } = req.params;
        const { resolutionNotes } = req.body;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid study ID'
            });
        }

        const study = await DicomStudy.findOne({
            _id: studyId,
            organization: req.user?.organization
        });

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }

        if (study.workflowStatus !== 'revert_to_radiologist') {
            return res.status(400).json({
                success: false,
                message: 'Study is not in reverted status'
            });
        }

        // Mark current revert as resolved
        if (study.revertInfo?.currentRevert) {
            study.revertInfo.currentRevert.resolved = true;
            study.revertInfo.currentRevert.resolvedAt = new Date();
            study.revertInfo.currentRevert.resolvedBy = userId;
            study.revertInfo.currentRevert.resolutionNotes = resolutionNotes?.trim() || '';
        }

        study.revertInfo.isReverted = false;
        study.workflowStatus = 'report_in_progress';
        study.currentCategory = 'PENDING';

        // Add to status history
        study.statusHistory.push({
            status: 'report_in_progress',
            changedAt: new Date(),
            changedBy: userId,
            note: 'Radiologist resolved revert and resumed report work'
        });

        await study.save();

        res.status(200).json({
            success: true,
            message: 'Revert resolved successfully',
            data: {
                studyId: study._id,
                currentStatus: study.workflowStatus
            }
        });

    } catch (error) {
        console.error('❌ [Revert] Error resolving revert:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve revert',
            error: error.message
        });
    }
};