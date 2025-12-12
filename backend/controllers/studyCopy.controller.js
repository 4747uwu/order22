// backend/controllers/studyCopy.controller.js

import DicomStudy, { ACTION_TYPES } from '../models/dicomStudyModel.js';
import Patient from '../models/patientModel.js';
import Document from '../models/documentModal.js';
import Organization from '../models/organisation.js';
import { wasabiS3Client, wasabiConfig } from '../config/wasabi-s3.js';
import { CopyObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// ✅ HELPER: Generate new BharatPacsId
const generateBharatPacsId = (orgIdentifier, labIdentifier) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `BP-${orgIdentifier}-${labIdentifier}-${timestamp}-${random}`;
};

// ✅ SIMPLIFIED: Copy study to CURRENT organization (no target selection needed)
export const copyStudyToOrganization = async (req, res) => {
    try {
        const { bharatPacsId } = req.params;
        const { copyAttachments = true, reason = 'Study transfer' } = req.body;
        const user = req.user;

        console.log(`📋 Copying study ${bharatPacsId} to current organization ${user.organizationIdentifier}`);

        // Validate user has permission (super_admin or admin)
        if (!['super_admin', 'admin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only super_admin or admin can copy studies between organizations'
            });
        }

        // Find source study
        const sourceStudy = await DicomStudy.findOne({ bharatPacsId })
            .populate('organization', 'name identifier')
            .populate('sourceLab', 'name identifier')
            .populate('patient')
            .lean();

        if (!sourceStudy) {
            return res.status(404).json({
                success: false,
                message: 'Source study not found with this BP ID'
            });
        }

        // ✅ TARGET ORG IS CURRENT USER'S ORG
        const targetOrg = await Organization.findOne({ identifier: user.organizationIdentifier });
        
        if (!targetOrg) {
            return res.status(404).json({
                success: false,
                message: 'Your organization not found'
            });
        }

        // ✅ CHECK: Can't copy to same organization
        if (sourceStudy.organizationIdentifier === user.organizationIdentifier) {
            return res.status(400).json({
                success: false,
                message: 'Cannot copy study to the same organization. Please switch to a different organization first.'
            });
        }

        // Create or find patient in target organization
        const targetPatient = await Patient.findOneAndUpdate(
            {
                organizationIdentifier: targetOrg.identifier,
                patientID: sourceStudy.patientId
            },
            {
                $setOnInsert: {
                    organization: targetOrg._id,
                    organizationIdentifier: targetOrg.identifier,
                    patientID: sourceStudy.patientId,
                    firstName: sourceStudy.patient?.firstName || '',
                    lastName: sourceStudy.patient?.lastName || '',
                    patientNameRaw: sourceStudy.patientInfo?.patientName || '',
                    gender: sourceStudy.patientInfo?.gender || '',
                    ageString: sourceStudy.patientInfo?.age || '',
                    dateOfBirth: sourceStudy.patient?.dateOfBirth || '',
                    clinicalInfo: sourceStudy.patient?.clinicalInfo || {}
                }
            },
            { upsert: true, new: true }
        );

        // Generate new BharatPacsId for copied study
        const newBharatPacsId = generateBharatPacsId(
            targetOrg.identifier,
            sourceStudy.sourceLab?.identifier || 'LAB'
        );

        // Create copied study (deep copy)
        const copiedStudyData = {
            // New identifiers
            bharatPacsId: newBharatPacsId,
            studyInstanceUID: `${sourceStudy.studyInstanceUID}_COPY_${Date.now()}`,
            orthancStudyID: null,
            
            // Target organization
            organization: targetOrg._id,
            organizationIdentifier: targetOrg.identifier,
            
            // Patient reference
            patient: targetPatient._id,
            patientId: targetPatient.patientID,
            patientInfo: sourceStudy.patientInfo,
            
            // Copy all study data
            studyDate: sourceStudy.studyDate,
            studyTime: sourceStudy.studyTime,
            modality: sourceStudy.modality,
            modalitiesInStudy: sourceStudy.modalitiesInStudy,
            accessionNumber: sourceStudy.accessionNumber,
            studyDescription: sourceStudy.studyDescription,
            examDescription: sourceStudy.examDescription,
            
            // Series and instances
            seriesCount: sourceStudy.seriesCount,
            instanceCount: sourceStudy.instanceCount,
            seriesImages: sourceStudy.seriesImages,
            
            // Clinical information
            clinicalHistory: sourceStudy.clinicalHistory,
            referringPhysician: sourceStudy.referringPhysician,
            referringPhysicianName: sourceStudy.referringPhysicianName,
            physicians: sourceStudy.physicians,
            institutionName: sourceStudy.institutionName,
            
            // Reset workflow
            workflowStatus: 'new_study_received',
            currentCategory: 'CREATED',
            assignment: [],
            sourceLab: null,
            
            // Reports
            reportInfo: {
                verificationInfo: { verificationStatus: 'pending' },
                modernReports: []
            },
            doctorReports: [],
            uploadedReports: [],
            
            // Copy tracking
            copiedFrom: {
                studyId: sourceStudy._id,
                bharatPacsId: sourceStudy.bharatPacsId,
                organizationIdentifier: sourceStudy.organizationIdentifier,
                organizationName: sourceStudy.organization?.name,
                copiedAt: new Date(),
                copiedBy: user._id,
                reason
            },
            
            isCopiedStudy: true,
            
            // Category tracking
            categoryTracking: {
                created: {
                    uploadedAt: new Date(),
                    uploadedBy: user._id,
                    uploadSource: 'study_copy',
                    instancesReceived: sourceStudy.instanceCount,
                    seriesReceived: sourceStudy.seriesCount
                },
                currentCategory: 'CREATED'
            },
            
            // Action log
            actionLog: [{
                actionType: ACTION_TYPES.STUDY_COPIED,
                actionCategory: 'administrative',
                performedBy: user._id,
                performedByName: user.fullName,
                performedByRole: user.role,
                performedAt: new Date(),
                actionDetails: {
                    previousValue: {
                        bharatPacsId: sourceStudy.bharatPacsId,
                        organization: sourceStudy.organizationIdentifier
                    },
                    newValue: {
                        bharatPacsId: newBharatPacsId,
                        organization: targetOrg.identifier
                    },
                    metadata: { reason }
                },
                notes: `Study copied from ${sourceStudy.organizationIdentifier} to ${targetOrg.identifier}`
            }],
            
            // Flags
            hasStudyNotes: false,
            hasAttachments: false,
            discussions: [],
            attachments: []
        };

        // Create the copied study
        const copiedStudy = new DicomStudy(copiedStudyData);
        await copiedStudy.save();

        // Update source study
        await DicomStudy.findByIdAndUpdate(sourceStudy._id, {
            $push: {
                copiedTo: {
                    studyId: copiedStudy._id,
                    bharatPacsId: newBharatPacsId,
                    organizationIdentifier: targetOrg.identifier,
                    organizationName: targetOrg.name,
                    copiedAt: new Date(),
                    copiedBy: user._id
                },
                actionLog: {
                    actionType: 'STUDY_COPIED',
                    actionCategory: 'administrative',
                    performedBy: user._id,
                    performedByName: user.fullName,
                    performedByRole: user.role,
                    performedAt: new Date(),
                    notes: `Study copied to ${targetOrg.identifier} as ${newBharatPacsId}`
                }
            }
        });

        // Copy attachments if requested
        if (copyAttachments && sourceStudy.attachments?.length > 0) {
            await copyStudyAttachments(
                sourceStudy,
                copiedStudy,
                targetOrg.identifier,
                user._id
            );
        }

        console.log(`✅ Study copied successfully: ${newBharatPacsId}`);

        res.status(201).json({
            success: true,
            message: 'Study copied successfully to your organization',
            data: {
                originalStudy: {
                    bharatPacsId: sourceStudy.bharatPacsId,
                    organization: sourceStudy.organizationIdentifier
                },
                copiedStudy: {
                    _id: copiedStudy._id,
                    bharatPacsId: newBharatPacsId,
                    organization: targetOrg.identifier,
                    organizationName: targetOrg.name
                }
            }
        });

    } catch (error) {
        console.error('❌ Error copying study:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to copy study',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 2. COPY STUDY ATTACHMENTS
const copyStudyAttachments = async (sourceStudy, targetStudy, targetOrgIdentifier, userId) => {
    try {
        console.log(`📎 Copying ${sourceStudy.attachments.length} attachments...`);

        const copiedAttachments = [];

        for (const attachment of sourceStudy.attachments) {
            // Get original document
            const sourceDoc = await Document.findById(attachment.documentId);
            if (!sourceDoc || !sourceDoc.isActive) continue;

            // Generate new S3 key for target organization
            const newS3Key = `${targetOrgIdentifier}/studies/${targetStudy._id}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${sourceDoc.fileName}`;

            // Copy file in S3
            const copyCommand = new CopyObjectCommand({
                Bucket: wasabiConfig.documentsBucket,
                CopySource: `${wasabiConfig.documentsBucket}/${sourceDoc.wasabiKey}`,
                Key: newS3Key,
                MetadataDirective: 'REPLACE',
                Metadata: {
                    organizationIdentifier: targetOrgIdentifier,
                    studyId: targetStudy._id.toString(),
                    uploadedBy: userId.toString(),
                    originalName: sourceDoc.fileName,
                    copiedFrom: sourceDoc._id.toString()
                }
            });

            await wasabiS3Client.send(copyCommand);

            // Create new document record
            const newDocument = new Document({
                organization: targetStudy.organization,
                organizationIdentifier: targetOrgIdentifier,
                fileName: sourceDoc.fileName,
                fileSize: sourceDoc.fileSize,
                contentType: sourceDoc.contentType,
                documentType: sourceDoc.documentType,
                wasabiKey: newS3Key,
                wasabiBucket: wasabiConfig.documentsBucket,
                patientId: targetStudy.patientId,
                studyId: targetStudy._id,
                uploadedBy: userId,
                uploadedAt: new Date()
            });

            await newDocument.save();

            // Add to copied study attachments
            copiedAttachments.push({
                documentId: newDocument._id,
                fileName: newDocument.fileName,
                fileSize: newDocument.fileSize,
                contentType: newDocument.contentType,
                uploadedAt: newDocument.uploadedAt,
                uploadedBy: userId
            });
        }

        // Update copied study with attachments
        if (copiedAttachments.length > 0) {
            targetStudy.attachments = copiedAttachments;
            targetStudy.hasAttachments = true;
            await targetStudy.save();
        }

        console.log(`✅ Copied ${copiedAttachments.length} attachments successfully`);
    } catch (error) {
        console.error('❌ Error copying attachments:', error);
        // Don't throw error, just log it
    }
};

// ✅ 3. GET STUDY COPY HISTORY
export const getStudyCopyHistory = async (req, res) => {
    try {
        const { bharatPacsId } = req.params;
        const user = req.user;

        const study = await DicomStudy.findOne({ bharatPacsId })
            .populate('copiedFrom.copiedBy', 'fullName email role')
            .populate('copiedFrom.studyId', 'bharatPacsId organizationIdentifier')
            .populate('copiedTo.copiedBy', 'fullName email role')
            .populate('copiedTo.studyId', 'bharatPacsId organizationIdentifier')
            .lean();

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found'
            });
        }

        // Check access
        if (user.role !== 'super_admin' && 
            study.organizationIdentifier !== user.organizationIdentifier) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: {
                isCopiedStudy: study.isCopiedStudy,
                copiedFrom: study.copiedFrom || null,
                copiedTo: study.copiedTo || [],
                totalCopies: study.copiedTo?.length || 0
            }
        });

    } catch (error) {
        console.error('❌ Error fetching copy history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch copy history',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ SIMPLIFIED: Verify study (no org restriction - allow cross-org verification)
export const verifyStudy = async (req, res) => {
    try {
        const { bharatPacsId } = req.params;
        const user = req.user;

        console.log(`🔍 Verifying study: ${bharatPacsId} for user in org: ${user.organizationIdentifier}`);

        const study = await DicomStudy.findOne({ bharatPacsId })
            .populate('organization', 'name identifier')
            .select('bharatPacsId patientInfo studyDate modality modalitiesInStudy seriesCount instanceCount organizationIdentifier examDescription')
            .lean();

        if (!study) {
            return res.status(404).json({
                success: false,
                message: 'Study not found with the provided BharatPacs ID'
            });
        }

        // ✅ Allow verification from any org (for cross-org copying)
        // Only super_admin and admin can copy anyway

        res.json({
            success: true,
            data: {
                bharatPacsId: study.bharatPacsId,
                patientName: study.patientInfo?.patientName || 'Unknown',
                studyDate: study.studyDate,
                modality: study.modalitiesInStudy?.join(', ') || study.modality,
                seriesCount: study.seriesCount,
                instanceCount: study.instanceCount,
                organizationIdentifier: study.organizationIdentifier,
                organizationName: study.organization?.name || 'Unknown',
                examDescription: study.examDescription
            }
        });

    } catch (error) {
        console.error('❌ Error verifying study:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify study',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update exports
export default {
    copyStudyToOrganization,
    getStudyCopyHistory,
    verifyStudy  // ✅ ADD THIS
};

