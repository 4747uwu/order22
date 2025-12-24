import express from 'express';
import doctorController from '../controllers/doctor.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import DoctorCRUDController from '../controllers/doctorCRUD.controller.js';

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



// Doctor profile management routes
router.get('/profile', protect, DoctorCRUDController.getDoctorProfile);
router.put('/profile', protect, DoctorCRUDController.updateDoctorProfile);
router.post('/signature', protect, DoctorCRUDController.updateSignature);
router.delete('/signature', protect, DoctorCRUDController.deleteSignature);


export default router;