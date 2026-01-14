import mongoose from 'mongoose';
import Lab from '../models/labModel.js';
import sharp from 'sharp'; // For image processing

// ✅ GET LAB BRANDING
export const getLabBranding = async (req, res) => {
    try {
        const { labId } = req.params;

        // Validate lab ID
        if (!mongoose.Types.ObjectId.isValid(labId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lab ID'
            });
        }

        const lab = await Lab.findOne({
            _id: labId,
            organizationIdentifier: req.user.organizationIdentifier
        }).select('reportBranding');

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        console.log('✅ Branding data fetched for lab:', labId);

        res.json({
            success: true,
            data: lab.reportBranding || {}
        });

    } catch (error) {
        console.error('❌ Get lab branding error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch branding data'
        });
    }
};

// ✅ UPLOAD BRANDING IMAGE (Store in MongoDB as Base64)
export const uploadBrandingImage = async (req, res) => {
    try {
        const { labId } = req.params;
        const { type } = req.body; // 'header' or 'footer'
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        if (!['header', 'footer'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Must be "header" or "footer"'
            });
        }

        // Validate lab
        const lab = await Lab.findOne({
            _id: labId,
            organizationIdentifier: req.user.organizationIdentifier
        });

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        console.log('📤 Processing branding image:', {
            labId,
            type,
            fileName: file.originalname,
            originalSize: file.size,
            mimeType: file.mimetype
        });

        // 1. Get the aspect ratio for this type
        const aspectRatio = lab.reportBranding?.[`${type}AspectRatio`] || 5;

        // 2. Process image with Sharp (resize, optimize)
        const processedImageBuffer = await sharp(file.buffer)
            .resize(1500, Math.round(1500 / aspectRatio), {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toBuffer();

        // 3. Get image dimensions
        const metadata = await sharp(processedImageBuffer).metadata();

        // 4. Convert to Base64 string
        const base64Image = processedImageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;

        console.log('📊 Image processed:', {
            originalSize: file.size,
            processedSize: processedImageBuffer.length,
            width: metadata.width,
            height: metadata.height,
            compression: `${((1 - processedImageBuffer.length / file.size) * 100).toFixed(1)}%`
        });

        // 5. Validate size (MongoDB document limit is 16MB, but we'll keep it under 4MB)
        const sizeInMB = processedImageBuffer.length / (1024 * 1024);
        if (sizeInMB > 4) {
            return res.status(400).json({
                success: false,
                message: `Processed image is too large (${sizeInMB.toFixed(2)}MB). Please use a smaller image.`
            });
        }

        // 6. Update lab document in MongoDB
        const updateField = `reportBranding.${type}Image`;
        const updatedLab = await Lab.findByIdAndUpdate(
            labId,
            {
                $set: {
                    [`${updateField}.url`]: dataUrl, // Base64 data URL
                    [`${updateField}.width`]: metadata.width,
                    [`${updateField}.height`]: metadata.height,
                    [`${updateField}.size`]: processedImageBuffer.length,
                    [`${updateField}.updatedAt`]: new Date(),
                    [`${updateField}.updatedBy`]: req.user._id
                },
                $unset: {
                    // Remove old Wasabi keys if they exist
                    [`${updateField}.wasabiKey`]: '',
                    [`${updateField}.cloudflareKey`]: ''
                }
            },
            { new: true }
        ).select('reportBranding');

        console.log('✅ Branding image saved to MongoDB:', {
            labId,
            type,
            size: `${sizeInMB.toFixed(2)}MB`,
            dimensions: `${metadata.width}x${metadata.height}`
        });

        res.json({
            success: true,
            message: `${type} image uploaded successfully`,
            data: {
                [`${type}Image`]: {
                    url: dataUrl,
                    width: metadata.width,
                    height: metadata.height,
                    size: processedImageBuffer.length,
                    updatedAt: new Date(),
                    updatedBy: req.user._id
                }
            }
        });

    } catch (error) {
        console.error('❌ Upload branding image error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload image'
        });
    }
};

// ✅ TOGGLE BRANDING VISIBILITY
export const toggleBrandingVisibility = async (req, res) => {
    try {
        const { labId } = req.params;
        const { field, value } = req.body; // field: 'showHeader' or 'showFooter', value: true/false

        if (!['showHeader', 'showFooter'].includes(field)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid field. Must be "showHeader" or "showFooter"'
            });
        }

        const lab = await Lab.findOneAndUpdate(
            {
                _id: labId,
                organizationIdentifier: req.user.organizationIdentifier
            },
            {
                $set: { [`reportBranding.${field}`]: value }
            },
            { new: true }
        ).select('reportBranding');

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        console.log('✅ Branding visibility toggled:', { labId, field, value });

        res.json({
            success: true,
            message: 'Visibility updated successfully',
            data: lab.reportBranding
        });

    } catch (error) {
        console.error('❌ Toggle branding visibility error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update visibility'
        });
    }
};

// ✅ DELETE BRANDING IMAGE
export const deleteBrandingImage = async (req, res) => {
    try {
        const { labId } = req.params;
        const { type } = req.body; // 'header' or 'footer'

        if (!['header', 'footer'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid type. Must be "header" or "footer"'
            });
        }

        const updateField = `reportBranding.${type}Image`;
        const lab = await Lab.findOneAndUpdate(
            {
                _id: labId,
                organizationIdentifier: req.user.organizationIdentifier
            },
            {
                $set: {
                    [`${updateField}.url`]: '',
                    [`${updateField}.width`]: 0,
                    [`${updateField}.height`]: 0,
                    [`${updateField}.size`]: 0,
                    [`${updateField}.updatedAt`]: new Date(),
                    [`${updateField}.updatedBy`]: req.user._id
                }
            },
            { new: true }
        ).select('reportBranding');

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        console.log('✅ Branding image deleted:', { labId, type });

        res.json({
            success: true,
            message: `${type} image deleted successfully`,
            data: lab.reportBranding
        });

    } catch (error) {
        console.error('❌ Delete branding image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image'
        });
    }
};

export default {
    getLabBranding,
    uploadBrandingImage,
    toggleBrandingVisibility,
    deleteBrandingImage
};