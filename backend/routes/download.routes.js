import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    getCloudflareZipUrl,
    downloadAnonymizedStudy,  // ✅ NEW
    downloadSeries,           // ✅ NEW
    getStudySeries,
    toggleStudyLock
} from '../controllers/download.controller.js';

const router = express.Router();

// Download routes
router.get('/cloudflare-zip/:studyId', protect, getCloudflareZipUrl);
// ✅ NEW: Proxy download routes
router.get('/anonymized/:studyId', protect, downloadAnonymizedStudy);
router.get('/series/:studyId/:seriesId', protect, downloadSeries);
// router.delete('/cleanup-anonymized/:anonymizedStudyId', protect, cleanupAnonymizedStudy); // ✅ NEW
router.get('/study-series/:studyId', protect, getStudySeries);

export default router;