import express from 'express';
import documentsController from '../controllers/documents.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ STUDY REPORTING INFO
router.get('/study/:studyId/reporting-info', protect, documentsController.getStudyReportingInfo);

export default router;