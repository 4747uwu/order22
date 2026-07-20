import express from 'express';
import QRDownloaderController from '../controllers/qr.dowload.controller.js';

const router = express.Router();

// ✅ PUBLIC routes — no auth middleware needed (QR codes are scanned publicly)

// GET /api/qr/:studyId/info              → metadata only
router.get('/:studyId/info', QRDownloaderController.getReportInfo);

// GET /api/qr/:studyId/check-availability → is the study on Orthanc right now?
router.get('/:studyId/check-availability', QRDownloaderController.checkStudyAvailability);

// POST /api/qr/:studyId/restore           → pull from R2 backup into Orthanc
router.post('/:studyId/restore', QRDownloaderController.restoreStudy);

// GET /api/qr/:studyId                    → download PDF directly (must be last)
router.get('/:studyId', QRDownloaderController.handleQRScan);

export default router;