import express from 'express';
import typistController from '../controllers/typist.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ TYPIST DASHBOARD ROUTES (same structure as doctor)
router.get('/values', protect, typistController.getValues);
router.get('/studies/pending', protect, typistController.getPendingStudies);
router.get('/studies/inprogress', protect, typistController.getInProgressStudies);
router.get('/studies/completed', protect, typistController.getCompletedStudies);
router.get('/studies', protect, typistController.getAllStudiesForTypist);

// ✅ TYPIST-SPECIFIC ROUTES
router.get('/radiologist', protect, typistController.getLinkedRadiologist);

export default router;