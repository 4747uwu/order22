import Organization from '../models/organisation.js';
import User from '../models/userModel.js';
import Lab from '../models/labModel.js';
import Doctor from '../models/doctorModel.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Get all organizations (super admin only)
export const getAllOrganizations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';

        const query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { identifier: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (status) {
            query.status = status;
        }

        const organizations = await Organization.find(query)
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Organization.countDocuments(query);

        // Get user and lab counts for each organization
        const organizationsWithStats = await Promise.all(
            organizations.map(async (org) => {
                const [userCount, labCount, doctorCount] = await Promise.all([
                    User.countDocuments({ organization: org._id, isActive: true }),
                    Lab.countDocuments({ organization: org._id, isActive: true }),
                    Doctor.countDocuments({ organization: org._id, isActiveProfile: true })
                ]);

                return {
                    ...org.toObject(),
                    stats: {
                        activeUsers: userCount,
                        activeLabs: labCount,
                        activeDoctors: doctorCount
                    }
                };
            })
        );

        res.json({
            success: true,
            data: organizationsWithStats,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalOrganizations: count,
                hasNextPage: page * limit < count,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organizations'
        });
    }
};

// Get single organization by ID
export const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const organization = await Organization.findById(id)
            .populate('createdBy', 'fullName email')
            .populate('lastModifiedBy', 'fullName email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get detailed stats
        const [userCount, labCount, doctorCount, adminUsers] = await Promise.all([
            User.countDocuments({ organization: organization._id, isActive: true }),
            Lab.countDocuments({ organization: organization._id, isActive: true }),
            Doctor.countDocuments({ organization: organization._id, isActiveProfile: true }),
            User.find({ 
                organization: organization._id, 
                role: 'admin',
                isActive: true 
            }).select('fullName email username')
        ]);

        res.json({
            success: true,
            data: {
                ...organization.toObject(),
                stats: {
                    activeUsers: userCount,
                    activeLabs: labCount,
                    activeDoctors: doctorCount,
                    adminUsers
                }
            }
        });

    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization'
        });
    }
};

// Create new organization with admin user
export const createOrganization = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            name,
            identifier,
            displayName,
            companyType,
            contactInfo,
            address,
            subscription,
            features,
            compliance,
            notes,
            // Admin user details
            adminEmail,
            adminPassword,
            adminFullName
        } = req.body;

        // Validate required fields
        if (!name || !identifier || !displayName || !companyType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required organization fields'
            });
        }

        if (!adminEmail || !adminPassword || !adminFullName) {
            return res.status(400).json({
                success: false,
                message: 'Admin user details are required'
            });
        }

        // Check if identifier is unique
        const existingOrg = await Organization.findOne({ 
            identifier: identifier.toUpperCase() 
        }).session(session);

        if (existingOrg) {
            return res.status(400).json({
                success: false,
                message: 'Organization identifier already exists'
            });
        }

        // Check if admin email is unique
        const existingUser = await User.findOne({ 
            email: adminEmail.toLowerCase() 
        }).session(session);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Admin email already exists'
            });
        }

        // Create organization
        const organization = new Organization({
            name: name.trim(),
            identifier: identifier.toUpperCase().trim(),
            displayName: displayName.trim(),
            companyType,
            contactInfo: contactInfo || {},
            address: address || {},
            subscription: subscription || {},
            features: features || {},
            compliance: compliance || {},
            notes: notes?.trim(),
            createdBy: req.user._id,
            status: 'active'
        });

        await organization.save({ session });

        // Create admin user for the organization
        const adminUser = new User({
            organization: organization._id,
            organizationIdentifier: organization.identifier,
            username: adminEmail.split('@')[0].toLowerCase(),
            email: adminEmail.toLowerCase().trim(),
            password: adminPassword, // Will be hashed by pre-save hook
            fullName: adminFullName.trim(),
            role: 'admin',
            createdBy: req.user._id
        });

        await adminUser.save({ session });

        // Create default labs for the organization
        const defaultLabs = [
            {
                name: `${organization.identifier} Main Lab`,
                identifier: 'MAIN',
                organization: organization._id,
                organizationIdentifier: organization.identifier,
                contactPerson: adminFullName,
                contactEmail: adminEmail,
                contactPhone: contactInfo?.primaryContact?.phone || '',
                address: organization.address,
                isActive: true,
                notes: `Default main lab for ${organization.displayName}`,
                settings: {
                    autoAssignStudies: true,
                    defaultPriority: 'NORMAL',
                    maxConcurrentStudies: 50
                }
            },
            {
                name: `${organization.identifier} Emergency Lab`,
                identifier: 'EMERG',
                organization: organization._id,
                organizationIdentifier: organization.identifier,
                contactPerson: adminFullName,
                contactEmail: adminEmail,
                contactPhone: contactInfo?.primaryContact?.phone || '',
                address: organization.address,
                isActive: true,
                notes: `Emergency lab for ${organization.displayName}`,
                settings: {
                    autoAssignStudies: true,
                    defaultPriority: 'HIGH',
                    maxConcurrentStudies: 20
                }
            }
        ];

        await Lab.insertMany(defaultLabs, { session });

        await session.commitTransaction();

        // Return organization with populated data
        const populatedOrg = await Organization.findById(organization._id)
            .populate('createdBy', 'fullName email');

        res.status(201).json({
            success: true,
            message: 'Organization created successfully with admin user and default labs',
            data: {
                organization: populatedOrg,
                adminUser: {
                    _id: adminUser._id,
                    email: adminUser.email,
                    fullName: adminUser.fullName,
                    role: adminUser.role
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create organization error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate key error - identifier or email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create organization'
        });
    } finally {
        session.endSession();
    }
};

// Update organization
export const updateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        // Remove fields that shouldn't be updated directly
        delete updates._id;
        delete updates.identifier; // Identifier should not be changed
        delete updates.createdBy;
        delete updates.createdAt;

        // Add last modified info
        updates.lastModifiedBy = req.user._id;

        const organization = await Organization.findByIdAndUpdate(
            id,
            updates,
            { 
                new: true, 
                runValidators: true 
            }
        ).populate('createdBy', 'fullName email')
         .populate('lastModifiedBy', 'fullName email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.json({
            success: true,
            message: 'Organization updated successfully',
            data: organization
        });

    } catch (error) {
        console.error('Update organization error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate key error'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update organization'
        });
    }
};

// Delete organization (soft delete by setting status to inactive)
export const deleteOrganization = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid organization ID'
            });
        }

        const organization = await Organization.findById(id).session(session);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Soft delete - set status to inactive
        organization.status = 'inactive';
        organization.lastModifiedBy = req.user._id;
        await organization.save({ session });

        // Deactivate all users in the organization
        await User.updateMany(
            { organization: organization._id },
            { 
                isActive: false,
                lastModifiedBy: req.user._id
            },
            { session }
        );

        // Deactivate all labs in the organization
        await Lab.updateMany(
            { organization: organization._id },
            { 
                isActive: false,
                lastModifiedBy: req.user._id
            },
            { session }
        );

        // Deactivate all doctors in the organization
        await Doctor.updateMany(
            { organization: organization._id },
            { 
                isActiveProfile: false,
                lastModifiedBy: req.user._id
            },
            { session }
        );

        await session.commitTransaction();

        res.json({
            success: true,
            message: 'Organization deactivated successfully (soft delete)'
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Delete organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete organization'
        });
    } finally {
        session.endSession();
    }
};

// Get organization statistics
export const getOrganizationStats = async (req, res) => {
    try {
        const totalOrgs = await Organization.countDocuments();
        const activeOrgs = await Organization.countDocuments({ status: 'active' });
        const inactiveOrgs = await Organization.countDocuments({ status: 'inactive' });
        
        const planStats = await Organization.aggregate([
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]);

        const companyTypeStats = await Organization.aggregate([
            { $group: { _id: '$companyType', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                total: totalOrgs,
                active: activeOrgs,
                inactive: inactiveOrgs,
                byPlan: planStats,
                byCompanyType: companyTypeStats
            }
        });

    } catch (error) {
        console.error('Get organization stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization statistics'
        });
    }
};