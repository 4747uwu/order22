// backend/routes/dicom.routes.js
import express from 'express';
import { saveExtractedDicomData, uploadZipFromUrl, refreshStudyDownloadUrl } from '../controllers/dicom.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ Endpoint for Python server to send extracted DICOM data
router.post('/save-extracted-data', saveExtractedDicomData);
router.post('/upload-zip-url', uploadZipFromUrl);

// ✅ Refresh expired presigned download URL
router.get('/studies/:studyId/refresh-download-url', protect, refreshStudyDownloadUrl);

export default router;