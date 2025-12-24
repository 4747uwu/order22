import axios from 'axios';
import DicomStudy from '../models/dicomStudyModel.js';
import Report from '../models/reportModel.js';
import User from '../models/userModel.js';
import Doctor from '../models/doctorModel.js';

const DOCX_SERVICE_URL = 'http://165.232.189.64:8777/api/Document/generate';

class ReportDownloadController {
    
    /**
     * Download report as PDF using C# DOCX Service
     * Called when user clicks download button in ReportModal
     */
    static async downloadReportAsPDF(req, res) {
        console.log('📥 [Download] Starting PDF download via C# DOCX Service...');
        console.log('📄 [Download] Request params:', req.params);
        
        try {
            const { reportId } = req.params;
            
            if (!reportId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Report ID is required.' 
                });
            }
            
            // 🔍 Find the report by ID
            console.log(`🔍 [Download] Finding report with ID: ${reportId}`);
            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientId age gender')
                .populate('dicomStudy', 'accessionNumber modality studyDate referringPhysician')
                .populate('doctorId', 'fullName email');
            
            if (!report) {
                console.error(`❌ [Download] Report not found: ${reportId}`);
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            console.log(`✅ [Download] Report found: ${report.reportId}`);
            console.log(`📊 [Download] Report type: ${report.reportType}, Status: ${report.reportStatus}`);
            console.log(`🖼️ [Download] Captured images count: ${report.reportContent?.capturedImages?.length || 0}`);
            
            // 🔍 Get the HTML content from the report
            const htmlContent = report.reportContent?.htmlContent;
            if (!htmlContent) {
                console.error(`❌ [Download] No HTML content found in report: ${reportId}`);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Report content not available for download' 
                });
            }
            
            console.log(`📝 [Download] HTML content length: ${htmlContent.length} characters`);
            
            // ✅ NEW: Fetch doctor information from User and Doctor models
            let doctorData = null;
            if (report.doctorId) {
                try {
                    // Get user data
                    const doctorUser = await User.findById(report.doctorId);
                    
                    // Get doctor profile data
                    const doctorProfile = await Doctor.findOne({ userAccount: report.doctorId });
                    
                    if (doctorUser && doctorProfile) {
                        doctorData = {
                            fullName: doctorUser.fullName,
                            department: doctorProfile.department || 'Radiology',
                            licenseNumber: doctorProfile.licenseNumber || 'N/A',
                            signature: doctorProfile.signature || '',
                            disclaimer: 'Electronically signed. This is a digitally generated report.'
                        };
                        
                        console.log('👨‍⚕️ [Download] Doctor data retrieved:', {
                            name: doctorData.fullName,
                            department: doctorData.department,
                            hasSignature: !!doctorData.signature
                        });
                    }
                } catch (doctorError) {
                    console.warn('⚠️ [Download] Failed to fetch doctor data:', doctorError.message);
                }
            }
            
            // ✅ NEW: Choose template based on captured images
            const hasCapturedImages = report.reportContent?.capturedImages?.length > 0;
            const templateName = hasCapturedImages ? 'MyReportwithPicture.docx' : 'MyReport.docx';
            
            console.log(`📋 [Download] Using template: ${templateName}`);
            
            // 📋 Prepare base placeholders with report data
            const placeholders = {
                '--name--': report.patientInfo?.fullName || report.patient?.fullName || '[Patient Name]',
                '--patientid--': report.patientInfo?.patientId || report.patient?.patientId || '[Patient ID]',
                '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
                '--age--': report.patientInfo?.age || report.patient?.age || '[Age]',
                '--gender--': report.patientInfo?.gender || report.patient?.gender || '[Gender]',
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
            
            // ✅ NEW: Add doctor data if available
            if (doctorData) {
                placeholders['--drname--'] = doctorData.fullName;
                placeholders['--department--'] = doctorData.department;
                placeholders['--Licence--'] = doctorData.licenseNumber;
                placeholders['--disc--'] = doctorData.disclaimer;
                
                // Add doctor signature as image placeholder
                if (doctorData.signature) {
                    placeholders['Doctor Signature'] = doctorData.signature;
                }
            }
            
            // ✅ NEW: Add captured images as Picture 1, Picture 2, etc.
            if (hasCapturedImages) {
                const capturedImages = report.reportContent.capturedImages;
                capturedImages.forEach((img, index) => {
                    const pictureKey = `Picture ${index + 1}`;
                    placeholders[pictureKey] = img.imageData;
                    console.log(`🖼️ [Download] Added ${pictureKey} (size: ${img.imageData.length} chars)`);
                });
            }
            
            console.log('📤 [Download] Prepared placeholders for C# service:', {
                templateName,
                placeholdersCount: Object.keys(placeholders).length,
                contentLength: htmlContent.length,
                patientName: placeholders['--name--'],
                accessionNumber: placeholders['--accessionno--'],
                doctorName: placeholders['--drname--'] || 'N/A',
                capturedImagesCount: hasCapturedImages ? report.reportContent.capturedImages.length : 0
            });
            
            // 📞 Call C# DOCX Service to generate PDF
            console.log(`📞 [Download] Calling C# DOCX service: ${DOCX_SERVICE_URL}`);
            
            const docxServicePayload = {
                templateName: templateName,
                placeholders: placeholders,
                outputFormat: 'pdf'
            };
            
            const docxResponse = await axios.post(DOCX_SERVICE_URL, docxServicePayload, {
                responseType: 'arraybuffer',
                timeout: 60000, // Increased to 60 seconds for images
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf'
                }
            });
            
            console.log(`✅ [Download] C# service responded with status: ${docxResponse.status}`);
            console.log(`📦 [Download] PDF size: ${docxResponse.data.byteLength} bytes`);
            
            if (docxResponse.status !== 200 || !docxResponse.data) {
                throw new Error('Invalid response from DOCX service');
            }
            
            // 📥 Create PDF buffer
            const pdfBuffer = Buffer.from(docxResponse.data);
            console.log(`📄 [Download] PDF buffer created, size: ${pdfBuffer.length} bytes`);
            
            // 🔄 Update download tracking in report
            try {
                if (!report.downloadInfo) {
                    report.downloadInfo = { downloadHistory: [], totalDownloads: 0 };
                }
                
                report.downloadInfo.totalDownloads = (report.downloadInfo.totalDownloads || 0) + 1;
                report.downloadInfo.lastDownloaded = new Date();
                
                if (!report.downloadInfo.downloadHistory) {
                    report.downloadInfo.downloadHistory = [];
                }
                
                report.downloadInfo.downloadHistory.push({
                    downloadedBy: req.user?._id,
                    downloadedAt: new Date(),
                    downloadType: 'pdf',
                    userRole: req.user?.role || 'unknown',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
                
                await report.save();
                console.log('📊 [Download] Download tracking updated');
                
            } catch (trackingError) {
                console.warn('⚠️ [Download] Failed to update download tracking:', trackingError.message);
            }
            
            // 📤 Send PDF to frontend
            const fileName = `${report.reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            console.log(`🎉 [Download] Sending PDF to frontend: ${fileName}`);
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('❌ [Download] Error in PDF download:', error);
            
            if (error.code === 'ECONNREFUSED') {
                console.error('🔌 [Download] Connection refused to DOCX service');
                return res.status(503).json({
                    success: false,
                    message: 'PDF generation service is temporarily unavailable',
                    error: 'Service connection failed'
                });
            }
            
            if (error.code === 'ETIMEDOUT') {
                console.error('⏰ [Download] Timeout calling DOCX service');
                return res.status(504).json({
                    success: false,
                    message: 'PDF generation timed out',
                    error: 'Service timeout'
                });
            }
            
            if (error.response) {
                console.error('🚫 [Download] DOCX service error response:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
                
                return res.status(500).json({
                    success: false,
                    message: 'PDF generation failed',
                    error: `Service error: ${error.response.status} ${error.response.statusText}`
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to download report as PDF',
                error: error.message
            });
        }
    }
    
    /**
     * Alternative method for downloading as DOCX
     */
    static async downloadReportAsDOCX(req, res) {
        console.log('📥 [Download] Starting DOCX download via C# DOCX Service...');
        
        try {
            const { reportId } = req.params;
            
            const report = await Report.findById(reportId)
                .populate('patient', 'fullName patientId age gender')
                .populate('dicomStudy', 'accessionNumber modality studyDate referringPhysician')
                .populate('doctorId', 'fullName email');
            
            if (!report) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Report not found' 
                });
            }
            
            const htmlContent = report.reportContent?.htmlContent;
            if (!htmlContent) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Report content not available for download' 
                });
            }
            
            // ✅ Fetch doctor data
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
                } catch (doctorError) {
                    console.warn('⚠️ [Download] Failed to fetch doctor data:', doctorError.message);
                }
            }
            
            // ✅ Choose template based on captured images
            const hasCapturedImages = report.reportContent?.capturedImages?.length > 0;
            const templateName = hasCapturedImages ? 'MyReportwithPicture.docx' : 'MyReport.docx';
            
            const placeholders = {
                '--name--': report.patientInfo?.fullName || report.patient?.fullName || '[Patient Name]',
                '--patientId--': report.patientInfo?.patientId || report?.patientId || '[Patient ID]',
                '--accessionno--': report.accessionNumber || report.dicomStudy?.accessionNumber || '[Accession Number]',
                '--agegender--': `${report.patientInfo?.age || report.patient?.age || '[Age]'} / ${report.patientInfo?.gender || report.patient?.gender || '[Gender]'}`,
                '--referredby--': report.studyInfo?.referringPhysician?.name || report.dicomStudy?.referringPhysician || '[Referring Physician]',
                '--reporteddate--': report.studyInfo?.studyDate ? new Date(report.studyInfo.studyDate).toLocaleDateString() : new Date().toLocaleDateString(),
                '--Content--': htmlContent
            };
            
            // ✅ Add doctor data
            if (doctorData) {
                placeholders['--drname--'] = doctorData.fullName;
                placeholders['--department--'] = doctorData.department;
                placeholders['--Licence--'] = doctorData.licenseNumber;
                placeholders['--disc--'] = doctorData.disclaimer;
                
                if (doctorData.signature) {
                    // placeholders[`Picture 1`] = doctorData.signature;
                    placeholders['Doctor Signature'] = doctorData.signature;
                }
            }
            
            // ✅ Add captured images
            if (hasCapturedImages) {
                const capturedImages = report.reportContent.capturedImages;
                capturedImages.forEach((img, index) => {
                    placeholders[`Picture 1`] = img.imageData;
                });
            }
            
            const docxResponse = await axios.post(DOCX_SERVICE_URL, {
                templateName: templateName,
                placeholders: placeholders,
                outputFormat: 'docx'
            }, {
                responseType: 'arraybuffer',
                timeout: 60000
            });
            
            const docxBuffer = Buffer.from(docxResponse.data);
            const fileName = `${report.reportId}_${new Date().toISOString().split('T')[0]}.docx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', docxBuffer.length);
            
            res.send(docxBuffer);
            
        } catch (error) {
            console.error('❌ [Download] Error in DOCX download:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download report as DOCX',
                error: error.message
            });
        }
    }
}

export default ReportDownloadController;