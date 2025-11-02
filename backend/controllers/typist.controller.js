import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import User from '../models/userModel.js';
import Lab from '../models/labModel.js';

// ✅ REUSE: Date filtering utility from admin.controller
const buildDateFilter = (req) => {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    let filterStartDate = null;
    let filterEndDate = null;

    if (req.query.quickDatePreset || req.query.dateFilter) {
        const preset = req.query.quickDatePreset || req.query.dateFilter;
        const now = Date.now();

        switch (preset) {
            case 'last24h':
                filterStartDate = new Date(now - 86400000);
                filterEndDate = new Date(now);
                break;

            case 'today':
                const currentTimeIST = new Date(Date.now() + IST_OFFSET);
                const todayStartIST = new Date(
                    currentTimeIST.getFullYear(),
                    currentTimeIST.getMonth(),
                    currentTimeIST.getDate(),
                    0, 0, 0, 0
                );
                const todayEndIST = new Date(
                    currentTimeIST.getFullYear(),
                    currentTimeIST.getMonth(),
                    currentTimeIST.getDate(),
                    23, 59, 59, 999
                );
                filterStartDate = new Date(todayStartIST.getTime() - IST_OFFSET);
                filterEndDate = new Date(todayEndIST.getTime() - IST_OFFSET);
                break;

            case 'yesterday':
                const currentTimeISTYesterday = new Date(Date.now() + IST_OFFSET);
                const yesterdayIST = new Date(currentTimeISTYesterday.getTime() - 86400000);
                const yesterdayStartIST = new Date(
                    yesterdayIST.getFullYear(),
                    yesterdayIST.getMonth(),
                    yesterdayIST.getDate(),
                    0, 0, 0, 0
                );
                const yesterdayEndIST = new Date(
                    yesterdayIST.getFullYear(),
                    yesterdayIST.getMonth(),
                    yesterdayIST.getDate(),
                    23, 59, 59, 999
                );
                filterStartDate = new Date(yesterdayStartIST.getTime() - IST_OFFSET);
                filterEndDate = new Date(yesterdayEndIST.getTime() - IST_OFFSET);
                break;

            case 'thisWeek':
                const currentTimeISTWeek = new Date(Date.now() + IST_OFFSET);
                const dayOfWeek = currentTimeISTWeek.getDay();
                const weekStartIST = new Date(
                    currentTimeISTWeek.getFullYear(),
                    currentTimeISTWeek.getMonth(),
                    currentTimeISTWeek.getDate() - dayOfWeek,
                    0, 0, 0, 0
                );
                const weekEndIST = new Date(currentTimeISTWeek.getTime());
                filterStartDate = new Date(weekStartIST.getTime() - IST_OFFSET);
                filterEndDate = new Date(weekEndIST.getTime() - IST_OFFSET);
                break;

            case 'thisMonth':
                const currentTimeISTMonth = new Date(Date.now() + IST_OFFSET);
                const monthStartIST = new Date(
                    currentTimeISTMonth.getFullYear(),
                    currentTimeISTMonth.getMonth(),
                    1,
                    0, 0, 0, 0
                );
                const monthEndIST = new Date(currentTimeISTMonth.getTime());
                filterStartDate = new Date(monthStartIST.getTime() - IST_OFFSET);
                filterEndDate = new Date(monthEndIST.getTime() - IST_OFFSET);
                break;

            case 'custom':
                if (req.query.customDateFrom || req.query.customDateTo) {
                    if (req.query.customDateFrom) {
                        const customStartIST = new Date(req.query.customDateFrom + 'T00:00:00');
                        filterStartDate = new Date(customStartIST.getTime() - IST_OFFSET);
                    }
                    if (req.query.customDateTo) {
                        const customEndIST = new Date(req.query.customDateTo + 'T23:59:59');
                        filterEndDate = new Date(customEndIST.getTime() - IST_OFFSET);
                    }
                } else {
                    filterStartDate = new Date(now - 86400000);
                    filterEndDate = new Date(now);
                }
                break;

            default:
                filterStartDate = new Date(now - 86400000);
                filterEndDate = new Date(now);
        }
    } else {
        const currentTimeISTDefault = new Date(Date.now() + IST_OFFSET);
        const todayStartISTDefault = new Date(
            currentTimeISTDefault.getFullYear(),
            currentTimeISTDefault.getMonth(),
            currentTimeISTDefault.getDate(),
            0, 0, 0, 0
        );
        const todayEndISTDefault = new Date(
            currentTimeISTDefault.getFullYear(),
            currentTimeISTDefault.getMonth(),
            currentTimeISTDefault.getDate(),
            23, 59, 59, 999
        );
        filterStartDate = new Date(todayStartISTDefault.getTime() - IST_OFFSET);
        filterEndDate = new Date(todayEndISTDefault.getTime() - IST_OFFSET);
    }

    return { filterStartDate, filterEndDate };
};

// ✅ TYPIST-SPECIFIC: Build base query scoped to linked radiologist's studies
const buildTypistBaseQuery = (req, workflowStatuses = null) => {
    const user = req.user;
    
    // ✅ VALIDATE TYPIST HAS LINKED RADIOLOGIST
    if (!user.roleConfig?.linkedRadiologist) {
        throw new Error('Typist must be linked to a radiologist');
    }

    const queryFilters = {
        organizationIdentifier: user.organizationIdentifier,
        'assignment.assignedTo': new mongoose.Types.ObjectId(user.roleConfig.linkedRadiologist)
    };

    // ✅ WORKFLOW STATUS: Apply status filter if provided
    if (workflowStatuses && workflowStatuses.length > 0) {
        queryFilters.workflowStatus = workflowStatuses.length === 1 ? workflowStatuses[0] : { $in: workflowStatuses };
    }

    // ✅ DATE FILTERING
    const { filterStartDate, filterEndDate } = buildDateFilter(req);
    if (filterStartDate || filterEndDate) {
        const dateField = req.query.dateType === 'StudyDate' ? 'studyDate' : 'createdAt';
        queryFilters[dateField] = {};
        if (filterStartDate) queryFilters[dateField].$gte = filterStartDate;
        if (filterEndDate) queryFilters[dateField].$lte = filterEndDate;
    }

    // ✅ SEARCH FILTERING
    if (req.query.search) {
        queryFilters.$or = [
            { accessionNumber: { $regex: req.query.search, $options: 'i' } },
            { studyInstanceUID: { $regex: req.query.search, $options: 'i' } },
            { 'patientInfo.patientName': { $regex: req.query.search, $options: 'i' } },
            { 'patientInfo.patientID': { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // ✅ MODALITY FILTERING
    if (req.query.modality && req.query.modality !== 'all') {
        queryFilters.$or = [
            { modality: req.query.modality },
            { modalitiesInStudy: req.query.modality }
        ];
    }

    // ✅ LAB FILTERING
    if (req.query.labId && req.query.labId !== 'all' && mongoose.Types.ObjectId.isValid(req.query.labId)) {
        queryFilters.sourceLab = new mongoose.Types.ObjectId(req.query.labId);
    }

    // ✅ PRIORITY FILTERING
    if (req.query.priority && req.query.priority !== 'all') {
        queryFilters['assignment.priority'] = req.query.priority;
    }

    return queryFilters;
};

// ✅ EXECUTE STUDY QUERY - Same as doctor controller
const executeStudyQuery = async (queryFilters, limit) => {
    try {
        const totalStudies = await DicomStudy.countDocuments(queryFilters);
        
        // ✅ SAME POPULATE AS DOCTOR CONTROLLER
        const studies = await DicomStudy.find(queryFilters)
            .populate('assignment.assignedTo', 'fullName email role')
            .populate('assignment.assignedBy', 'fullName email role')
            .populate('sourceLab', 'name identifier location contactPerson')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return { studies, totalStudies };
    } catch (error) {
        console.error('❌ Error in executeStudyQuery:', error);
        throw error;
    }
};

// ✅ 1. GET DASHBOARD VALUES - Same structure as doctor
export const getValues = async (req, res) => {
    console.log(`🔍 Typist dashboard: Fetching values with filters: ${JSON.stringify(req.query)}`);
    try {
        const startTime = Date.now();
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // ✅ VALIDATE TYPIST ROLE
        if (user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        // Build query filters for typist's linked radiologist's studies
        const queryFilters = buildTypistBaseQuery(req);
        
        console.log(`🔍 Typist dashboard query filters:`, JSON.stringify(queryFilters, null, 2));

        // Status mapping for typist workflow (focuses on report stages)
        const statusCategories = {
            pending: ['assigned_to_doctor', 'doctor_opened_report'], // Ready to start typing
            inprogress: ['report_in_progress', 'report_drafted'], // Currently typing or drafted
            completed: ['report_finalized', 'final_report_downloaded', 'archived'] // Completed reports
        };

        // Execute aggregation pipeline
        const pipeline = [
            { $match: queryFilters },
            {
                $group: {
                    _id: '$workflowStatus',
                    count: { $sum: 1 }
                }
            }
        ];

        const [statusCountsResult, totalFilteredResult] = await Promise.allSettled([
            DicomStudy.aggregate(pipeline).allowDiskUse(false),
            DicomStudy.countDocuments(queryFilters)
        ]);

        if (statusCountsResult.status === 'rejected') {
            throw new Error(`Status counts query failed: ${statusCountsResult.reason.message}`);
        }

        const statusCounts = statusCountsResult.value;
        const totalFiltered = totalFilteredResult.status === 'fulfilled' ? totalFilteredResult.value : 0;

        // Calculate category totals
        let pending = 0;
        let inprogress = 0;
        let completed = 0;

        statusCounts.forEach(({ _id: status, count }) => {
            if (statusCategories.pending.includes(status)) {
                pending += count;
            } else if (statusCategories.inprogress.includes(status)) {
                inprogress += count;
            } else if (statusCategories.completed.includes(status)) {
                completed += count;
            }
        });

        const processingTime = Date.now() - startTime;
        console.log(`🎯 Typist dashboard values fetched in ${processingTime}ms`);

        const response = {
            success: true,
            total: totalFiltered,
            pending,
            inprogress,
            completed,
            performance: {
                queryTime: processingTime,
                fromCache: false,
                filtersApplied: Object.keys(queryFilters).length > 0
            }
        };

        // Add debug info for development
        if (process.env.NODE_ENV === 'development') {
            response.debug = {
                filtersApplied: queryFilters,
                rawStatusCounts: statusCounts,
                userRole: user.role,
                userId: user._id,
                linkedRadiologist: user.roleConfig.linkedRadiologist,
                organization: user.organizationIdentifier
            };
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error fetching typist dashboard values:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching typist dashboard statistics.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 2. GET PENDING STUDIES - Studies ready for typing
export const getPendingStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        console.log('🟡 TYPIST PENDING: Fetching pending studies');
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        const pendingStatuses = ['assigned_to_doctor', 'doctor_opened_report'];
        const queryFilters = buildTypistBaseQuery(req, pendingStatuses);
        
        console.log(`🔍 TYPIST PENDING query filters:`, JSON.stringify(queryFilters, null, 2));

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);

        const processingTime = Date.now() - startTime;
        console.log(`✅ TYPIST PENDING: Completed in ${processingTime}ms`);

        // ✅ RETURN RAW STUDIES - Let frontend format them
        return res.status(200).json({
            success: true,
            count: studies.length,
            totalRecords: totalStudies,
            data: studies, // ✅ Raw studies for frontend formatting
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalStudies / limit),
                totalRecords: totalStudies,
                limit: limit,
                hasNextPage: totalStudies > limit,
                hasPrevPage: false
            },
            metadata: {
                category: 'pending',
                statusesIncluded: pendingStatuses,
                organizationFilter: user.organizationIdentifier,
                userRole: user.role,
                linkedRadiologist: user.roleConfig.linkedRadiologist,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ TYPIST PENDING: Error fetching pending studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching pending studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 3. GET IN-PROGRESS STUDIES - Studies being typed or drafted
export const getInProgressStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        const inProgressStatuses = ['report_in_progress', 'report_drafted'];
        const queryFilters = buildTypistBaseQuery(req, inProgressStatuses);

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);

        const processingTime = Date.now() - startTime;

        // ✅ RETURN RAW STUDIES - Let frontend format them
        return res.status(200).json({
            success: true,
            count: studies.length,
            totalRecords: totalStudies,
            data: studies, // ✅ Raw studies for frontend formatting
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalStudies / limit),
                totalRecords: totalStudies,
                limit: limit,
                hasNextPage: totalStudies > limit,
                hasPrevPage: false
            },
            metadata: {
                category: 'inprogress',
                statusesIncluded: inProgressStatuses,
                organizationFilter: user.organizationIdentifier,
                userRole: user.role,
                linkedRadiologist: user.roleConfig.linkedRadiologist,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ TYPIST IN-PROGRESS: Error fetching in-progress studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching in-progress studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 4. GET COMPLETED STUDIES - Studies with finalized reports
export const getCompletedStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        const completedStatuses = ['report_finalized', 'final_report_downloaded', 'archived'];
        const queryFilters = buildTypistBaseQuery(req, completedStatuses);

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);

        const processingTime = Date.now() - startTime;

        // ✅ RETURN RAW STUDIES - Let frontend format them
        return res.status(200).json({
            success: true,
            count: studies.length,
            totalRecords: totalStudies,
            data: studies, // ✅ Raw studies for frontend formatting
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalStudies / limit),
                totalRecords: totalStudies,
                limit: limit,
                hasNextPage: totalStudies > limit,
                hasPrevPage: false
            },
            metadata: {
                category: 'completed',
                statusesIncluded: completedStatuses,
                organizationFilter: user.organizationIdentifier,
                userRole: user.role,
                linkedRadiologist: user.roleConfig.linkedRadiologist,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ TYPIST COMPLETED: Error fetching completed studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching completed studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 5. GET ALL STUDIES - All studies from linked radiologist
export const getAllStudiesForTypist = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        const queryFilters = buildTypistBaseQuery(req);

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);

        const processingTime = Date.now() - startTime;

        // ✅ RETURN RAW STUDIES - Let frontend format them
        return res.status(200).json({
            success: true,
            count: studies.length,
            totalRecords: totalStudies,
            data: studies, // ✅ Raw studies for frontend formatting
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(totalStudies / limit),
                totalRecords: totalStudies,
                limit: limit,
                hasNextPage: totalStudies > limit,
                hasPrevPage: false
            },
            metadata: {
                category: req.query.category || 'all',
                organizationFilter: user.organizationIdentifier,
                userRole: user.role,
                linkedRadiologist: user.roleConfig.linkedRadiologist,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ TYPIST ALL: Error fetching all studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 6. GET LINKED RADIOLOGIST INFO
export const getLinkedRadiologist = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user || user.role !== 'typist') {
            return res.status(403).json({ success: false, message: 'Access denied: Typist role required' });
        }

        if (!user.roleConfig?.linkedRadiologist) {
            return res.status(404).json({ success: false, message: 'No linked radiologist found' });
        }

        const radiologist = await User.findById(user.roleConfig.linkedRadiologist)
            .select('fullName email role isActive organizationIdentifier')
            .lean();

        if (!radiologist) {
            return res.status(404).json({ success: false, message: 'Linked radiologist not found' });
        }

        res.status(200).json({
            success: true,
            radiologist: radiologist
        });

    } catch (error) {
        console.error('❌ Error fetching linked radiologist:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching linked radiologist.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default {
    getValues,
    getPendingStudies,
    getInProgressStudies,
    getCompletedStudies,
    getAllStudiesForTypist,
    getLinkedRadiologist
};