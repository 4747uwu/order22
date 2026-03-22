// backend/routes/dicom.routes.js
import express from 'express';
import { saveExtractedDicomData, uploadZipFromUrl } from '../controllers/dicom.controller.js';

const router = express.Router();

// ✅ Endpoint for Python server to send extracted DICOM data
router.post('/save-extracted-data', saveExtractedDicomData);
router.post('/upload-zip-url', uploadZipFromUrl);

export default router;