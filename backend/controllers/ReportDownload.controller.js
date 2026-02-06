import axios from 'axios';
import DicomStudy from '../models/dicomStudyModel.js';
import Report from '../models/reportModel.js';
import User from '../models/userModel.js';
import Doctor from '../models/doctorModel.js';
import Lab from '../models/labModel.js';
import https from 'https';
import mongoose from 'mongoose';
import { updateWorkflowStatus } from '../utils/workflowStatusManager.js';

// const DOCX_SERVICE_URL = 'http://165.232.189.64:8777/api/Document/generate';
const DOCX_SERVICE_URL = 'http://143.110.184.1:8080/api/Document/generate';
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class ReportDownloadController {
    
    /**
     * Download report as PDF using C# DOCX Service
     * Called when user clicks download button in ReportModal
     */
    static async downloadReportAsDOCX(req, res) {
        console.log('📥 [Download] Starting DOCX download via C# Service...');

        try {
            const { reportId } = req.params;

            // 1. Fetch Report Data
            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientId age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician sourceLab',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
            
            const htmlContent = report.reportContent?.htmlContent;
            if (!htmlContent) return res.status(400).json({ success: false, message: 'Report content not available' });

            // ============================================================
            // 2. TEMPLATE SELECTION LOGIC (Standardized)
            // ============================================================
            const capturedImages = report.reportContent?.capturedImages || [];
            const imageCount = capturedImages.length;
            
            // Default base template
            let templateName = 'MyReport.docx';

            // Switch template based on count (Matches C# Service logic)
            if (imageCount > 0 && imageCount <= 5) {
                templateName = `MyReport${imageCount}.docx`; 
            } else if (imageCount > 5) {
                templateName = `MyReport5.docx`; // Fallback to max template
            }
            console.log(`📄 [Download DOCX] Selected Template: ${templateName} (${imageCount} images)`);

            // ============================================================
            // 3. PREPARE DATA (Lab, Doctor, Placeholders)
            // ============================================================
            
            // Fetch Lab Branding
            let labBranding = null;
            if (report.dicomStudy?.sourceLab?.reportBranding) {
                labBranding = report.dicomStudy.sourceLab.reportBranding;
            }

            // Fetch Doctor Data
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

            // Prepare Placeholders
            const placeholders = {
                '--name--': report.patientInfo?.fullName || report.patient?.fullName || '[Patient Name]',
                '--patientid--': report.patientInfo?.patientId || report.patient?.patientId || '[Patient ID]',
                '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
                '--agegender--': `${report.patientInfo?.age || report.patient?.age || '[Age]'} / ${report.patientInfo?.gender || report.patient?.gender || '[Gender]'}`,
                '--referredby--': report.studyInfo?.referringPhysician?.name || report.dicomStudy?.referringPhysician || '[Referring Physician]',
                '--reporteddate--': report.studyInfo?.studyDate ? new Date(report.studyInfo.studyDate).toLocaleDateString() : new Date().toLocaleDateString(),
                '--Content--': htmlContent
            };

            if (doctorData) {
                placeholders['--drname--'] = doctorData.fullName;
                placeholders['--department--'] = doctorData.department;
                placeholders['--Licence--'] = doctorData.licenseNumber;
                placeholders['--disc--'] = doctorData.disclaimer;
            }

            // Prepare Images
            const images = {};

            // Branding (Header/Footer)
            if (labBranding) {
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

            // Doctor Signature
            if (doctorData?.signature) {
                images['Picture 6'] = {
                    data: doctorData.signature.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
            }

            // Captured Images (Picture 1 ... Picture 5)
            capturedImages.forEach((img, index) => {
                images[`Picture ${index + 1}`] = {
                    data: img.imageData.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
            });

            // ============================================================
            // 4. CALL C# SERVICE
            // ============================================================
            const studyId = report.dicomStudy?._id?.toString() || '';
            
            const docxResponse = await axios.post(DOCX_SERVICE_URL, {
                templateName: templateName,
                placeholders: placeholders,
                images: images,
                studyId: studyId,
                outputFormat: 'docx' // <--- Request DOCX
            }, {
                responseType: 'arraybuffer',
                timeout: 60000,
                httpsAgent: httpsAgent
            });

            // ============================================================
            // 5. SEND RESPONSE
            // ============================================================
            const fileName = `${report.reportId}_${new Date().toISOString().split('T')[0]}.docx`;

            // Update Workflow
            if (report.dicomStudy?._id) {
                updateWorkflowStatus({
                    studyId: report.dicomStudy._id,
                    status: 'final_report_downloaded',
                    note: `Report downloaded as DOCX by ${req.user?.fullName || 'User'}`,
                    user: req.user
                }).catch(e => console.warn('Workflow update failed'));
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(docxResponse.data));

        } catch (error) {
            console.error('❌ [Download DOCX] Error:', error.message);
            res.status(500).json({ success: false, message: 'Failed to download report', error: error.message });
        }
    }

    static async downloadReportAsPDF(req, res) {
        console.log('📥 [Download] Starting PDF download via C# Service...');

        try {
            const { reportId } = req.params;

            // 1. Fetch Report Data
            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientId age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician sourceLab',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');

            if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

            const htmlContent = report.reportContent?.htmlContent;
            if (!htmlContent) return res.status(400).json({ success: false, message: 'Report content not available' });

            // ============================================================
            // 2. TEMPLATE SELECTION LOGIC (Standardized)
            // ============================================================
            const capturedImages = report.reportContent?.capturedImages || [];
            const imageCount = capturedImages.length;

            // Default base template
            let templateName = 'MyReport.docx';

            // Switch template based on count (Same logic as DOCX)
            if (imageCount > 0 && imageCount <= 5) {
                templateName = `MyReport${imageCount}.docx`; 
            } else if (imageCount > 5) {
                templateName = `MyReport5.docx`;
            }
            console.log(`📄 [Download PDF] Selected Template: ${templateName} (${imageCount} images)`);

            // ============================================================
            // 3. PREPARE DATA
            // ============================================================
            
            // Lab Branding
            let labBranding = null;
            if (report.dicomStudy?.sourceLab?.reportBranding) {
                labBranding = report.dicomStudy.sourceLab.reportBranding;
            }

            // Doctor Data
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
                        
                        console.log('👨‍⚕️ [Print] Doctor data retrieved:', {
                            name: doctorData.fullName,
                            department: doctorData.department,
                            hasSignature: !!doctorData.signature
                        });
                    }
                } catch (e) { console.warn('⚠️ Failed to fetch doctor data'); }
            }

            // Placeholders
            const placeholders = {
                '--name--': report.patientInfo?.fullName || report.patient?.fullName || '[Patient Name]',
                '--patientid--': report.patientInfo?.patientId || report.patient?.patientId || '[Patient ID]',
                '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
                '--agegender--': `${report.patientInfo?.age || report.patient?.age || '[Age]'} / ${report.patientInfo?.gender || report.patient?.gender || '[Gender]'}`,
                '--referredby--': report.studyInfo?.referringPhysician?.name || 
                                 report.dicomStudy?.referringPhysician || 
                                 '[Referring Physician]',
                '--reporteddate--': report.studyInfo?.studyDate ? 
                                   new Date(report.studyInfo.studyDate).toLocaleDateString() : 
                                   new Date().toLocaleDateString(),
                '--studydate--': report.studyInfo?.studyDate ? 
                                new Date(report.studyInfo.studyDate).toLocaleDateString() : 
                                '[Study Date]',
                '--modality--': report.studyInfo?.modality || report.dicomStudy?.modality || '[Modality]',
                '--clinicalhistory--': report.patientInfo?.clinicalHistory || '[Clinical History]',
                '--Content--': htmlContent
            };

            if (doctorData) {
                placeholders['--drname--'] = doctorData.fullName;
                placeholders['--department--'] = doctorData.department;
                placeholders['--Licence--'] = doctorData.licenseNumber;
                placeholders['--disc--'] = doctorData.disclaimer;
            }

            // Images
            const images = {};

            if (labBranding) {
                if (labBranding.showHeader !== false && labBranding.headerImage?.url) {
                    images['HeaderPlaceholder'] = {
                        data: labBranding.headerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                        width: labBranding.headerImage.width, height: labBranding.headerImage.height
                    };
                }
                if (labBranding.showFooter !== false && labBranding.footerImage?.url) {
                    images['FooterPlaceholder'] = {
                        data: labBranding.footerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                        width: labBranding.footerImage.width, height: labBranding.footerImage.height
                    };
                }
            }

            if (doctorData?.signature) {
                images['Doctor Signature'] = { // Note: C# service might look for "Picture 6" or "Doctor Signature" based on your logic, ensuring key consistency is vital.
                    data: doctorData.signature.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
                // Fallback: Add as Picture 6 as well if your template uses that
                images['Picture 6'] = images['Doctor Signature'];
            }

            capturedImages.forEach((img, index) => {
                images[`Picture ${index + 1}`] = {
                    data: img.imageData.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
            });

            // ============================================================
            // 4. CALL C# SERVICE
            // ============================================================
            const studyId = report.dicomStudy?._id?.toString() || '';
            console.log(`📞 [Download] Calling C# DOCX service for PDF conversion`);
            
            const docxResponse = await axios.post(DOCX_SERVICE_URL, {
                templateName: templateName,
                placeholders: placeholders,
                images: images,
                studyId: studyId,
                outputFormat: 'pdf' // <--- Request PDF
            }, {
                responseType: 'arraybuffer',
                timeout: 60000,
                httpsAgent: httpsAgent
            });

            // ============================================================
            // 5. SEND RESPONSE
            // ============================================================
            const fileName = `${report.reportId}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Update Download History
            if (!report.downloadInfo) report.downloadInfo = { downloadHistory: [], totalDownloads: 0 };
            report.downloadInfo.totalDownloads += 1;
            report.downloadInfo.lastDownloaded = new Date();
            report.downloadInfo.downloadHistory.push({
                downloadedBy: req.user?._id,
                downloadedAt: new Date(),
                downloadType: 'final',  // Changed from 'pdf' to 'final'
                ipAddress: req.ip
            });
            await report.save();

            // Update Workflow
            if (report.dicomStudy?._id) {
                updateWorkflowStatus({
                    studyId: report.dicomStudy._id,
                    status: 'final_report_downloaded',
                    note: `Report downloaded as PDF by ${req.user?.fullName || 'User'}`,
                    user: req.user
                }).catch(e => console.warn('Workflow update failed'));
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(docxResponse.data));

        } catch (error) {
            console.error('❌ [Download PDF] Error:', error.message);
            // Handle Axios Errors (Service Down, etc)
            if (error.code === 'ECONNREFUSED') return res.status(503).json({ success: false, message: 'PDF Service unavailable' });
            res.status(500).json({ success: false, message: 'Failed to download PDF', error: error.message });
        }
    }

    /**
     * Print report as PDF - generates PDF in browser for printing
     */
    static async printReportAsPDF(req, res) {
        console.log('🖨️ [Print] Starting PDF generation via C# Service...');
        
        try {
            const { reportId } = req.params;
            
            if (!reportId) return res.status(400).json({ success: false, message: 'Report ID is required.' });

            // 1. Fetch Report Data
            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientId age gender')
                .populate({
                    path: 'dicomStudy',
                    select: 'accessionNumber modality studyDate referringPhysician sourceLab',
                    populate: { path: 'sourceLab', model: 'Lab' }
                })
                .populate('doctorId', 'fullName email');
            
            if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

            const htmlContent = report.reportContent?.htmlContent;
            if (!htmlContent) return res.status(400).json({ success: false, message: 'Report content not available' });

            // ============================================================
            // 2. TEMPLATE SELECTION LOGIC (Standardized)
            // ============================================================
            const capturedImages = report.reportContent?.capturedImages || [];
            const imageCount = capturedImages.length;

            // Default base template
            let templateName = 'MyReport.docx';

            // Switch template based on count (Matches C# Service logic)
            if (imageCount > 0 && imageCount <= 5) {
                templateName = `MyReport${imageCount}.docx`; 
            } else if (imageCount > 5) {
                templateName = `MyReport5.docx`; // Fallback to max template
            }
            console.log(`📄 [Print PDF] Selected Template: ${templateName} (${imageCount} images)`);

            // ============================================================
            // 3. PREPARE DATA
            // ============================================================
            
            // Lab Branding
            let labBranding = null;
            if (report.dicomStudy?.sourceLab?.reportBranding) {
                labBranding = report.dicomStudy.sourceLab.reportBranding;
            }

            // Doctor Data
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
                        
                        console.log('👨‍⚕️ [Print] Doctor data retrieved:', {
                            name: doctorData.fullName,
                            department: doctorData.department,
                            hasSignature: !!doctorData.signature
                        });
                    }
                } catch (e) { console.warn('⚠️ Failed to fetch doctor data'); }
            }

            // Placeholders
            const placeholders = {
                '--name--': report.patientInfo?.fullName || report.patient?.fullName || '[Patient Name]',
                '--patientid--': report.patientInfo?.patientId || report.patient?.patientId || '[Patient ID]',
                '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
                '--agegender--': `${report.patientInfo?.age || report.patient?.age || '[Age]'} / ${report.patientInfo?.gender || report.patient?.gender || '[Gender]'}`,
                '--referredby--': report.studyInfo?.referringPhysician?.name || 
                                 report.dicomStudy?.referringPhysician || 
                                 '[Referring Physician]',
                '--reporteddate--': report.studyInfo?.studyDate ? 
                                   new Date(report.studyInfo.studyDate).toLocaleDateString() : 
                                   new Date().toLocaleDateString(),
                '--Content--': htmlContent
            };

            if (doctorData) {
                placeholders['--drname--'] = doctorData.fullName;
                placeholders['--department--'] = doctorData.department;
                placeholders['--Licence--'] = doctorData.licenseNumber;
                placeholders['--disc--'] = doctorData.disclaimer;
            }

            // Images
            const images = {};

            if (labBranding) {
                if (labBranding.showHeader !== false && labBranding.headerImage?.url) {
                    images['HeaderPlaceholder'] = {
                        data: labBranding.headerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                        width: labBranding.headerImage.width, height: labBranding.headerImage.height
                    };
                }
                if (labBranding.showFooter !== false && labBranding.footerImage?.url) {
                    images['FooterPlaceholder'] = {
                        data: labBranding.footerImage.url.replace(/^data:image\/\w+;base64,/, ''),
                        width: labBranding.footerImage.width, height: labBranding.footerImage.height
                    };
                }
            }

            if (doctorData?.signature) {
                images['Doctor Signature'] = {
                    data: doctorData.signature.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
                // Redundancy for template safety
                images['Picture 6'] = images['Doctor Signature'];
            }

            capturedImages.forEach((img, index) => {
                images[`Picture ${index + 1}`] = {
                    data: img.imageData.replace(/^data:image\/\w+;base64,/, ''),
                    width: null, height: null
                };
            });

            // ============================================================
            // 4. CALL C# SERVICE
            // ============================================================
            const studyId = report.dicomStudy?._id?.toString() || '';
            console.log(`📞 [Print] Calling C# DOCX service: ${DOCX_SERVICE_URL}`);

            const docxResponse = await axios.post(DOCX_SERVICE_URL, {
                templateName: templateName,
                placeholders: placeholders,
                images: images,
                studyId: studyId,
                outputFormat: 'pdf' // <--- Request PDF
            }, {
                responseType: 'arraybuffer',
                timeout: 60000,
                httpsAgent: httpsAgent
            });

            const pdfBuffer = Buffer.from(docxResponse.data);
            console.log(`📦 [Print] PDF Generated. Size: ${pdfBuffer.length} bytes`);

            // ============================================================
            // 5. UPDATE TRACKING & SEND
            // ============================================================
            
            // Update Print History
            if (!report.printInfo) report.printInfo = { printHistory: [], totalPrints: 0 };
            
            const printType = report.printInfo.totalPrints === 0 ? 'print' : 'reprint';
            report.printInfo.totalPrints += 1;
            report.printInfo.lastPrintedAt = new Date();
            if (!report.printInfo.firstPrintedAt) report.printInfo.firstPrintedAt = new Date();
            
            report.printInfo.printHistory.push({
                printedBy: req.user?._id,
                printedAt: new Date(),
                printType: printType,
                userRole: req.user?.role || 'unknown',
                ipAddress: req.ip
            });
            await report.save();

            // Update Study History
            if (report.dicomStudy) {
                 const study = await DicomStudy.findById(report.dicomStudy);
                 if (study) {
                    study.statusHistory.push({
                        status: study.workflowStatus,
                        changedBy: req.user?._id,
                        changedAt: new Date(),
                        action: printType === 'print' ? 'report_printed' : 'report_reprinted',
                        notes: `Report ${printType}ed via C# Engine`
                    });
                    await study.save();
                 }
            }

            // Send Response (INLINE for Browser Preview/Printing)
            const fileName = `${report.reportId}_Print.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);

        } catch (error) {
            console.error('❌ [Print] Error:', error.message);
            if (error.code === 'ECONNREFUSED') return res.status(503).json({ success: false, message: 'PDF Service unavailable' });
            res.status(500).json({ success: false, message: 'Failed to generate print PDF', error: error.message });
        }
    }
    
    /**
     * Download as DOCX
     */
    static async trackPrintClick(req, res) {
        console.log('🖨️ [Track Print] Recording print button click...');
        
        try {
            const { reportId } = req.params;
            
            if (!reportId) {
                return res.status(400).json({ success: false, message: 'Report ID is required.' });
            }

            // 1. Fetch Report with populated dicomStudy
            const report = await Report.findById(reportId).populate('dicomStudy');
            
            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            // 2. Initialize printInfo if not exists
            if (!report.printInfo) {
                report.printInfo = { 
                    printHistory: [], 
                    totalPrints: 0,
                    firstPrintedAt: null,
                    lastPrintedAt: null
                };
            }

            // 3. Determine print type (print vs reprint)
            const printType = report.printInfo.totalPrints === 0 ? 'print' : 'reprint';
            const newPrintCount = report.printInfo.totalPrints + 1;
            const now = new Date();
            
            console.log(`📊 [Track Print] Report: ${report.reportId}, Current count: ${report.printInfo.totalPrints}, New count: ${newPrintCount}, Type: ${printType}`);

            // 4. Update Report print info
            report.printInfo.totalPrints = newPrintCount;
            report.printInfo.lastPrintedAt = now;
            if (!report.printInfo.firstPrintedAt) {
                report.printInfo.firstPrintedAt = now;
            }
            
            report.printInfo.printHistory.push({
                printedBy: req.user?._id,
                printedAt: now,
                printType: printType,
                userRole: req.user?.role || 'unknown',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            await report.save();
            console.log(`✅ [Track Print] Report print info updated. Total prints: ${newPrintCount}`);

            // 5. Update DicomStudy printHistory AND status history
            if (report.dicomStudy) {
                const DicomStudy = mongoose.model('DicomStudy');
                const study = await DicomStudy.findById(report.dicomStudy);
                
                if (study) {
                    // ✅ Initialize printHistory if not exists
                    if (!study.printHistory) {
                        study.printHistory = [];
                    }

                    // ✅ Add to DicomStudy printHistory (matching its schema structure)
                    study.printHistory.push({
                        printedAt: now,
                        printedBy: req.user?._id,
                        printedByName: req.user?.fullName || 'Unknown User',
                        printType: printType === 'print' ? 'original' : 'reprint',
                        printMethod: 'pdf_download',
                        reportVersion: newPrintCount,
                        reportStatus: report.reportStatus || 'finalized',
                        copies: 1,
                        reprintReason: printType === 'reprint' ? `Automatic reprint - Print count: ${newPrintCount}` : undefined,
                        bharatPacsId: study.bharatPacsId || '',
                        watermark: printType === 'print' ? 'ORIGINAL' : 'REPRINT',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });

                    console.log(`✅ [Track Print] Added to DicomStudy printHistory. Total entries: ${study.printHistory.length}`);

                    // ✅ Add to status history
                    study.statusHistory.push({
                        status: study.workflowStatus,
                        changedBy: req.user?._id,
                        changedAt: now,
                        action: printType === 'print' ? 'report_printed' : 'report_reprinted',
                        notes: `Report ${printType} initiated by ${req.user?.fullName || 'User'} (Print Count: ${newPrintCount})`
                    });

                    // ✅ If reprint (count > 1), update workflow status to 'reprint_requested'
                    if (newPrintCount > 1) {
                        console.log(`🔄 [Track Print] Reprint detected! Updating study status to 'reprint_requested'`);
                        
                        const previousStatus = study.workflowStatus;
                        study.workflowStatus = 'reprint_requested';
                        study.currentCategory = 'COMPLETED'; // Keep in completed category
                        
                        // Add status change entry
                        study.statusHistory.push({
                            status: 'reprint_requested',
                            changedBy: req.user?._id,
                            changedAt: now,
                            action: 'status_changed',
                            notes: `Study moved to reprint_requested from ${previousStatus} (Print count: ${newPrintCount})`
                        });
                    }

                    await study.save();
                    console.log(`✅ [Track Print] DicomStudy updated. Status: ${study.workflowStatus}, PrintHistory entries: ${study.printHistory.length}`);
                }
            }

            // 6. Send response
            res.json({
                success: true,
                message: `Print ${printType} tracked successfully`,
                data: {
                    reportId: report._id,
                    printCount: newPrintCount,
                    printType: printType,
                    isReprint: newPrintCount > 1,
                    studyStatus: report.dicomStudy ? 'updated' : 'no_study',
                    watermark: printType === 'print' ? 'ORIGINAL' : 'REPRINT'
                }
            });

        } catch (error) {
            console.error('❌ [Track Print] Error:', error.message);
            console.error('❌ [Track Print] Stack:', error.stack);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to track print', 
                error: error.message 
            });
        }
    }
}




export default ReportDownloadController;