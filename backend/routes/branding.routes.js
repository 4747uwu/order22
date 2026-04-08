import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
    getLabBranding,
    uploadBrandingImage,
    toggleBrandingVisibility,
    deleteBrandingImage,
    updatePaperSettings,
    getOwnLabBranding,
    uploadOwnLabBrandingImage,
    toggleOwnLabBrandingVisibility,
    deleteOwnLabBrandingImage
} from '../controllers/branding.controller.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit (will be compressed)
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    }
});

// ✅ ADMIN ROUTES - Manage any lab branding
router.get('/labs/:labId/branding', protect, getLabBranding);
router.post('/labs/:labId/branding/upload', protect, upload.single('image'), uploadBrandingImage);
router.patch('/labs/:labId/branding/toggle', protect, toggleBrandingVisibility);
router.patch('/labs/:labId/branding/settings', protect, updatePaperSettings);
router.delete('/labs/:labId/branding/:type', protect, deleteBrandingImage);

// ✅ LAB STAFF ROUTES - Manage own lab branding only
router.get('/my-lab/branding', protect, getOwnLabBranding);
router.post('/my-lab/branding/upload', protect, upload.single('image'), uploadOwnLabBrandingImage);
router.patch('/my-lab/branding/toggle', protect, toggleOwnLabBrandingVisibility);
router.delete('/my-lab/branding/:type', protect, deleteOwnLabBrandingImage);

export default router;