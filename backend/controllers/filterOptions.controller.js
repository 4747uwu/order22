// backend/controllers/filterOptions.controller.js
import User from '../models/userModel.js';
import Lab from '../models/labModel.js';

// ✅ GET RADIOLOGISTS FOR FILTER DROPDOWN
export const getRadiologistsForFilter = async (req, res) => {
    try {
        let query = { 
            role: 'radiologist',
            isActive: true 
        };
        
        // ✅ FIX: Check for organizationContext from token (when super admin switches org)
        if (req.user.role === 'super_admin' && req.user.tokenContext?.organizationIdentifier) {
            // Super admin viewing a specific organization
            query.organizationIdentifier = req.user.tokenContext.organizationIdentifier;
            console.log(`🏢 [Super Admin Context] Filtering radiologists for organization: ${req.user.tokenContext.organizationIdentifier}`);
        } else if (req.user.role !== 'super_admin') {
            // Regular users - always filter by their organization
            query.organizationIdentifier = req.user.organizationIdentifier;
            console.log(`🏢 [Multi-tenant] Filtering radiologists for organization: ${req.user.organizationIdentifier}`);
        } else {
            // Super admin without organization context - see all organizations
            console.log(`🏢 [Super Admin] No organization filter - viewing all radiologists`);
        }

        const radiologists = await User.find(query)
            .select('_id fullName username email')
            .sort({ username: 1 });

        res.json({
            success: true,
            data: radiologists.map(r => ({
                value: r._id.toString(),
                label: r.username || r.fullName,
                fullName: r.fullName,
                email: r.email
            }))
        });

    } catch (error) {
        console.error('Error fetching radiologists for filter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch radiologists'
        });
    }
};

// ✅ GET LABS FOR FILTER DROPDOWN
export const getLabsForFilter = async (req, res) => {
    try {
        let query = { isActive: true };
        
        // ✅ FIX: Check for organizationContext from token (when super admin switches org)
        if (req.user.role === 'super_admin' && req.user.tokenContext?.organizationIdentifier) {
            // Super admin viewing a specific organization
            query.organizationIdentifier = req.user.tokenContext.organizationIdentifier;
            console.log(`🏢 [Super Admin Context] Filtering labs for organization: ${req.user.tokenContext.organizationIdentifier}`);
        } else if (req.user.role !== 'super_admin') {
            // Regular users - always filter by their organization
            query.organizationIdentifier = req.user.organizationIdentifier;
            console.log(`🏢 [Multi-tenant] Filtering labs for organization: ${req.user.organizationIdentifier}`);
        } else {
            // Super admin without organization context - see all organizations
            console.log(`🏢 [Super Admin] No organization filter - viewing all labs`);
        }

        const labs = await Lab.find(query)
            .select('_id name identifier')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: labs.map(l => ({
                value: l._id.toString(),
                label: l.name,
                identifier: l.identifier
            }))
        });

    } catch (error) {
        console.error('Error fetching labs for filter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch labs'
        });
    }
};