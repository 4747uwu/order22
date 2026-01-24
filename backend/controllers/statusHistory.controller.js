import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import User from '../models/userModel.js';

/**
 * Get populated status history for a study
 * Populates changedBy with user details
 * Returns timeline sorted by date (most recent first)
 */
export const getStudyStatusHistory = async (req, res) => {
    try {
        const { studyId } = req.params;
        const organizationId = req.user?.organization;

        if (!mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid study ID' 
            });
        }

        // Find study and populate statusHistory.changedBy
        const study = await DicomStudy.findOne({
            _id: studyId,
            organization: organizationId
        })
        .select('statusHistory reportInfo sourceLab createdAt uploadDate organizationName')
        .populate({
            path: 'statusHistory.changedBy',
            select: 'fullName username role'
        })
        .populate({
            path: 'sourceLab',
            select: 'name labIdentifier'
        })
        .lean();

        if (!study) {
            return res.status(404).json({ 
                success: false, 
                message: 'Study not found' 
            });
        }

        // Format status history with populated data
        const formattedHistory = study.statusHistory.map(item => ({
            _id: item._id,
            status: item.status,
            changedAt: item.changedAt,
            changedByName: item.changedBy?.fullName || 'System',
            changedByUsername: item.changedBy?.username || '',
            changedByRole: item.changedBy?.role || '',
            note: item.note || ''
        }));

        // Add initial upload entry
        const uploadEntry = {
            _id: `upload-${study._id}`,
            status: 'study_uploaded',
            changedAt: study.createdAt || study.uploadDate,
            changedByName: 'System',
            changedByUsername: '',
            changedByRole: '',
            note: `Study uploaded from ${study.sourceLab?.name || 'Unknown Lab'}`,
            isUpload: true
        };

        // Combine and sort by date (most recent first)
        const timeline = [uploadEntry, ...formattedHistory].sort((a, b) => {
            const dateA = new Date(a.changedAt).getTime();
            const dateB = new Date(b.changedAt).getTime();
            return dateB - dateA; // Descending order (most recent first)
        });

        res.status(200).json({
            success: true,
            timeline,
            reportInfo: study.reportInfo,
            organizationName: study.organizationName
        });

    } catch (error) {
        console.error('❌ Error fetching status history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching status history',
            error: error.message 
        });
    }
};