import axios from 'axios';
import DicomStudy from '../models/dicomStudyModel.js';
import Report from '../models/reportModel.js';
import User from '../models/userModel.js';
import Doctor from '../models/doctorModel.js';
import Lab from '../models/labModel.js';
import https from 'https';
import mongoose from 'mongoose';
import { updateWorkflowStatus } from '../utils/workflowStatusManager.js';

const DOCX_SERVICE_URL = 'http://206.189.133.52:8081/api/Document/generate';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ============================================================
// ✅ SHARED HELPER: Build payload for C# service from a report
// ============================================================
const buildDocxPayload = async (report, outputFormat = 'pdf') => {
    const htmlContent = report.reportContent?.htmlContent;
    if (!htmlContent) throw new Error('No HTML content in report');

    const capturedImages = report.reportContent?.capturedImages || [];
    const imageCount = capturedImages.length;

    // Lab branding
    const labBranding = report.dicomStudy?.sourceLab?.reportBranding || null;

    // ✅ DETERMINE TEMPLATE NAME based on header/footer availability + header template style
    let hasHeaderFooter = false;
    if (labBranding) {
        const hasHeader = labBranding.showHeader !== false && labBranding.headerImage?.url;
        const hasFooter = labBranding.showFooter !== false && labBranding.footerImage?.url;
        hasHeaderFooter = hasHeader || hasFooter;
    }

    // ✅ Get the lab's header template preference (e.g., 'sb', '4col1', '4col2', '4col5', or '' for default)
    const headerTemplateSuffix = labBranding?.headerTemplate || '';

    // ✅ Build template name following the pattern:
    //    MyReport{headerTemplate}{imageCount}.docx          (with branding)
    //    MyReportNoHeader{headerTemplate}{imageCount}.docx  (without branding)
    //
    // Examples:
    //    Default + no images + branding    → MyReport.docx
    //    Default + 2 images + branding     → MyReport2.docx
    //    sb + 3 images + branding          → MyReportsb3.docx
    //    4col1 + 0 images + no branding   → MyReportNoHeader4col1.docx
    //    4col2 + 4 images + no branding   → MyReportNoHeader4col24.docx
    const clampedImageCount = Math.min(imageCount, 5); // Max 5 image slots
    const imageSuffix = clampedImageCount > 0 ? String(clampedImageCount) : '';

    let templateName;
    if (!hasHeaderFooter) {
        templateName = `MyReportNoHeader${headerTemplateSuffix}${imageSuffix}.docx`;
        console.log(`📄 Using NoHeader template: ${templateName} (style: ${headerTemplateSuffix || 'default'}, images: ${imageCount})`);
    } else {
        templateName = `MyReport${headerTemplateSuffix}${imageSuffix}.docx`;
        console.log(`📄 Using standard template: ${templateName} (style: ${headerTemplateSuffix || 'default'}, images: ${imageCount})`);
    }

    // Doctor data
    let doctorData = null;
    if (report.doctorId) {
        try {
            const doctorUser = await User.findById(report.doctorId);
            const doctorProfile = await Doctor.findOne({ userAccount: report.doctorId });
            if (doctorUser && doctorProfile) {
                doctorData = {
                    fullName: doctorUser.fullName,
                    department: doctorProfile.department || 'Radiology',
                    licenseNumber: doctorProfile.licenseNumber || 'N/A',
                    signature: doctorProfile.signature || '',
                    disclaimer: 'Electronically signed. This is a digitally generated report.'
                };
            }
        } catch (e) { console.warn('⚠️ Failed to fetch doctor data'); }
    }

    // ✅ Patient ID extraction — Report.patientInfo has NO patientId field,
    // and Patient model uses `patientID` (capital D). Also check DicomStudy
    // which stores it in both patientInfo.patientID AND the top-level patientId.
    const patientIdValue = (
        report.dicomStudy?.patientInfo?.patientID ||
        report.dicomStudy?.patientId ||
        report.patient?.patientID ||
        ''
    );

    const placeholders = {
        '--name--': report.patientInfo?.fullName || report.dicomStudy?.patientInfo?.patientName || report.patient?.patientNameRaw || report.patient?.fullName || '[Patient Name]',
        '--patientid--': patientIdValue || '[Patient ID]',
        // ✅ --uid-- is the accession number (used by some templates as "UID" field)
        '--uid--': report.accessionNumber || report.dicomStudy?.accessionNumber || '',
        '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
        '--agegender--': `${report.patientInfo?.age || report.patient?.age || '[Age]'} / ${report.patientInfo?.gender || report.patient?.gender || '[Gender]'}`,
        '--referredby--': (
            (report.studyInfo?.referringPhysician?.name && report.studyInfo.referringPhysician.name !== 'N/A' ? report.studyInfo.referringPhysician.name : null) ||
            (report.dicomStudy?.referringPhysician?.name?.trim()) ||
            report.dicomStudy?.referringPhysicianName?.trim() ||
            '[Referring Physician]'
        ),
        '--reporteddate--': report.studyInfo?.studyDate
  ? new Date(report.studyInfo.studyDate).toLocaleDateString('en-GB')
  : new Date().toLocaleDateString('en-GB'),
        '--studydate--': report.studyInfo?.studyDate ? new Date(report.studyInfo.studyDate).toLocaleDateString() : '[Study Date]',
        '--modality--': report.studyInfo?.modality || report.dicomStudy?.modality || '[Modality]',
        '--clinicalhistory--': report.patientInfo?.clinicalHistory || '[Clinical History]',
        // ✅ SB template needs --center-- (lab/institution name)
        '--center--': report.dicomStudy?.sourceLab?.name || report.studyInfo?.institutionName || report.dicomStudy?.institutionName || '[Center]',
        // ✅ 4col1 template needs --studydescription-- (exam description)
        '--studydescription--': report.studyInfo?.examDescription || report.dicomStudy?.examDescription || '[Study Description]',
        '--Content--': htmlContent
    };

    console.log('🔍 Placeholder values:', placeholders);

    // if (doctorData) {
    //     placeholders['--drname--'] = doctorData.fullName;
    //     placeholders['--department--'] = doctorData.department;
    //     placeholders['--Licence--'] = doctorData.licenseNumber;
    //     placeholders['--disc--'] = doctorData.disclaimer;
    // }

    if (doctorData) {
    placeholders['--drname--'] = ''; // keep this plain to avoid breaking signature region

    // placeholders['--department--'] =
    //     `<span style="white-space: normal; word-wrap: break-word; font-size: 9pt; line-height: 0.5; font-weight: 700;">
    //         ${doctorData.fullName}<br/>${doctorData.department}<br/>${doctorData.licenseNumber}<br/>${doctorData.disclaimer}
    //     </span>`;


    placeholders['--department--'] =
  `<div style="font-weight:700;font-size:9pt;line-height:1;margin:0;padding:0;mso-line-height-rule:exactly;">
    <span style="display:block;margin:0;padding:0;">${doctorData.fullName}</span><br/>
    <span style="display:block;margin:0;padding:0;">${doctorData.department}</span><br/>
    <span style="display:block;margin:0;padding:0;">${doctorData.licenseNumber}</span><br/>
    <span style="display:block;margin:0;padding:0;">${doctorData.disclaimer}</span><br/>
  </div>`.replace(/\n\s*/g, '');

    placeholders['--Licence--'] = '';
    placeholders['--disc--'] = '';
}

    const images = {};
    
    // ✅ Only add header/footer images if they exist
    if (labBranding && hasHeaderFooter) {
        if (labBranding.showHeader !== false && labBranding.headerImage?.url) {
            images['HeaderPlaceholder'] = {
                data: labBranding.headerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                width: labBranding.headerImage.width,
                height: labBranding.headerImage.height
            };
        }
        if (labBranding.showFooter !== false && labBranding.footerImage?.url) {
            images['FooterPlaceholder'] = {
                data: labBranding.footerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                width: labBranding.footerImage.width,
                height: labBranding.footerImage.height
            };
        }
    }

    if (doctorData?.signature) {
        images['Picture 6'] = {
            data: doctorData.signature.replace(/^data:image\/\w+;base64,/, ''),
            width: null, height: null
        };
    }

    capturedImages.forEach((img, index) => {
        images[`Picture ${index + 1}`] = {
            data: img.imageData.replace(/^data:image\/\w+;base64,/, ''),
            width: null, height: null
        };
    });

    console.log(`🎨 [Template Selection] Lab: ${report.dicomStudy?.sourceLab?.name || 'Unknown'}, HasBranding: ${hasHeaderFooter}, ImageCount: ${imageCount}, Template: ${templateName}`);

    return {
        templateName,
        placeholders,
        images,
        studyId: report.dicomStudy?._id?.toString() || '',
        outputFormat
    };
};

// ============================================================
// ✅ SHARED HELPER: Fetch all finalized reports for a study
// ============================================================
const fetchReportsForStudy = async (studyId) => {
    return await Report.find({
        dicomStudy: studyId,
        reportStatus: { $in: ['finalized', 'verified', 'approved'] }
    })
        .populate('patient', 'fullName patientNameRaw patientID age gender')
        .populate({
            path: 'dicomStudy',
            select: 'accessionNumber modality studyDate referringPhysician referringPhysicianName physicians patientInfo patientId examDescription institutionName sourceLab _id',
            populate: { path: 'sourceLab', model: 'Lab' }
        })
        .populate('doctorId', 'fullName email')
        .sort({ createdAt: -1 });
};

const canDownloadReport = (report) => {
    const allowedReportStatuses = ['verified', 'approved'];
    const allowedFinalizedStudyStatuses = [
        'report_completed',
        'report_reprint_needed',
        'final_report_downloaded',
        'archived'
    ];

    return (
        allowedReportStatuses.includes(report.reportStatus) ||
        (report.reportStatus === 'finalized' &&
            allowedFinalizedStudyStatuses.includes(report.dicomStudy?.workflowStatus))
    );
};

class ReportDownloadController {

    // ============================================================
    // ✅ NEW: Get all report IDs for a study
    // Frontend calls this first, then downloads each reportId individually
    // ============================================================
    static async getStudyReportIds(req, res) {
        try {
            const { studyId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(studyId)) {
                return res.status(400).json({ success: false, message: 'Invalid studyId' });
            }

            const reports = await fetchReportsForStudy(studyId);

            if (!reports.length) {
                return res.status(404).json({ success: false, message: 'No finalized reports found for this study' });
            }

            console.log(`📋 [GetReportIds] Found ${reports.length} report(s) for study ${studyId}`);

            res.status(200).json({
                success: true,
                data: {
                    studyId,
                    totalReports: reports.length,
                    // ✅ Return list of report IDs — frontend downloads each one
                    reports: reports.map((r, i) => ({
                        reportId: r._id,
                        reportNumber: i + 1,
                        reportStatus: r.reportStatus,
                        doctorName: r.doctorId?.fullName || 'Unknown',
                        createdAt: r.createdAt
                    }))
                }
            });
        } catch (error) {
            console.error('❌ [GetReportIds] Error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to fetch report IDs', error: error.message });
        }
    }

    // ============================================================
    // ✅ FIXED: Download single report as DOCX (by reportId only)
    // ============================================================
    static async downloadReportAsDOCX(req, res) {
        console.log('📥 [Download DOCX] Starting...');

        try {
            const { reportId } = req.params;
            console.log(req.body)

            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                return res.status(400).json({ success: false, message: 'Invalid reportId' });
            }

            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientNameRaw patientID age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician referringPhysicianName physicians patientInfo patientId examDescription institutionName sourceLab _id bharatPacsId workflowStatus',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            if (!canDownloadReport(report)) {
                console.warn(`⚠️ [Download DOCX] Blocked — reportStatus='${report.reportStatus}', studyWorkflowStatus='${report.dicomStudy?.workflowStatus || 'unknown'}'. ReportId: ${reportId}`);
                return res.status(403).json({
                    success: false,
                    message: `Report is not downloadable yet. reportStatus='${report.reportStatus}', studyWorkflowStatus='${report.dicomStudy?.workflowStatus || 'unknown'}'.`
                });
            }

            const payload = await buildDocxPayload(report, 'docx');

            const docxResponse = await axios.post(DOCX_SERVICE_URL, payload, {
                responseType: 'arraybuffer',
                timeout: 60000,
                httpsAgent
            });

            const fileName = `${report.reportId || `Report_${report._id}`}_${new Date().toISOString().split('T')[0]}.docx`;

            const downloaderRoles = req.user?.accountRoles?.length > 0 ? req.user.accountRoles : [req.user?.role];
if (downloaderRoles.includes('lab_staff')) {
    updateWorkflowStatus({
        studyId: report.dicomStudy._id,
        status: 'final_report_downloaded',
        note: `Report downloaded as docx by ${req.user?.fullName || 'User'}`,
        user: req.user
    }).catch(e => console.warn('Workflow update failed'));
}

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(docxResponse.data));
            console.log(`✅ [Download DOCX] Sent verified report: ${fileName}`);

        } catch (error) {
            console.error('❌ [Download DOCX] Error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to download DOCX', error: error.message });
        }
    }

    // ============================================================
    // ✅ Download single report as PDF — VERIFIED ONLY
    // ============================================================
    static async downloadReportAsPDF(req, res) {
        console.log('📥 [Download PDF] Starting...');
        try {
            const { reportId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                return res.status(400).json({ success: false, message: 'Invalid reportId' });
            }

            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientNameRaw patientID age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician referringPhysicianName physicians patientInfo patientId examDescription institutionName sourceLab _id bharatPacsId workflowStatus',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            if (!canDownloadReport(report)) {
                return res.status(403).json({
                    success: false,
                    message: `Report is not downloadable yet. reportStatus='${report.reportStatus}', studyWorkflowStatus='${report.dicomStudy?.workflowStatus || 'unknown'}'.`
                });
            }

            const payload = await buildDocxPayload(report, 'pdf');
            const pdfResponse = await axios.post(DOCX_SERVICE_URL, payload, {
                responseType: 'arraybuffer', timeout: 60000, httpsAgent
            });

            // ✅ Update Report model download history
            if (!report.downloadInfo) report.downloadInfo = { downloadHistory: [], totalDownloads: 0 };
            report.downloadInfo.totalDownloads += 1;
            report.downloadInfo.lastDownloaded = new Date();
            report.downloadInfo.downloadHistory.push({
                downloadedBy: req.user?._id,
                downloadedAt: new Date(),
                downloadType: 'final',
                ipAddress: req.ip
            });
            await report.save();

            // ✅ NEW: Update DicomStudy printHistory + lastDownload
            if (report.dicomStudy?._id) {
                await DicomStudy.findByIdAndUpdate(report.dicomStudy._id, {
                    $push: {
                        printHistory: {
                            printedAt: new Date(),
                            printedBy: req.user?._id,
                            printedByName: req.user?.fullName || 'Unknown',
                            printType: 'pdf_download',
                            printMethod: 'pdf_download',
                            reportStatus: report.reportStatus,
                            bharatPacsId: report.dicomStudy?.bharatPacsId || '',
                            ipAddress: req.ip
                        }
                    },
                    $set: {
                        lastDownload: {
                            downloadedAt: new Date(),
                            downloadedBy: req.user?._id,
                            downloadedByName: req.user?.fullName || 'Unknown',
                            downloadType: 'pdf',
                            reportId: report._id,
                        }
                    }
                });
                            const downloaderRoles = req.user?.accountRoles?.length > 0 ? req.user.accountRoles : [req.user?.role];


                if (downloaderRoles.includes('lab_staff')) {
                    updateWorkflowStatus({
                        studyId: report.dicomStudy._id,
                        status: 'final_report_downloaded',
                        note: `Report downloaded as PDF by ${req.user?.fullName || 'User'}`,
                        user: req.user
                    }).catch(e => console.warn('Workflow update failed'));
                }
            }

            const fileName = `${report.reportId || `Report_${report._id}`}_${new Date().toISOString().split('T')[0]}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(pdfResponse.data));
            console.log(`✅ [Download PDF] Sent: ${fileName}`);

        } catch (error) {
            console.error('❌ [Download PDF] Error:', error.message);
            if (error.code === 'ECONNREFUSED') return res.status(503).json({ success: false, message: 'PDF Service unavailable' });
            res.status(500).json({ success: false, message: 'Failed to download PDF', error: error.message });
        }
    }

    // ============================================================
    // ✅ Download single report as DOCX
    // ============================================================
    static async downloadReportAsDOCX(req, res) {
        console.log('📥 [Download DOCX] Starting...');
        try {
            const { reportId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                return res.status(400).json({ success: false, message: 'Invalid reportId' });
            }

            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientNameRaw patientID age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician referringPhysicianName physicians patientInfo patientId examDescription institutionName sourceLab _id bharatPacsId workflowStatus',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

            if (!canDownloadReport(report)) {
                return res.status(403).json({
                    success: false,
                    message: `Report is not downloadable yet. reportStatus='${report.reportStatus}', studyWorkflowStatus='${report.dicomStudy?.workflowStatus || 'unknown'}'.`
                });
            }

            const payload = await buildDocxPayload(report, 'docx');
            const docxResponse = await axios.post(DOCX_SERVICE_URL, payload, {
                responseType: 'arraybuffer', timeout: 60000, httpsAgent
            });

            // ✅ NEW: Update DicomStudy printHistory + lastDownload
            if (report.dicomStudy?._id) {
                await DicomStudy.findByIdAndUpdate(report.dicomStudy._id, {
                    $push: {
                        printHistory: {
                            printedAt: new Date(),
                            printedBy: req.user?._id,
                            printedByName: req.user?.fullName || 'Unknown',
                            printType: 'docx_download',
                            printMethod: 'docx_download',
                            reportStatus: report.reportStatus,
                            bharatPacsId: report.dicomStudy?.bharatPacsId || '',
                            ipAddress: req.ip
                        }
                    },
                    $set: {
                        lastDownload: {
                            downloadedAt: new Date(),
                            downloadedBy: req.user?._id,
                            downloadedByName: req.user?.fullName || 'Unknown',
                            downloadType: 'docx',
                            reportId: report._id,
                        }
                    }
                });
            const downloaderRoles = req.user?.accountRoles?.length > 0 ? req.user.accountRoles : [req.user?.role];

                if (downloaderRoles.includes('lab_staff')) {
                    updateWorkflowStatus({
                        studyId: report.dicomStudy._id,
                        status: 'final_report_downloaded',
                        note: `Report downloaded as PDF by ${req.user?.fullName || 'User'}`,
                        user: req.user
                    }).catch(e => console.warn('Workflow update failed'));
                }
            }

            const fileName = `${report.reportId || `Report_${report._id}`}_${new Date().toISOString().split('T')[0]}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(docxResponse.data));
            console.log(`✅ [Download DOCX] Sent: ${fileName}`);

        } catch (error) {
            console.error('❌ [Download DOCX] Error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to download DOCX', error: error.message });
        }
    }

    // ============================================================
    // ✅ Print — VERIFIED ONLY
    // ============================================================
    static async printReportAsPDF(req, res) {
        console.log('🖨️ [Print] Starting...');
        try {
            const { reportId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                return res.status(400).json({ success: false, message: 'Invalid reportId' });
            }

            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientNameRaw patientID age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician referringPhysicianName physicians patientInfo patientId examDescription institutionName sourceLab _id workflowStatus bharatPacsId',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

            if (!canDownloadReport(report)) {
                return res.status(403).json({
                    success: false,
                    message: `Report is not downloadable yet. reportStatus='${report.reportStatus}', studyWorkflowStatus='${report.dicomStudy?.workflowStatus || 'unknown'}'.`
                });
            }

            const payload = await buildDocxPayload(report, 'pdf');
            const pdfResponse = await axios.post(DOCX_SERVICE_URL, payload, {
                responseType: 'arraybuffer', timeout: 60000, httpsAgent
            });
            const pdfBuffer = Buffer.from(pdfResponse.data);

            // Update report print info
            if (!report.printInfo) report.printInfo = { printHistory: [], totalPrints: 0 };
            const printType = report.printInfo.totalPrints === 0 ? 'print' : 'reprint';
            report.printInfo.totalPrints += 1;
            report.printInfo.lastPrintedAt = new Date();
            if (!report.printInfo.firstPrintedAt) report.printInfo.firstPrintedAt = new Date();
            report.printInfo.printHistory.push({
                printedBy: req.user?._id, printedAt: new Date(),
                printType, userRole: req.user?.role || 'unknown', ipAddress: req.ip
            });
            await report.save();

            // ✅ NEW: Update DicomStudy printHistory + lastDownload
            if (report.dicomStudy?._id) {
                await DicomStudy.findByIdAndUpdate(report.dicomStudy._id, {
                    $push: {
                        printHistory: {
                            printedAt: new Date(),
                            printedBy: req.user?._id,
                            printedByName: req.user?.fullName || 'Unknown',
                            printType: printType === 'print' ? 'original' : 'reprint',
                            printMethod: 'physical_print',
                            reportStatus: report.reportStatus,
                            bharatPacsId: report.dicomStudy?.bharatPacsId || '',
                            ipAddress: req.ip
                        }
                    },
                    $set: {
                        lastDownload: {
                            downloadedAt: new Date(),
                            downloadedBy: req.user?._id,
                            downloadedByName: req.user?.fullName || 'Unknown',
                            downloadType: 'print',
                            reportId: report._id,
                        }
                    }
                });
            }

            const fileName = `${report.reportId || `Report_${report._id}`}_Print.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
            console.log(`✅ [Print] Sent: ${fileName}`);

        } catch (error) {
            console.error('❌ [Print] Error:', error.message);
            if (error.code === 'ECONNREFUSED') return res.status(503).json({ success: false, message: 'PDF Service unavailable' });
            res.status(500).json({ success: false, message: 'Failed to generate print PDF', error: error.message });
        }
    }

    // ============================================================
    // ✅ UNCHANGED: Track print click
    // ============================================================
    static async trackPrintClick(req, res) {
        // ...existing code...
    }
}

export default ReportDownloadController;