import express from 'express';
import {
    getPendingStudies,
    getInProgressStudies,
    getCompletedStudies,
    getAllStudiesForAdmin,
    getValues
} from '../controllers/admin.controller.js';

import {
    createDoctor,
    createLab,
    getAllDoctors,
    getAllLabs,
    updateDoctor,
    updateLab,
    deleteDoctor,
    deleteLab
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
    deleteUser
} from '../controllers/adminUserManagement.controller.js';

import { protect } from '../middleware/authMiddleware.js';
// import { authenticate, authorize } from '../middleware/auth.js';
import systemOverviewController from '../controllers/systemOverview.controller.js';

const router = express.Router();

// ✅ VALUES ENDPOINT FOR DASHBOARD COUNTS
router.get('/values', protect, getValues);

// ✅ STUDIES ENDPOINTS
router.get('/studies/pending', protect, getPendingStudies);
router.get('/studies/inprogress', protect, getInProgressStudies);
router.get('/studies/completed', protect, getCompletedStudies);
router.get('/studies', protect, getAllStudiesForAdmin);

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

// ✅ SYSTEM OVERVIEW ROUTES
router.get('/system-overview', 
    protect
    , 
    // authorize(['admin', 'super_admin']), 
    systemOverviewController.getSystemOverview
);

router.get('/system-health', 
    protect
    , 
    // authorize(['admin', 'super_admin']), 
    systemOverviewController.getSystemHealth
);

router.get('/organization-summary', 
    protect
    , 
    // authorize(['super_admin']), 
    systemOverviewController.getOrganizationSummary
);

export default router;