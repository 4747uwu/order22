import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import User from '../models/userModel.js';

/**
 * Get populated status history for a study - GROUPED WITH COUNTS
 * Shows each unique status once with count and latest occurrence
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
        .select('statusHistory reportInfo sourceLab createdAt uploadDate organizationName printHistory auditLog')
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

        // ✅ Group all status entries by status type with count
        const statusGroups = {};
        
        study.statusHistory.forEach(item => {
            const status = item.status;
            
            if (!statusGroups[status]) {
                statusGroups[status] = {
                    status: status,
                    count: 0,
                    allOccurrences: []
                };
            }
            
            statusGroups[status].count++;
            statusGroups[status].allOccurrences.push({
                _id: item._id,
                changedAt: item.changedAt,
                changedByName: item.changedBy?.fullName || 'System',
                changedByUsername: item.changedBy?.username || '',
                changedByRole: item.changedBy?.role || '',
                note: item.note || ''
            });
        });

        // ✅ For each status group, get the LATEST occurrence
        const timeline = Object.keys(statusGroups).map(status => {
            const group = statusGroups[status];
            
            // Sort occurrences by date (most recent first)
            group.allOccurrences.sort((a, b) => 
                new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
            );
            
            // Get the latest occurrence
            const latest = group.allOccurrences[0];
            
            return {
                _id: latest._id,
                status: group.status,
                changedAt: latest.changedAt,
                changedByName: latest.changedByName,
                changedByUsername: latest.changedByUsername,
                changedByRole: latest.changedByRole,
                note: latest.note,
                count: group.count, // ✅ Add count field
                occurrences: group.allOccurrences.length > 1 ? 
                    `${group.allOccurrences.length} times` : '1 time'
            };
        });

        // ✅ Sort timeline by latest occurrence date (most recent first)
        timeline.sort((a, b) => {
            const dateA = new Date(a.changedAt).getTime();
            const dateB = new Date(b.changedAt).getTime();
            return dateB - dateA;
        });

        res.status(200).json({
            success: true,
            timeline,
            reportInfo: study.reportInfo,
            organizationName: study.organizationName,
            totalEvents: timeline.length,
            totalOccurrences: study.statusHistory.length
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