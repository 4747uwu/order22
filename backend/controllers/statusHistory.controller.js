import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import StudyViewLog from '../models/studyViewLogModel.js';

export const getStudyStatusHistory = async (req, res) => {
    try {
        const { studyId } = req.params;
        const organizationId = req.user?.organization;

        if (!mongoose.Types.ObjectId.isValid(studyId)) {
            return res.status(400).json({ success: false, message: 'Invalid study ID' });
        }

        const [study, viewLogs] = await Promise.all([
            DicomStudy.findOne({
                _id: studyId,
                organization: organizationId
            })
            .select('statusHistory reportInfo organizationName')
            .populate({
                path: 'statusHistory.changedBy',
                select: 'fullName username role'
            })
            .lean(),

            StudyViewLog.find({ study: studyId })
                .sort({ openedAt: -1 })
                .lean()
        ]);

        if (!study) {
            return res.status(404).json({ success: false, message: 'Study not found' });
        }

        // ✅ Send ALL raw entries — frontend will group
        const timeline = (study.statusHistory || []).map(item => ({
            _id: item._id,
            status: item.status,
            changedAt: item.changedAt,
            changedByName: item.changedBy?.fullName || 'System',
            changedByUsername: item.changedBy?.username || '',
            changedByRole: item.changedBy?.role || '',
            note: item.note || ''
        }));

        // Sort newest first
        timeline.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        // Format view logs
        const viewHistory = viewLogs.map(log => ({
            _id: log._id,
            userName: log.userName,
            userRole: log.userRole,
            mode: log.mode,
            openedAt: log.openedAt,
            closedAt: log.closedAt,
            durationSeconds: log.durationSeconds
        }));

        res.status(200).json({
            success: true,
            timeline,
            viewHistory,
            reportInfo: study.reportInfo,
            organizationName: study.organizationName,
            totalOccurrences: timeline.length
        });

    } catch (error) {
        console.error('❌ Error fetching status history:', error);
        res.status(500).json({ success: false, message: 'Error fetching status history', error: error.message });
    }
};