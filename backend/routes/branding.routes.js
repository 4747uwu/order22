import express from 'express';
import multer from 'multer';
// import { authMiddleware } from '../middleware/authMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import {
    getLabBranding,
    uploadBrandingImage,
    toggleBrandingVisibility,
    deleteBrandingImage
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

// ✅ BRANDING ROUTES (Admin only)
router.get('/labs/:labId/branding', protect, getLabBranding);
router.post('/labs/:labId/branding/upload', protect, upload.single('image'), uploadBrandingImage);
router.patch('/labs/:labId/branding/toggle', protect, toggleBrandingVisibility);
router.delete('/labs/:labId/branding/delete', protect, deleteBrandingImage);

export default router;