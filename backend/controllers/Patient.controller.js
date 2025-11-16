import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import User from '../models/userModel.js';
import Lab from '../models/labModel.js';
import Organization from '../models/organisation.js';
import { formatStudiesForWorklist } from '../utils/formatStudies.js';



export const updateStudyDetails = async (req, res) => {
    try {
        const { studyId } = req.params;
        const {
            patientName,
            patientAge,
            patientGender,
            studyName,
            referringPhysician,
            accessionNumber,
            clinicalHistory
        } = req.body;

        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        console.log(`📝 Updating study details for ${studyId}:`, {
            patientName,
            patientAge,
            patientGender,
            studyName,
            referringPhysician,
            clinicalHistory: clinicalHistory?.substring(0, 50) + '...'
        });

        // Find study
        const study = await DicomStudy.findOne({
            _id: studyId,
            organizationIdentifier: user.organizationIdentifier
        });

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }

        // ✅ CHECK IF STUDY IS LOCKED
        if (study.studyLock?.isLocked) {
            return res.status(423).json({
                success: false,
                message: `Study is locked by ${study.studyLock.lockedByName}. Cannot edit while locked.`,
                lockedBy: study.studyLock.lockedByName,
                lockedAt: study.studyLock.lockedAt
            });
        }

        // Build update object
        const updateData = {};

        if (patientName) {
            updateData['patientInfo.patientName'] = patientName;
        }
        
        if (patientAge) {
            updateData.age = patientAge;
            updateData['patientInfo.age'] = patientAge;
        }
        
        if (patientGender) {
            updateData.gender = patientGender;
            updateData['patientInfo.gender'] = patientGender;
        }
        
        if (studyName) {
            updateData.examDescription = studyName;
        }
        
        if (referringPhysician) {
            updateData.referringPhysicianName = referringPhysician;
            updateData['physicians.referring.name'] = referringPhysician;
        }
        
        if (accessionNumber) {
            updateData.accessionNumber = accessionNumber;
        }
        
        if (clinicalHistory !== undefined) {
            updateData['clinicalHistory.clinicalHistory'] = clinicalHistory;
            updateData['clinicalHistory.lastModifiedBy'] = user._id;
            updateData['clinicalHistory.lastModifiedAt'] = new Date();
            updateData['clinicalHistory.lastModifiedFrom'] = 'admin_panel';

            // ✅ Update category/workflow when clinical history is created/updated
            updateData.currentCategory = 'HISTORY_CREATED';
            updateData.workflowStatus = 'history_created';

            // update categoryTracking.historyCreated metadata
            updateData['categoryTracking.historyCreated.lastUpdatedAt'] = new Date();
            updateData['categoryTracking.historyCreated.lastUpdatedBy'] = user._id;
            updateData['categoryTracking.historyCreated.isComplete'] = true;
        }

        // Update study
        const updatedStudy = await DicomStudy.findByIdAndUpdate(
            studyId,
            {
                $set: updateData,
                $push: {
                    statusHistory: {
                        status: 'study_details_updated',
                        changedAt: new Date(),
                        changedBy: user._id,
                        note: `Study details updated by ${user.fullName || user.email}`
                    },
                    actionLog: {
                        actionType: 'history_created',
                        actionCategory: 'administrative',
                        performedBy: user._id,
                        performedByName: user.fullName || user.email,
                        performedByRole: user.role,
                        performedAt: new Date(),
                        actionDetails: {
                            changes: {
                                patientName,
                                patientAge,
                                patientGender,
                                studyName,
                                referringPhysician,
                                accessionNumber,
                                clinicalHistoryUpdated: !!clinicalHistory
                            }
                        },
                        notes: 'Study details updated via patient edit modal'
                    }
                }
            },
            { new: true, runValidators: true }
        )
        .populate('organization', 'name identifier')
        .populate('patient', 'patientID patientNameRaw')
        .populate('sourceLab', 'name identifier');

        console.log(`✅ Study details updated successfully for ${studyId}`);

        res.json({
            success: true,
            message: 'Study details updated successfully',
            data: updatedStudy
        });

    } catch (error) {
        console.error('❌ Error updating study details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update study details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ GET STUDY ACTION LOGS FOR TIMELINE
export const getStudyActionLogs = async (req, res) => {
    try {
        const { studyId } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        console.log(`📊 Fetching action logs for study ${studyId} by ${user.email}`);

        // Find study with action logs and populate organization/lab
        const study = await DicomStudy.findOne({
            _id: studyId,
            organizationIdentifier: user.organizationIdentifier
        })
        .select('_id bharatPacsId patientInfo patientId modality studyDate studyTime createdAt workflowStatus currentCategory actionLog seriesCount instanceCount organization sourceLab')
        .populate('organization', 'name identifier')
        .populate('sourceLab', 'name identifier')
        .lean();

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }
        console.log(study.actionLog)

        // ✅ ADD FORMATTED FIELDS
        study.patientName = study.patientInfo?.patientName || 'Unknown Patient';
        study.centerName = study.sourceLab?.name || '-';
        study.organizationName = study.organization?.name || '-';
        study.uploadedByName = 'System'; // Default

        // Sort action logs by performedAt descending (most recent first)
        if (study.actionLog && Array.isArray(study.actionLog)) {
            study.actionLog.sort((a, b) => {
                const timeA = a.performedAt ? new Date(a.performedAt).getTime() : 0;
                const timeB = b.performedAt ? new Date(b.performedAt).getTime() : 0;
                return timeB - timeA;
            });
        }

        console.log(`✅ Found ${study.actionLog?.length || 0} action logs for study ${studyId}`);

        res.json({
            success: true,
            message: 'Action logs fetched successfully',
            data: study
        });

    } catch (error) {
        console.error('❌ Error fetching study action logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch action logs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
