import mongoose from 'mongoose';
import DicomStudy from '../models/dicomStudyModel.js';
import User from '../models/userModel.js';
import Lab from '../models/labModel.js';
import { formatStudiesForWorklist } from '../utils/formatStudies.js';
import { buildDateFilter } from '../utils/dateFilter.js'; // ✅ Import the enhanced utility

// 🎯 GET DASHBOARD VALUES - Multi-tenant with assignment analytics for assignor
export const getValues = async (req, res) => {
    console.log(`🔍 Fetching dashboard values with filters: ${JSON.stringify(req.query)}`);
    try {
        const startTime = Date.now();
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Build query filters with multi-tenant support
        const queryFilters = buildBaseQuery(req, user);
        
        console.log(`🔍 Dashboard query filters:`, JSON.stringify(queryFilters, null, 2));

        // Status mapping
        const statusCategories = {
            pending: ['new_study_received', 'pending_assignment', 'assigned_to_doctor', 'doctor_opened_report', 'report_in_progress',
                    'report_downloaded_radiologist', 'report_downloaded'],
            inprogress: ['report_finalized', 'report_drafted', 'report_uploaded', 'report_verified',
        'report_rejected',],
            completed: ['final_report_downloaded']
        };

        // 🔥 STEP 2: Optimized aggregation pipeline with filters
        const pipeline = [
            { $match: queryFilters },
            {
                $group: {
                    _id: '$workflowStatus',
                    count: { $sum: 1 }
                }
            }
        ];

        // Execute queries with same filters
        const [statusCountsResult, totalFilteredResult] = await Promise.allSettled([
            DicomStudy.aggregate(pipeline).allowDiskUse(false),
            DicomStudy.countDocuments(queryFilters)
        ]);

        if (statusCountsResult.status === 'rejected') {
            throw new Error(`Status counts query failed: ${statusCountsResult.reason.message}`);
        }

        const statusCounts = statusCountsResult.value;
        const totalFiltered = totalFilteredResult.status === 'fulfilled' ? totalFilteredResult.value : 0;

        // Calculate category totals with filtered data
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
        console.log(`🎯 Dashboard values fetched in ${processingTime}ms with filters applied`);

        // Base response
        const response = {
            success: true,
            total: totalFiltered,
            pending: pending,
            inprogress: inprogress,
            completed: completed,
            performance: {
                queryTime: processingTime,
                fromCache: false,
                filtersApplied: Object.keys(queryFilters).length > 0
            }
        };

        // ✅ ADD ASSIGNMENT ANALYTICS FOR ASSIGNOR
        if (user.role === 'assignor') {
            // Get unassigned studies count
            const unassignedQuery = {
                ...queryFilters,
                $or: [
                    { assignment: { $exists: false } },
                    { assignment: { $size: 0 } },
                    { 
                        assignment: {
                            $not: {
                                $elemMatch: {
                                    status: { $in: ['assigned', 'in_progress'] }
                                }
                            }
                        }
                    }
                ]
            };

            const [unassignedResult, overdueResult] = await Promise.allSettled([
                DicomStudy.countDocuments(unassignedQuery),
                // Overdue studies (assigned but not completed within expected time)
                DicomStudy.countDocuments({
                    ...queryFilters,
                    'assignment.status': 'assigned',
                    'assignment.assignedAt': { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
                })
            ]);

            const totalUnassigned = unassignedResult.status === 'fulfilled' ? unassignedResult.value : 0;
            const overdueStudies = overdueResult.status === 'fulfilled' ? overdueResult.value : 0;

            response.overview = {
                totalUnassigned,
                totalAssigned: totalFiltered - totalUnassigned,
                overdueStudies
            };

            console.log(`📊 ASSIGNOR ANALYTICS: Unassigned: ${totalUnassigned}, Assigned: ${response.overview.totalAssigned}, Overdue: ${overdueStudies}`);
        }

        // Add filter summary for debugging/transparency
        if (process.env.NODE_ENV === 'development') {
            response.debug = {
                filtersApplied: queryFilters,
                rawStatusCounts: statusCounts,
                userRole: user.role,
                organization: user.organizationIdentifier
            };
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error fetching dashboard values:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching dashboard statistics.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 🟡 GET PENDING STUDIES - Multi-tenant
export const getPendingStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        console.log('🟡 PENDING: Fetching pending studies for multi-tenant system');
        
        // Get user from middleware (assuming it's attached to req.user)
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Build query with multi-tenant support
        const pendingStatuses = ['new_study_received', 'pending_assignment'];
        const queryFilters = buildBaseQuery(req, user, pendingStatuses);
        
        console.log(`🔍 PENDING query filters:`, JSON.stringify(queryFilters, null, 2));

        // Execute query and build lookups
        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);
        const lookupMaps = await buildLookupMaps(studies);

        // ✅ USE UTILS TO FORMAT STUDIES
        const formattedStudies = formatStudiesForWorklist(studies, lookupMaps.userMap, lookupMaps.labMap);

        const processingTime = Date.now() - startTime;
        console.log(`✅ PENDING: Completed in ${processingTime}ms`);

        return res.status(200).json({
            success: true,
            count: formattedStudies.length,
            totalRecords: totalStudies,
            data: formattedStudies, // ✅ Now properly formatted for WorklistTable
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
                organizationFilter: user.role !== 'super_admin' ? user.organizationIdentifier : 'all',
                userRole: user.role,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ PENDING: Error fetching pending studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching pending studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ SAME PATTERN FOR OTHER ENDPOINTS
export const getInProgressStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const inProgressStatuses = [
            'assigned_to_doctor', 'doctor_opened_report', 'report_in_progress',
            'report_finalized', 'report_drafted', 'report_uploaded', 
            'report_downloaded_radiologist', 'report_downloaded', 'report_verified',
        'report_rejected'
        ];
        const queryFilters = buildBaseQuery(req, user, inProgressStatuses);

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);
        const lookupMaps = await buildLookupMaps(studies);

        // ✅ USE UTILS TO FORMAT STUDIES
        const formattedStudies = formatStudiesForWorklist(studies, lookupMaps.userMap, lookupMaps.labMap);

        const processingTime = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            count: formattedStudies.length,
            totalRecords: totalStudies,
            data: formattedStudies, // ✅ Properly formatted
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
                organizationFilter: user.role !== 'super_admin' ? user.organizationIdentifier : 'all',
                userRole: user.role,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ IN-PROGRESS: Error fetching in-progress studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching in-progress studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getCompletedStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const completedStatuses = ['final_report_downloaded', 'archived'];
        const queryFilters = buildBaseQuery(req, user, completedStatuses);

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);
        const lookupMaps = await buildLookupMaps(studies);

        // ✅ USE UTILS TO FORMAT STUDIES
        const formattedStudies = formatStudiesForWorklist(studies, lookupMaps.userMap, lookupMaps.labMap);

        const processingTime = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            count: formattedStudies.length,
            totalRecords: totalStudies,
            data: formattedStudies, // ✅ Properly formatted
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
                organizationFilter: user.role !== 'super_admin' ? user.organizationIdentifier : 'all',
                userRole: user.role,
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ COMPLETED: Error fetching completed studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching completed studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getAllStudiesForAdmin = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 20;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Build query filters (keep the existing buildBaseQuery logic)
        const queryFilters = buildBaseQuery(req, user);
        
        // 🔥 SIMPLIFIED: Get raw data only - no formatting
        const pipeline = [
            { $match: queryFilters },
            { $sort: { createdAt: -1 } },
            { $limit: Math.min(limit, 1000) },
            // ✅ MINIMAL PROJECTION - just get what we need
            {
                $project: {
                    _id: 1,
                    studyInstanceUID: 1,
                    orthancStudyID: 1,
                    accessionNumber: 1,
                    workflowStatus: 1,
                    modality: 1,
                    modalitiesInStudy: 1,
                    studyDescription: 1,
                    examDescription: 1,
                    seriesCount: 1,
                    instanceCount: 1,
                    studyDate: 1,
                    studyTime: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    patientId: 1,
                    patient: 1, // Keep reference for population
                    sourceLab: 1, // Keep reference for population
                    assignment: 1,
                    priority: 1,
                    organizationIdentifier: 1,
                    ReportAvailable: 1,
                    reportInfo: 1,
                    // Add any other fields you need
                    patientInfo: 1 // If this exists in your schema
                }
            }
        ];

        // Execute parallel queries
        const [studiesResult, totalCountResult] = await Promise.allSettled([
            DicomStudy.aggregate(pipeline).allowDiskUse(false),
            DicomStudy.countDocuments(queryFilters)
        ]);

        if (studiesResult.status === 'rejected') {
            throw new Error(`Studies query failed: ${studiesResult.reason.message}`);
        }

        const studies = studiesResult.value;
        const totalStudies = totalCountResult.status === 'fulfilled' ? totalCountResult.value : studies.length;
        
        // 🔥 MINIMAL BACKEND PROCESSING - just populate references
        let populatedStudies = studies;
        
        if (studies.length > 0) {
            // Get unique IDs for batch population
            const patientIds = [...new Set(studies.map(s => s.patient).filter(Boolean))];
            const labIds = [...new Set(studies.map(s => s.sourceLab).filter(Boolean))];
            
            // Fetch related data in parallel
            const [patients, labs] = await Promise.allSettled([
                patientIds.length > 0 ? 
                    mongoose.model('Patient')
                        .find({ _id: { $in: patientIds } })
                        .select('patientID patientNameRaw firstName lastName gender ageString dateOfBirth')
                        .lean() : [],
                labIds.length > 0 ? 
                    mongoose.model('Lab')
                        .find({ _id: { $in: labIds } })
                        .select('name identifier location')
                        .lean() : []
            ]);

            // Create lookup maps
            const patientMap = new Map();
            const labMap = new Map();

            if (patients.status === 'fulfilled') {
                patients.value.forEach(p => patientMap.set(p._id.toString(), p));
            }
            if (labs.status === 'fulfilled') {
                labs.value.forEach(l => labMap.set(l._id.toString(), l));
            }

            // ✅ MINIMAL ENHANCEMENT - just attach related data
            populatedStudies = studies.map(study => ({
                ...study,
                // Attach populated data for frontend use
                patientData: study.patient ? patientMap.get(study.patient.toString()) : null,
                labData: study.sourceLab ? labMap.get(study.sourceLab.toString()) : null
            }));
        }

        const processingTime = Date.now() - startTime;
        console.log(`⚡ Raw data fetched in ${processingTime}ms for ${studies.length} studies`);

        // ✅ SIMPLE RESPONSE - let frontend handle formatting
        res.status(200).json({
            success: true,
            count: populatedStudies.length,
            totalRecords: totalStudies,
            data: populatedStudies, // Raw data with minimal population
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
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ Error fetching studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// 🔧 CENTRALIZED: Build base query with multi-tenant support
const buildBaseQuery = (req, user, workflowStatuses = null) => {
    const queryFilters = {};

    // 🏢 MULTI-TENANT: Organization-based filtering
    if (user.role !== 'super_admin') {
        queryFilters.organizationIdentifier = user.organizationIdentifier;
        console.log(`🏢 Multi-tenant filter applied for organization: ${user.organizationIdentifier}`);
    }

    // 🔧 WORKFLOW STATUS: Apply status filter if provided
    if (workflowStatuses && workflowStatuses.length > 0) {
        queryFilters.workflowStatus = workflowStatuses.length === 1 ? workflowStatuses[0] : { $in: workflowStatuses };
    }

    // 🕐 ENHANCED DATE FILTERING
    const { filterStartDate, filterEndDate } = buildDateFilter(req);
    if (filterStartDate || filterEndDate) {
        const dateField = req.query.dateType === 'StudyDate' ? 'studyDate' : 'createdAt';
        queryFilters[dateField] = {};
        if (filterStartDate) queryFilters[dateField].$gte = filterStartDate;
        if (filterEndDate) queryFilters[dateField].$lte = filterEndDate;
        
        console.log(`📅 Date filter applied to ${dateField}:`, {
            from: filterStartDate?.toISOString(),
            to: filterEndDate?.toISOString()
        });
    }

    // 🔍 SEARCH FILTERING
    if (req.query.search) {
        queryFilters.$or = [
            { accessionNumber: { $regex: req.query.search, $options: 'i' } },
            { studyInstanceUID: { $regex: req.query.search, $options: 'i' } },
            { 'patientInfo.patientName': { $regex: req.query.search, $options: 'i' } },
            { 'patientInfo.patientID': { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // 🔬 MODALITY FILTERING
    if (req.query.modality && req.query.modality !== 'all') {
        queryFilters.$or = [
            { modality: req.query.modality },
            { modalitiesInStudy: req.query.modality }
        ];
    }

    // 🏥 LAB FILTERING (within organization)
    if (req.query.labId && req.query.labId !== 'all' && mongoose.Types.ObjectId.isValid(req.query.labId)) {
        queryFilters.sourceLab = new mongoose.Types.ObjectId(req.query.labId);
    }

    // ⚡ PRIORITY FILTERING
    if (req.query.priority && req.query.priority !== 'all') {
        queryFilters['assignment.priority'] = req.query.priority;
    }

    // 🔢 STUDY INSTANCE UIDS
    if (req.query.StudyInstanceUIDs && req.query.StudyInstanceUIDs !== 'undefined') {
        const studyUIDs = req.query.StudyInstanceUIDs.split(',').map(uid => uid.trim()).filter(Boolean);
        if (studyUIDs.length > 0) {
            queryFilters.studyInstanceUID = { $in: studyUIDs };
        }
    }

    return queryFilters;
};

// ✅ SIMPLIFIED: Execute study query with optimized aggregation
const executeStudyQuery = async (queryFilters, limit) => {
    try {
        // Get total count
        const totalStudies = await DicomStudy.countDocuments(queryFilters);
        
        // Execute main query with lean for performance
        const studies = await DicomStudy.find(queryFilters)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return { studies, totalStudies };
    } catch (error) {
        console.error('❌ Error in executeStudyQuery:', error);
        throw error;
    }
};

// ✅ SIMPLIFIED: Build lookup maps for users and labs  
const buildLookupMaps = async (studies) => {
    try {
        // Extract unique user IDs and lab IDs from studies
        const userIds = new Set();
        const labIds = new Set();

        studies.forEach(study => {
            // Extract user IDs from assignments
            if (study.assignment && Array.isArray(study.assignment)) {
                study.assignment.forEach(assign => {
                    if (assign.assignedTo) userIds.add(assign.assignedTo.toString());
                    if (assign.assignedBy) userIds.add(assign.assignedBy.toString());
                });
            }
            
            // Extract user IDs from reportInfo
            if (study.reportInfo) {
                if (study.reportInfo.reportedBy) userIds.add(study.reportInfo.reportedBy.toString());
                if (study.reportInfo.verifiedBy) userIds.add(study.reportInfo.verifiedBy.toString());
            }

            // Extract lab IDs
            if (study.sourceLab) labIds.add(study.sourceLab.toString());
        });

        // Fetch users and labs in parallel
        const [users, labs] = await Promise.all([
            userIds.size > 0 ? User.find({ _id: { $in: Array.from(userIds) } })
                .select('firstName lastName email role organizationIdentifier')
                .lean() : [],
            labIds.size > 0 ? Lab.find({ _id: { $in: Array.from(labIds) } })
                .select('labName location organizationIdentifier')
                .lean() : []
        ]);

        // Create lookup maps
        const userMap = new Map();
        const labMap = new Map();

        users.forEach(user => {
            userMap.set(user._id.toString(), user);
        });

        labs.forEach(lab => {
            labMap.set(lab._id.toString(), lab);
        });

        return { userMap, labMap };
    } catch (error) {
        console.error('❌ Error building lookup maps:', error);
        return { userMap: new Map(), labMap: new Map() };
    }
};

export default {
    getValues,
    getPendingStudies,
    getInProgressStudies,
    getCompletedStudies,
    getAllStudiesForAdmin
};