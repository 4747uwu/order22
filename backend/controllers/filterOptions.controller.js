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
        
        // For non-super admins, filter by organization
        if (req.user.role !== 'super_admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
        }

        const radiologists = await User.find(query)
            .select('_id fullName email')
            .sort({ fullName: 1 });

        res.json({
            success: true,
            data: radiologists.map(r => ({
                value: r._id.toString(),
                label: r.fullName,
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
        
        // For non-super admins, filter by organization
        if (req.user.role !== 'super_admin') {
            query.organizationIdentifier = req.user.organizationIdentifier;
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