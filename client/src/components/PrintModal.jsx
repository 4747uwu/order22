
import { useState, useEffect } from 'react';
import { X, Printer, Loader } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PrintModal = ({ report, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPDFForPrint = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🖨️ [PrintModal] Fetching PDF for report:', report._id);

                const response = await api.get(`/reports/${report._id}/print`, {
                    responseType: 'blob'
                });

                // Create blob URL for PDF
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                console.log('✅ [PrintModal] PDF blob created, size:', blob.size);
                setPdfUrl(url);

            } catch (err) {
                console.error('❌ [PrintModal] Error fetching PDF:', err);
                setError(err.response?.data?.message || 'Failed to load PDF for printing');
                toast.error('Failed to load PDF for printing');
            } finally {
                setLoading(false);
            }
        };

        if (report?._id) {
            fetchPDFForPrint();
        }

        // Cleanup blob URL on unmount
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [report]);

    const handlePrint = () => {
        if (!pdfUrl) return;

        console.log('🖨️ [PrintModal] Opening print dialog');

        // Open PDF in new window and trigger print dialog
        const printWindow = window.open(pdfUrl, '_blank');
        
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            toast.error('Please allow pop-ups to print the report');
        }
    };

    const handleDirectPrint = () => {
        if (!pdfUrl) return;

        // Alternative: Create hidden iframe and print
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            iframe.contentWindow.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Printer className="w-5 h-5 text-blue-600" />
                            Print Report
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Report ID: {report?.reportId} | Patient: {report?.patientInfo?.fullName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                <p className="text-gray-600 font-medium">Loading PDF...</p>
                                <p className="text-sm text-gray-500 mt-2">Preparing report for printing</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-8 h-8 text-red-600" />
                                </div>
                                <p className="text-red-600 font-medium mb-2">Error Loading PDF</p>
                                <p className="text-gray-600 text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {pdfUrl && !loading && !error && (
                        <>
                            {/* PDF Preview */}
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full border-0"
                                    title="Report Preview"
                                />
                            </div>

                            {/* Print Actions */}
                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    <p className="font-medium">Ready to print</p>
                                    <p className="text-xs mt-1">
                                        Print count will be tracked automatically
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleDirectPrint}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Print (Direct)
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Print Report
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrintModal;