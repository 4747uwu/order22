import express from 'express';
import { 
    getValues, 
    getCategoryValues, // ✅ NEW
    getStudiesByCategory, // ✅ NEW
    getPendingStudies, 
    getInProgressStudies, 
    getCompletedStudies, 
    getAllStudiesForAdmin 
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { updateStudyDetails, getStudyActionLogs, lockStudyForReporting } from '../controllers/Patient.controller.js'; // ✅ ADD getStudyActionLogs

import { toggleStudyLock } from '../controllers/download.controller.js';


const router = express.Router();

// ✅ Protect all admin routes
router.use(protect);
// router.use(authorize('admin', 'super_admin'));

// ✅ Analytics endpoints
router.get('/values', getValues);
router.get('/category-values', getCategoryValues); // ✅ NEW

// ✅ Category-based study endpoints
router.get('/studies/category/:category', getStudiesByCategory); // ✅ NEW

// ✅ Add this route
router.put('/studies/:studyId/details', protect, updateStudyDetails);

// ✅ ADD THIS ROUTE
router.get('/study-action-logs/:studyId', protect, getStudyActionLogs);

// Legacy endpoints (keep for backwards compatibility)
router.get('/studies/pending', getPendingStudies);
router.get('/studies/inprogress', getInProgressStudies);
router.get('/studies/completed', getCompletedStudies);
router.get('/studies', getAllStudiesForAdmin);
router.post('/studies/:studyId/lock',  lockStudyForReporting);


router.post('/toggle-study-lock/:studyId', protect, toggleStudyLock);
export default router;