import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';

import DicomStudy from '../models/dicomStudyModel.js';
import Lab from '../models/labModel.js';
import User from '../models/userModel.js';

const cache = new NodeCache({ stdTTL: 180, checkperiod: 60, useClones: false });

// ── Time helpers ─────────────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const toDate = (v) => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const diffMin = (a, b) => {
    const s = toDate(a), e = toDate(b);
    if (!s || !e) return null;
    const d = e - s;
    return d < 0 ? null : Math.round(d / 60000);
};

const fmtMin = (m) => {
    if (m === null || m === undefined) return '-';
    const abs = Math.abs(m);
    if (abs < 60) return `${abs}m`;
    const h = Math.floor(abs / 60);
    const r = abs % 60;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

const fmtHMS = (m) => {
    if (m === null || m === undefined) return '-';
    const abs = Math.abs(m);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${h}:${mm}:00`;
};

// IST formatter: DD/MM/YYYY, HH:MM (24h)
const fmtIST = (v) => {
    const d = toDate(v);
    if (!d) return '-';
    return d.toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit',
        year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    });
};

// IST date only: DD/MM/YYYY (used when DICOM stores time separately)
const fmtISTDate = (v) => {
    const d = toDate(v);
    if (!d) return '-';
    return d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

// DICOM studyTime (HHMMSS[.ffffff] string) → HH:MM
const fmtStudyTime = (t) => {
    if (!t) return '';
    const clean = String(t).trim().split('.')[0];
    if (!/^\d{4,6}$/.test(clean)) return '';
    const hh = clean.slice(0, 2);
    const mm = clean.slice(2, 4);
    if (+hh > 23 || +mm > 59) return '';
    return `${hh}:${mm}`;
};

// Combined DICOM study date/time: "DD/MM/YYYY, HH:MM" (matches worklist semantics)
const fmtStudyDateTime = (dateVal, timeVal) => {
    const datePart = fmtISTDate(dateVal);
    if (datePart === '-') return '-';
    const timePart = fmtStudyTime(timeVal);
    return timePart ? `${datePart}, ${timePart}` : datePart;
};

// Convert a yyyy-mm-dd date string (local IST date) to UTC start/end
const istStartOfDayUTC = (ds) => {
    const d = new Date(ds); if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_OFFSET_MS);
};
const istEndOfDayUTC = (ds) => {
    const d = new Date(ds); if (Number.isNaN(d.getTime())) return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS);
};

const pickTime = (hist = [], statuses = [], mode = 'latest') => {
    const times = hist.filter(e => e && statuses.includes(e.status))
        .map(e => toDate(e.changedAt)).filter(Boolean)
        .sort((a, b) => a - b);
    if (!times.length) return null;
    return mode === 'first' ? times[0] : times[times.length - 1];
};

// ── Aggregation pipeline builder (mirrors admin.controller.js patterns) ──────
const USER_FIELDS = { fullName: 1, username: 1, email: 1, role: 1 };

const buildPipeline = ({ user, location, status, dateType, fromDate, toDate: td, skip = 0, limit = 200, forExport = false }) => {
    const match = {};

    // Multi-tenancy
    if (user?.role !== 'super_admin' && user?.organizationIdentifier)
        match.organizationIdentifier = user.organizationIdentifier;

    if (location && mongoose.Types.ObjectId.isValid(location))
        match.sourceLab = new mongoose.Types.ObjectId(location);

    if (status) match.workflowStatus = status;

    // Date range — IST boundaries
    if (fromDate && td) {
        const s = istStartOfDayUTC(fromDate), e = istEndOfDayUTC(td);
        if (s && e) {
            const field = {
                studyDate: 'studyDate',
                assignedDate: 'assignment.assignedAt',
                reportDate: 'reportInfo.finalizedAt'
            }[dateType] || 'createdAt';
            match[field] = { $gte: s, $lte: e };
        }
    }

    // Data pipeline (what each study row looks like after lookups)
    const dataPipeline = [
        { $sort: { createdAt: -1 } },
        ...(forExport ? [] : [{ $skip: skip }, { $limit: limit }]),

        // Narrow fields before lookup (perf)
        {
            $project: {
                _id: 1, bharatPacsId: 1, accessionNumber: 1,
                workflowStatus: 1, studyDate: 1, studyTime: 1, createdAt: 1,
                examDescription: 1, modality: 1, modalitiesInStudy: 1,
                seriesCount: 1, instanceCount: 1,
                patient: 1, patientInfo: 1,
                sourceLab: 1, assignment: 1,
                statusHistory: 1, studyLock: 1,
                revertInfo: 1, reportInfo: 1,
                referringPhysicianName: 1,
                clinicalHistory: 1,
            }
        },

        // patient
        {
            $lookup: {
                from: 'patients', localField: 'patient', foreignField: '_id',
                pipeline: [{ $project: { patientID: 1, patientNameRaw: 1, firstName: 1, lastName: 1, age: 1, gender: 1, 'computed.fullName': 1 } }],
                as: '_pt',
            }
        },
        { $addFields: { patient: { $arrayElemAt: ['$_pt', 0] } } },
        { $unset: '_pt' },

        // lab
        {
            $lookup: {
                from: 'labs', localField: 'sourceLab', foreignField: '_id',
                pipeline: [{ $project: { name: 1, identifier: 1 } }],
                as: '_lab',
            }
        },
        { $addFields: { lab: { $arrayElemAt: ['$_lab', 0] } } },
        { $unset: '_lab' },

        // assignment.assignedTo — resolve all user refs in one shot
        {
            $lookup: {
                from: 'users',
                let: { ids: '$assignment.assignedTo' },
                pipeline: [
                    { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$ids', []] }] } } },
                    { $project: USER_FIELDS }
                ],
                as: '_assignedToUsers',
            }
        },
        {
            $lookup: {
                from: 'users',
                let: { ids: '$assignment.assignedBy' },
                pipeline: [
                    { $match: { $expr: { $in: ['$_id', { $ifNull: ['$$ids', []] }] } } },
                    { $project: USER_FIELDS }
                ],
                as: '_assignedByUsers',
            }
        },

        // reportInfo.verificationInfo.verifiedBy
        {
            $lookup: {
                from: 'users', localField: 'reportInfo.verificationInfo.verifiedBy', foreignField: '_id',
                pipeline: [{ $project: USER_FIELDS }],
                as: '_verifiedBy',
            }
        },
        { $addFields: { 'reportInfo.verificationInfo.verifiedBy': { $arrayElemAt: ['$_verifiedBy', 0] } } },
        { $unset: '_verifiedBy' },

        // studyLock.lockedBy
        {
            $lookup: {
                from: 'users', localField: 'studyLock.lockedBy', foreignField: '_id',
                pipeline: [{ $project: USER_FIELDS }],
                as: '_lockedBy',
            }
        },
        { $addFields: { 'studyLock.lockedBy': { $arrayElemAt: ['$_lockedBy', 0] } } },
        { $unset: '_lockedBy' },

        // Reports collection — for count + finalized verifier fallback
        {
            $lookup: {
                from: 'reports', localField: '_id', foreignField: 'dicomStudy',
                pipeline: [{ $project: { reportStatus: 1, doctorId: 1, 'verificationInfo.verifiedBy': 1, 'verificationInfo.verifiedAt': 1, 'workflowInfo.finalizedAt': 1 } }],
                as: '_reports',
            }
        },
        { $addFields: { reports: '$_reports' } },
        { $unset: '_reports' },
    ];

    // Use $facet for simultaneous count + data when paginated view
    if (forExport) {
        return [{ $match: match }, ...dataPipeline];
    }

    return [
        { $match: match },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: dataPipeline,
            }
        }
    ];
};

// ── Row processor ────────────────────────────────────────────────────────────
const processStudy = (s) => {
    const hist = Array.isArray(s.statusHistory) ? s.statusHistory : [];
    const patient = s.patient || {};

    // Patient name (same fallback chain as admin worklist)
    const patientName = (
        patient.computed?.fullName ||
        patient.patientNameRaw ||
        (patient.firstName ? `${patient.lastName || ''}, ${patient.firstName}`.trim().replace(/^,\s*/, '') : '') ||
        s.patientInfo?.patientName ||
        '-'
    );

    // Patient ID (capital D)
    const patientId = patient.patientID || s.patientInfo?.patientID || '-';

    // Patient age
    const patientAge = patient.age || s.patientInfo?.age || '-';

    // Assignment
    const latestAssign = Array.isArray(s.assignment) && s.assignment.length
        ? [...s.assignment].sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0))[0]
        : null;

    const assignedToUser = s._assignedToUsers?.find(u => u._id?.toString() === latestAssign?.assignedTo?.toString());
    const assignedByUser = s._assignedByUsers?.find(u => u._id?.toString() === latestAssign?.assignedBy?.toString());

    // Key timestamps
    const uploadedAt = pickTime(hist, ['new_study_received'], 'first') || toDate(s.createdAt);
    const assignedAt = toDate(latestAssign?.assignedAt) || pickTime(hist, ['assigned_to_doctor'], 'latest');
    const lockedAt = toDate(s.studyLock?.lockedAt) || pickTime(hist, ['study_locked'], 'latest');
    const reportedAt = pickTime(hist, ['report_completed', 'report_finalized'], 'latest') || toDate(s.reportInfo?.finalizedAt);
    const verifiedAt = toDate(s.reportInfo?.verificationInfo?.verifiedAt) || pickTime(hist, ['report_verified'], 'latest');
    const finalDownloadedAt = pickTime(hist, ['final_report_downloaded'], 'latest');
    const historyCreatedAt = pickTime(hist, ['history_created'], 'first');

    // Reported by: prefer assigned radiologist (actually did the report)
    const reportedByName = assignedToUser?.username || assignedToUser?.fullName || '-';

    // Verify by: from reportInfo.verificationInfo (populated via $lookup)
    const verifier = s.reportInfo?.verificationInfo?.verifiedBy;
    const verifyBy = verifier?.username || verifier?.fullName || '-';

    // Report count
    const reportCount = s.reports?.length || 0;

    // Revert count
    const revertCount = s.revertInfo?.revertCount ||
        hist.filter(e => ['study_reverted', 'revert_to_radiologist', 'report_rejected'].includes(e.status)).length;

    // TAT calculations
    const tatAssignedToFinal = diffMin(assignedAt, reportedAt);
    const tatHistoryToVerify = diffMin(historyCreatedAt || uploadedAt, verifiedAt);
    const tatUploadToVerify = diffMin(uploadedAt, verifiedAt);
    const turnAroundTime = diffMin(uploadedAt, finalDownloadedAt || verifiedAt || reportedAt);

    return {
        _id: s._id,
        center: s.lab?.name || '-',
        patientId,
        patientName,
        modality: Array.isArray(s.modalitiesInStudy) && s.modalitiesInStudy.length
            ? s.modalitiesInStudy.join(',')
            : (s.modality || '-'),
        imageCount: s.instanceCount || 0,
        noOfReports: reportCount,
        patientAge,
        studyName: s.examDescription || '-',
        studyDateTime: fmtStudyDateTime(s.studyDate || s.createdAt, s.studyTime),
        history: s.clinicalHistory?.clinicalHistory || '-',
        historyAt: fmtIST(historyCreatedAt),
        assignedBy: assignedByUser?.username || assignedByUser?.fullName || '-',
        assignedAt: fmtIST(assignedAt),
        referringPhysicianName: s.referringPhysicianName || '-',
        lockedAt: fmtIST(lockedAt),
        reportedBy: reportedByName,
        reportedAt: fmtIST(reportedAt),
        verifyBy,
        verifyAt: fmtIST(verifiedAt),
        tatAssignedToFinal: fmtHMS(tatAssignedToFinal),
        tatHistoryCreatedToVerify: fmtHMS(tatHistoryToVerify),
        tatUploadedToVerify: fmtHMS(tatUploadToVerify),
        turnAroundTime: fmtHMS(turnAroundTime),
        bharatPacsId: s.bharatPacsId || '-',
        revertCount,
        // Raw minutes for visual gradient
        _turnAroundMin: turnAroundTime,
        _tatAssignedToFinalMin: tatAssignedToFinal,
        _tatUploadToVerifyMin: tatUploadToVerify,
    };
};

// ── Query executor with true server-side pagination ──────────────────────────
const queryTat = async ({ req, forExport = false }) => {
    const {
        location, dateType = 'uploadDate', fromDate, toDate: td, status,
        page = 1, limit = 100
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(1000, Math.max(10, parseInt(limit) || 100));
    const skip = (pageNum - 1) * pageSize;

    const cacheKey = `tat3:${req.user?._id}:${location || ''}:${dateType}:${fromDate || ''}:${td || ''}:${status || ''}:${pageNum}:${pageSize}:${forExport}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const pipe = buildPipeline({
        user: req.user, location, status, dateType,
        fromDate, toDate: td, skip, limit: pageSize, forExport,
    });

    if (forExport) {
        const raw = await DicomStudy.aggregate(pipe).allowDiskUse(true);
        const studies = raw.map(processStudy);
        const payload = { studies, total: studies.length };
        cache.set(cacheKey, payload, 120);
        return payload;
    }

    // Paginated — use $facet
    const [result] = await DicomStudy.aggregate(pipe).allowDiskUse(true);
    const total = result?.metadata?.[0]?.total || 0;
    const studies = (result?.data || []).map(processStudy);

    // Compute summary stats over this page
    const withTat = studies.filter(s => s._turnAroundMin !== null && s._turnAroundMin !== undefined);
    const avgTAT = withTat.length
        ? Math.round(withTat.reduce((a, c) => a + c._turnAroundMin, 0) / withTat.length)
        : 0;

    const payload = {
        studies,
        pagination: {
            page: pageNum, limit: pageSize, total,
            totalPages: Math.ceil(total / pageSize),
            hasNext: pageNum * pageSize < total,
            hasPrev: pageNum > 1,
        },
        summary: {
            totalStudies: total,
            pageStudies: studies.length,
            studiesWithTAT: withTat.length,
            averageTATMinutes: avgTAT,
            averageTATFormatted: fmtMin(avgTAT),
        }
    };

    cache.set(cacheKey, payload, 180);
    return payload;
};

// ── Endpoints ────────────────────────────────────────────────────────────────
export const getLocations = async (req, res) => {
    try {
        const q = { isActive: true };
        if (req.user?.role !== 'super_admin' && req.user?.organizationIdentifier)
            q.organizationIdentifier = req.user.organizationIdentifier;
        const labs = await Lab.find(q).select('name identifier').sort({ name: 1 }).lean();
        res.json({
            success: true,
            locations: labs.map(l => ({ value: l._id.toString(), label: l.name, code: l.identifier }))
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getDoctors = async (req, res) => {
    try {
        const q = { isActive: true, role: { $in: ['radiologist', 'verifier'] } };
        if (req.user?.role !== 'super_admin' && req.user?.organizationIdentifier)
            q.organizationIdentifier = req.user.organizationIdentifier;
        const users = await User.find(q).select('fullName username email role').sort({ username: 1 }).lean();
        res.json({
            success: true,
            doctors: users.map(u => ({ value: u._id.toString(), label: u.username || u.fullName, email: u.email, role: u.role }))
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

export const getTATReport = async (req, res) => {
    try {
        const start = Date.now();
        const payload = await queryTat({ req });
        res.json({ success: true, ...payload, performance: { queryTimeMs: Date.now() - start } });
    } catch (e) {
        console.error('❌ [TAT] Error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
};

export const exportTATReport = async (req, res) => {
    try {
        const { studies } = await queryTat({ req, forExport: true });
        if (!studies.length) return res.status(404).json({ success: false, message: 'No data' });

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('TAT Report');

        ws.columns = [
            { header: 'CENTER', key: 'center', width: 22 },
            { header: 'PATIENT ID', key: 'patientId', width: 16 },
            { header: 'PATIENT NAME', key: 'patientName', width: 24 },
            { header: 'MODALITY', key: 'modality', width: 8 },
            { header: 'IMAGES', key: 'imageCount', width: 8 },
            { header: 'REPORTS', key: 'noOfReports', width: 8 },
            { header: 'AGE', key: 'patientAge', width: 6 },
            { header: 'STUDY NAME', key: 'studyName', width: 28 },
            { header: 'STUDY DATE/TIME (IST)', key: 'studyDateTime', width: 22 },
            { header: 'HISTORY', key: 'history', width: 30 },
            { header: 'HISTORY AT (IST)', key: 'historyAt', width: 20 },
            { header: 'ASSIGNED BY', key: 'assignedBy', width: 18 },
            { header: 'ASSIGNED AT (IST)', key: 'assignedAt', width: 20 },
            { header: 'REFERRING DR', key: 'referringPhysicianName', width: 20 },
            { header: 'LOCKED AT (IST)', key: 'lockedAt', width: 20 },
            { header: 'REPORTED BY', key: 'reportedBy', width: 18 },
            { header: 'REPORTED AT (IST)', key: 'reportedAt', width: 20 },
            { header: 'VERIFY BY', key: 'verifyBy', width: 18 },
            { header: 'VERIFY AT (IST)', key: 'verifyAt', width: 20 },
            { header: 'ASSIGNED→FINAL', key: 'tatAssignedToFinal', width: 16 },
            { header: 'HISTORY→VERIFY', key: 'tatHistoryCreatedToVerify', width: 16 },
            { header: 'UPLOAD→VERIFY', key: 'tatUploadedToVerify', width: 16 },
            { header: 'TAT', key: 'turnAroundTime', width: 12 },
            { header: 'BP ID', key: 'bharatPacsId', width: 22 },
            { header: 'REVERT', key: 'revertCount', width: 8 },
        ];

        const header = ws.getRow(1);
        header.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        header.height = 28;

        studies.forEach(s => ws.addRow(s));

        ws.eachRow((row, i) => {
            if (i === 1) return;
            row.font = { size: 9 };
            if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="TAT_Report_${new Date().toISOString().slice(0, 10)}.xlsx"`);
        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ success: false, message: e.message });
    }
};

export default { getLocations, getDoctors, getTATReport, exportTATReport };
