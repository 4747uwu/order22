import express from 'express';
import reportStoringController from '../controllers/ReportStoring.controller.js';
import ReportDownloadController from '../controllers/ReportDownload.controller.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ REPORT STORAGE ROUTES
router.post('/studies/:studyId/store-draft', protect, reportStoringController.storeDraftReport);
router.post('/studies/:studyId/store-finalized', protect, reportStoringController.storeFinalizedReport);
// Add this route (assuming you have a reports router)
router.get('/studies/:studyId/edit-report', protect, reportStoringController.getReportForEditing);

// ✅ REPORT RETRIEVAL ROUTES
router.get('/studies/:studyId/reports', protect, reportStoringController.getStudyReports);
router.get('/reports/:reportId/download', protect, reportStoringController.downloadReport);


//Report download Routes 

// Add to your reports routes file

// Download routes
router.use(protect);
router.get('/reports/:reportId/download/pdf', ReportDownloadController.downloadReportAsPDF);
router.get('/reports/:reportId/download/docx', ReportDownloadController.downloadReportAsDOCX);

export default router;