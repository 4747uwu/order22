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

// ✅ DOCTOR-SPECIFIC: Build base query scoped to assigned studies
const buildDoctorBaseQuery = (req, workflowStatuses = null) => {
    const user = req.user;
    const queryFilters = {
        organizationIdentifier: user.organizationIdentifier,
        'assignment.assignedTo': new mongoose.Types.ObjectId(user._id)
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

// ✅ EXECUTE STUDY QUERY - Same as assigner controller
const executeStudyQuery = async (queryFilters, limit) => {
    try {
        const totalStudies = await DicomStudy.countDocuments(queryFilters);
        
        // ✅ SAME POPULATE AS ASSIGNER CONTROLLER
        const studies = await DicomStudy.find(queryFilters)
            .populate('assignment.assignedTo', 'fullName email role')
            .populate('assignment.assignedBy', 'fullName email role')
            // .populate('reportInfo.reportedBy', 'fullName email role')
            // .populate('reportInfo.verifiedBy', 'fullName email role')
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

// ✅ 1. GET DASHBOARD VALUES - Same structure as admin
export const getValues = async (req, res) => {
    console.log(`🔍 Doctor dashboard: Fetching values with filters: ${JSON.stringify(req.query)}`);
    try {
        const startTime = Date.now();
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Build query filters for doctor's assigned studies
        const queryFilters = buildDoctorBaseQuery(req);
        
        console.log(`🔍 Doctor dashboard query filters:`, JSON.stringify(queryFilters, null, 2));

        // Status mapping for doctor workflow
        const statusCategories = {
            pending: ['new_study_received', 'pending_assignment'],
            inprogress: ['assigned_to_doctor', 'doctor_opened_report', 'report_in_progress', 'report_drafted'],
            completed: ['report_finalized', 'final_report_downloaded', 'archived']
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
        console.log(`🎯 Doctor dashboard values fetched in ${processingTime}ms`);

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
                organization: user.organizationIdentifier
            };
        }

        res.status(200).json(response);

    } catch (error) {
        console.error('❌ Error fetching doctor dashboard values:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching doctor dashboard statistics.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 2. GET PENDING STUDIES - Studies assigned but not started
export const getPendingStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        console.log('🟡 DOCTOR PENDING: Fetching pending studies');
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const pendingStatuses = ['new_study_received', 'pending_assignment', 'assigned_to_doctor'];
        const queryFilters = buildDoctorBaseQuery(req, pendingStatuses);
        
        console.log(`🔍 DOCTOR PENDING query filters:`, JSON.stringify(queryFilters, null, 2));

        const { studies, totalStudies } = await executeStudyQuery(queryFilters, limit);

        const processingTime = Date.now() - startTime;
        console.log(`✅ DOCTOR PENDING: Completed in ${processingTime}ms`);

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
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ DOCTOR PENDING: Error fetching pending studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching pending studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 3. GET IN-PROGRESS STUDIES - Studies doctor is working on
export const getInProgressStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const inProgressStatuses = [
            'doctor_opened_report', 'report_in_progress', 'report_drafted'
        ];
        const queryFilters = buildDoctorBaseQuery(req, inProgressStatuses);

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
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ DOCTOR IN-PROGRESS: Error fetching in-progress studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching in-progress studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 4. GET COMPLETED STUDIES - Studies doctor has finished
export const getCompletedStudies = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const completedStatuses = ['report_finalized', 'final_report_downloaded', 'archived'];
        const queryFilters = buildDoctorBaseQuery(req, completedStatuses);

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
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ DOCTOR COMPLETED: Error fetching completed studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching completed studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 5. GET ALL STUDIES - All studies assigned to doctor
export const getAllStudiesForDoctor = async (req, res) => {
    try {
        const startTime = Date.now();
        const limit = parseInt(req.query.limit) || 50;
        
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const queryFilters = buildDoctorBaseQuery(req);

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
                processingTime: processingTime
            }
        });

    } catch (error) {
        console.error('❌ DOCTOR ALL: Error fetching all studies:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching studies.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ NEW: CREATE TYPIST ENDPOINT
export const createTypist = async (req, res) => {
    try {
        const doctor = req.user;
        
        // Validate doctor role
        if (!['radiologist', 'doctor_account'].includes(doctor.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only doctors can create typists'
            });
        }

        const { fullName, email, password, roleConfig } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Full name, email, and password are required'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            organizationIdentifier: doctor.organizationIdentifier 
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists in this organization'
            });
        }

        // Generate username from email
        const username = email.split('@')[0].toLowerCase();

        // Create typist
        const typist = new User({
            fullName: fullName.trim(),
            email: email.toLowerCase(),
            username: username,
            password: password,
            role: 'typist',
            organization: doctor.organization,
            organizationIdentifier: doctor.organizationIdentifier,
            hierarchy: {
                createdBy: doctor._id,
                parentUser: doctor._id,
                organizationType: doctor.hierarchy?.organizationType || 'teleradiology_company'
            },
            roleConfig: {
                linkedRadiologist: doctor._id, // Link to the creating doctor
                ...roleConfig
            },
            createdBy: doctor._id,
            isActive: true
        });

        await typist.save();

        // Update doctor's child users
        await User.findByIdAndUpdate(doctor._id, {
            $push: { 'hierarchy.childUsers': typist._id }
        });

        // Remove password from response
        const typistResponse = typist.toObject();
        delete typistResponse.password;

        console.log(`✅ TYPIST CREATED: ${typist.fullName} (${typist.email}) by doctor ${doctor.fullName}`);

        return res.status(201).json({
            success: true,
            message: 'Typist created successfully',
            typist: typistResponse
        });

    } catch (error) {
        console.error('❌ Error creating typist:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create typist',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export default {
    getValues,
    getPendingStudies,
    getInProgressStudies,
    getCompletedStudies,
    getAllStudiesForDoctor,
    createTypist
};