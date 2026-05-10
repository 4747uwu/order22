import express from 'express';
import { backupSwitch, restoreFromBackup, checkOrthancAvailability } from '../controllers/backupOhifSwitch.controller.js';

const router = express.Router();

// Accept text/plain or JSON (using express.text middleware for raw body)
router.post('/switch', express.text({ type: '*/*' }), backupSwitch);

// Restore study from R2 backup to backup Orthanc
router.post('/restore', express.json(), restoreFromBackup);

// Check if a study is currently accessible on Orthanc (before deciding to restore)
router.get('/check-availability/:studyId', checkOrthancAvailability);

export default router;