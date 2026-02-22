import { useState, useEffect, useRef } from 'react';
import { X, Printer, Loader } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PrintModal = ({ report, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [error, setError] = useState(null);
    const fetchedRef = useRef(false); // ✅ Track if already fetched

    useEffect(() => {
        const fetchPDFForPrint = async () => {
            if (fetchedRef.current) return;

            try {
                setLoading(true);
                setError(null);
                fetchedRef.current = true;

                console.log('🖨️ [PrintModal] Fetching PDF for report:', report._id);

                const response = await api.get(`/reports/reports/${report._id}/print`, {
                    responseType: 'blob',
                    timeout: 60000,
                });

                // ✅ FIX: Check if response is actually an error JSON blob (403/500)
                // When responseType:'blob', error responses also come as blobs
                if (response.data.type === 'application/json') {
                    const text = await response.data.text();
                    const json = JSON.parse(text);
                    throw new Error(json.message || 'Server error');
                }

                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);

            } catch (err) {
                console.error('❌ [PrintModal] Error fetching PDF:', err);
                // ✅ FIX: Parse blob error response for meaningful message
                if (err.response?.data instanceof Blob) {
                    try {
                        const text = await err.response.data.text();
                        const json = JSON.parse(text);
                        setError(json.message || 'Failed to generate print PDF');
                    } catch {
                        setError('Failed to generate print PDF. Please try again.');
                    }
                } else {
                    setError(err.message || 'Failed to generate print PDF. Please try again.');
                }
                fetchedRef.current = false;
            } finally {
                setLoading(false);
            }
        };

        if (report?._id) {
            fetchPDFForPrint();
        }

        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [report._id]);

    const handlePrint = async () => {
        if (!pdfUrl) return;

        console.log('🖨️ [PrintModal] Opening print dialog');

        // ✅ Track print click before printing
        try {
            await api.post(`/reports/${report._id}/track-print`);
            console.log('✅ [PrintModal] Print tracked successfully');
        } catch (err) {
            console.error('⚠️ [PrintModal] Failed to track print:', err);
            // Don't block printing if tracking fails
        }

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

    const handleDirectPrint = async () => {
        if (!pdfUrl) return;

        // ✅ Track print click before printing
        try {
            await api.post(`/reports/${report._id}/track-print`);
            console.log('✅ [PrintModal] Print tracked successfully');
        } catch (err) {
            console.error('⚠️ [PrintModal] Failed to track print:', err);
            // Don't block printing if tracking fails
        }

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
        // ✅ COMPACT: Reduced outer padding
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-2 sm:p-4">
            {/* ✅ COMPACT: Slightly smaller max-width, rounded-md instead of rounded-lg */}
            <div className="bg-white rounded-md w-full max-w-4xl h-[85vh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* ✅ COMPACT HEADER: Tighter padding, smaller text and icons */}
                <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-1.5">
                            <Printer className="w-4 h-4 text-blue-600" />
                            Print Report
                        </h2>
                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate max-w-[250px] sm:max-w-full">
                            ID: {report?.reportId} | Pt: {report?.patientInfo?.fullName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading && (
                        <div className="flex-1 flex items-center justify-center">
                            {/* ✅ COMPACT LOADING: Smaller spinner and text */}
                            <div className="text-center">
                                <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-600 font-medium">Loading PDF...</p>
                                <p className="text-[10px] text-gray-500 mt-1">Preparing report for printing</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex-1 flex items-center justify-center">
                            {/* ✅ COMPACT ERROR: Smaller icon container and text */}
                            <div className="text-center max-w-xs sm:max-w-sm px-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <X className="w-5 h-5 text-red-600" />
                                </div>
                                <p className="text-xs text-red-600 font-medium mb-1">Error Loading PDF</p>
                                <p className="text-[10px] text-gray-600">{error}</p>
                            </div>
                        </div>
                    )}

                    {pdfUrl && !loading && !error && (
                        <>
                            {/* PDF Preview */}
                            <div className="flex-1 overflow-hidden bg-gray-100">
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full border-0"
                                    title="Report Preview"
                                />
                            </div>

                            {/* ✅ COMPACT FOOTER: Tighter padding, smaller gap, tiny text */}
                            <div className="px-3 py-2 border-t bg-gray-50 flex items-center justify-between">
                                <div className="text-[10px] text-gray-600 hidden sm:block">
                                    <p className="font-medium">Ready to print</p>
                                    <p className="text-[9px] mt-0.5">Print count tracks automatically</p>
                                </div>
                                
                                <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={handleDirectPrint}
                                        className="px-2.5 py-1.5 text-[10px] sm:text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Print (Direct)</span>
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="px-3 py-1.5 text-[10px] sm:text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow flex items-center gap-1.5 font-medium flex-1 sm:flex-none justify-center"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Print Dialog</span>
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