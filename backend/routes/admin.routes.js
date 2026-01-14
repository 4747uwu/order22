import express from 'express';
import { 
    getValues, 
    getCategoryValues, // ✅ NEW
    getStudiesByCategory, // ✅ NEW
    getPendingStudies, 
    getInProgressStudies, 
    getCompletedStudies, 
    getAllStudiesForAdmin ,
    getOrganizationLabs
} from '../controllers/admin.controller.js';

import {
    createDoctor,
    createLab,
    getAllDoctors,
    getAllLabs,
    updateDoctor,
    updateLab,
    deleteDoctor,
    deleteLab,
    
} from '../controllers/adminCRUD.controller.js';


// ✅ IMPORT USER MANAGEMENT ROUTES
import userManagementRoutes from './userManagement.routes.js';

// ✅ IMPORT ADMIN USER MANAGEMENT
import {
    getOrganizationUsers,
    updateUserCredentials,
    switchUserRole,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    
} from '../controllers/adminUserManagement.controller.js';




import { protect } from '../middleware/authMiddleware.js';
import { updateStudyDetails, getStudyActionLogs, lockStudyForReporting } from '../controllers/Patient.controller.js'; // ✅ ADD getStudyActionLogs

import { toggleStudyLock } from '../controllers/download.controller.js';
import systemOverviewController from '../controllers/systemOverview.controller.js';

// import { getOrganisation}


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

// ✅ CRUD OPERATION ROUTES WITH PROTECTION
router.post('/admin-crud/doctors', protect, createDoctor);
router.get('/admin-crud/doctors', protect, getAllDoctors);
router.put('/admin-crud/doctors/:doctorId', protect, updateDoctor);
router.delete('/admin-crud/doctors/:doctorId', protect, deleteDoctor);

router.post('/admin-crud/labs', protect, createLab);
router.get('/admin-crud/labs', protect, getAllLabs);
router.put('/admin-crud/labs/:labId', protect, updateLab);
router.delete('/admin-crud/labs/:labId', protect, deleteLab);

// ✅ USER MANAGEMENT ROUTES
router.use('/user-management', userManagementRoutes);

// ✅ ADMIN USER MANAGEMENT ROUTES
router.get('/manage-users', protect, getOrganizationUsers);
router.put('/manage-users/:userId/credentials', protect, updateUserCredentials);
router.put('/manage-users/:userId/role', protect, switchUserRole);
router.put('/manage-users/:userId/status', protect, toggleUserStatus);
router.post('/manage-users/:userId/reset-password', protect, resetUserPassword);
router.delete('/manage-users/:userId', protect, deleteUser);


//to get all the labs 
router.get('/labs', protect, getOrganizationLabs);

// ✅ SYSTEM OVERVIEW ROUTES
router.get('/system-overview', 
    protect
    , 
    // authorize(['admin', 'super_admin']), 
    systemOverviewController.getSystemOverview);



export default router;