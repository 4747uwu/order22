import User from '../models/userModel.js';
import Organization from '../models/organisation.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ✅ GET ALL USERS IN ADMIN'S ORGANIZATION WITH CREDENTIALS
export const getOrganizationUsers = async (req, res) => {
    try {
        // Only admin can access this
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can access user credentials'
            });
        }

        let query = { isActive: true };
        
        // For admin, limit to their organization
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        // Get users with passwords (sensitive operation)
        const users = await User.find(query)
            .populate('hierarchy.createdBy', 'fullName email role')
            .populate('hierarchy.parentUser', 'fullName email role')
            .populate('roleConfig.linkedRadiologist', 'fullName email')
            .populate('organization', 'name displayName identifier')
            .select('+password') // Include password field
            .sort({ role: 1, createdAt: -1 });

        // Get organization info
        const organization = await Organization.findOne({
            identifier: req.user.organizationIdentifier
        });

        console.log(`🔐 Admin ${req.user.email} accessed credentials for ${users.length} users`);

        res.json({
            success: true,
            data: {
                organization: organization,
                users: users
            },
            count: users.length
        });

    } catch (error) {
        console.error('❌ Get organization users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization users'
        });
    }
};

// ✅ UPDATE USER CREDENTIALS (email/password/name)
export const updateUserCredentials = async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, password, fullName } = req.body;

        // Only admin can update credentials
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can update user credentials'
            });
        }

        // Validate user exists and belongs to same organization (for admin)
        let query = { _id: userId };
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updates = {};

        // Update email if provided
        if (email && email !== user.email) {
            // Check if email already exists in the organization
            const existingUser = await User.findOne({
                email: email.toLowerCase().trim(),
                organizationIdentifier: user.organizationIdentifier,
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already exists in this organization'
                });
            }

            updates.email = email.toLowerCase().trim();
        }

        // Update full name if provided
        if (fullName && fullName !== user.fullName) {
            updates.fullName = fullName.trim();
        }

        // Update password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }
            
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(password, salt);
        }

        // Perform update
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        )
        .populate('organization', 'name displayName identifier')
        .select('-password');

        console.log(`✅ Admin updated credentials for user ${updatedUser.email}`);

        res.json({
            success: true,
            message: 'User credentials updated successfully',
            data: updatedUser
        });

    } catch (error) {
        console.error('❌ Update user credentials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user credentials'
        });
    }
};

// ✅ SWITCH USER ROLE
export const switchUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newRole } = req.body;

        // Only admin can switch roles
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can switch user roles'
            });
        }

        // Get available roles for this admin
        const availableRoles = req.user.role === 'super_admin' 
            ? ['admin', 'group_id', 'assignor', 'radiologist', 'verifier', 'physician', 'receptionist', 'billing', 'typist', 'dashboard_viewer', 'lab_staff', 'doctor_account', 'owner']
            : ['group_id', 'assignor', 'radiologist', 'verifier', 'physician', 'receptionist', 'billing', 'typist', 'dashboard_viewer'];

        if (!availableRoles.includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        // Find and update user
        let query = { _id: userId };
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const oldRole = user.role;
        user.role = newRole;
        
        // Reset role config when switching roles
        user.roleConfig = {};
        
        await user.save(); // This will trigger the permission setting

        console.log(`🔄 Admin switched user ${user.email} role from ${oldRole} to ${newRole}`);

        const updatedUser = await User.findById(userId)
            .populate('organization', 'name displayName identifier')
            .select('-password');

        res.json({
            success: true,
            message: `User role switched from ${oldRole} to ${newRole}`,
            data: updatedUser
        });

    } catch (error) {
        console.error('❌ Switch user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to switch user role'
        });
    }
};

// ✅ TOGGLE USER STATUS
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        // Only admin can toggle status
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can toggle user status'
            });
        }

        let query = { _id: userId };
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        )
        .populate('organization', 'name displayName identifier')
        .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log(`✅ Admin ${isActive ? 'activated' : 'deactivated'} user ${user.email}`);

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: user
        });

    } catch (error) {
        console.error('❌ Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle user status'
        });
    }
};

// ✅ RESET USER PASSWORD TO DEFAULT
export const resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const defaultPassword = 'password123'; // Default password

        // Only admin can reset passwords
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can reset passwords'
            });
        }

        let query = { _id: userId };
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash default password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        console.log(`🔑 Admin reset password for user ${user.email}`);

        res.json({
            success: true,
            message: 'Password reset to default successfully',
            defaultPassword: defaultPassword
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

// ✅ DELETE USER
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { confirmDelete } = req.body;

        // Only admin can delete users
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admin can delete users'
            });
        }

        if (!confirmDelete) {
            return res.status(400).json({
                success: false,
                message: 'Delete confirmation required'
            });
        }

        let query = { _id: userId };
        if (req.user.role === 'admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deletion of super admins and admins (for admin role)
        if (user.role === 'super_admin' || (req.user.role === 'admin' && user.role === 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin accounts'
            });
        }

        await User.findByIdAndDelete(userId);

        console.log(`🗑️ Admin deleted user ${user.email}`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

// Update the getAvailableRoles function

export const getAvailableRoles = async (req, res) => {
    try {
        const user = req.user;
        
        if (!['admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - insufficient permissions'
            });
        }

        // ✅ ADMIN CAN CREATE ALL ROLES INCLUDING GROUP_ID
        const availableRoles = {
            group_id: {
                name: 'Group ID',
                description: 'Create and manage other user roles including Assignor, Radiologist, Verifier, etc.'
            },
            assignor: {
                name: 'Assignor',
                description: 'Assign cases to radiologists and verifiers, manage workload distribution'
            },
            radiologist: {
                name: 'Radiologist',
                description: 'View cases in DICOM viewer, create reports, forward to verifier'
            },
            verifier: {
                name: 'Verifier',
                description: 'Review radiologist reports, correct errors, finalize and approve reports'
            },
            physician: {
                name: 'Physician / Referral Doctor',
                description: 'View reports of referred patients, limited download/share access'
            },
            receptionist: {
                name: 'Receptionist',
                description: 'Register patients, print reports, update patient demographic details'
            },
            billing: {
                name: 'Billing Section',
                description: 'Generate patient bills, maintain billing information linked with reports'
            },
            typist: {
                name: 'Typist',
                description: 'Support radiologist by typing dictated reports'
            },
            dashboard_viewer: {
                name: 'Dashboard Viewer',
                description: 'View workload, TAT, revenue, pending/completed cases - read-only access'
            }
        };

        res.json({
            success: true,
            data: availableRoles
        });

    } catch (error) {
        console.error('Error fetching available roles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available roles'
        });
    }
};