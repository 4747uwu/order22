import express from 'express';
import doctorController from '../controllers/doctor.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ DOCTOR DASHBOARD ROUTES (same structure as admin)
router.get('/values', protect, doctorController.getValues);
router.get('/studies/pending', protect, doctorController.getPendingStudies);
router.get('/studies/inprogress', protect, doctorController.getInProgressStudies);
router.get('/studies/completed', protect, doctorController.getCompletedStudies);
router.get('/studies', protect, doctorController.getAllStudiesForDoctor);
router.post('/create-typist', protect, doctorController.createTypist);
router.get('/studies/accepted',protect, doctorController.getAcceptedStudies);
router.get('/studies/rejected',protect, doctorController.getRejectedStudies);
export default router;