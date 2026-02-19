import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Download, Trash2, Eye, File, Image, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const StudyDocumentsManager = ({ studyId, isOpen, onClose, studyMeta = null }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewDocument, setPreviewDocument] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Fetch documents for study
    const fetchDocuments = useCallback(async () => {
        if (!studyId) return;
        
        setLoading(true);
        try {
            const response = await api.get(`/documents/study/${studyId}`);
            if (response.data.success) {
                setDocuments(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [studyId]);

    useEffect(() => {
        if (isOpen && studyId) {
            fetchDocuments();
        }
    }, [isOpen, studyId, fetchDocuments]);

    // Handle file upload
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('File type not supported. Only images, PDFs, and documents are allowed.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', getDocumentType(file.type));

        try {
            const response = await api.post(
                `/documents/study/${studyId}/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success) {
                toast.success('Document uploaded successfully');
                fetchDocuments();
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error(error.response?.data?.message || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    // Get document type from MIME type
    const getDocumentType = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'clinical';
        return 'other';
    };

    // Handle drag and drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    // Handle file input change
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files);
        }
    };

    // Preview document
    const handlePreview = async (document) => {
        try {
            const response = await api.get(`/documents/${document._id}/url?action=view`);
            if (response.data.success) {
                setPreviewDocument({
                    ...document,
                    url: response.data.data.url
                });
            }
        } catch (error) {
            console.error('Error getting preview URL:', error);
            toast.error('Failed to preview document');
        }
    };

    // Download document
    const handleDownload = async (document) => {
        try {
            const response = await api.get(`/documents/${document._id}/url?action=download`);
            if (response.data.success) {
                const link = window.document.createElement('a');
                link.href = response.data.data.url;
                link.download = document.fileName;
                link.click();
                toast.success('Download started');
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            toast.error('Failed to download document');
        }
    };

    // Delete document
    const handleDelete = async (documentId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            const response = await api.delete(`/documents/${documentId}`);
            if (response.data.success) {
                toast.success('Document deleted successfully');
                fetchDocuments();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error.response?.data?.message || 'Failed to delete document');
        }
    };

    // Get file icon
    const getFileIcon = (contentType) => {
        if (contentType.startsWith('image/')) return <Image className="w-5 h-5" />;
        if (contentType === 'application/pdf') return <FileText className="w-5 h-5" />;
        if (contentType.includes('sheet') || contentType.includes('excel')) return <FileSpreadsheet className="w-5 h-5" />;
        return <File className="w-5 h-5" />;
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Main Modal */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header - NOW WITH PATIENT INFO */}
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Study Documents</h2>
                            <p className="text-sm text-teal-100">Upload and manage study attachments</p>
                            
                            {/* ✅ PATIENT INFO SECTION */}
                            {(studyMeta?.patientName || studyMeta?.patientId) && (
                                <div className="mt-2 flex items-center gap-4 text-sm text-teal-50 border-t border-teal-400 pt-2">
                                    <span className="font-semibold">
                                        Patient: 
                                        <span className="ml-1 text-white font-bold uppercase">
                                            {studyMeta.patientName || 'Unknown'}
                                        </span>
                                    </span>
                                    <span className="text-teal-200">•</span>
                                    <span className="font-semibold">
                                        ID: 
                                        <span className="ml-1 text-white font-mono font-bold">
                                            {studyMeta.patientId || 'N/A'}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Upload Zone */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                                dragActive
                                    ? 'border-teal-600 bg-teal-50'
                                    : 'border-gray-300 hover:border-teal-400'
                            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-sm text-gray-600 mb-2">
                                Drag and drop files here, or click to browse
                            </p>
                            <p className="text-xs text-gray-500 mb-4">
                                Supported: Images, PDF, Word, Excel (Max 10MB)
                            </p>
                            <label className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer transition-colors">
                                <Upload className="w-4 h-4 mr-2" />
                                {uploading ? 'Uploading...' : 'Choose File'}
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                                />
                            </label>
                        </div>

                        {/* Documents List */}
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                Uploaded Documents ({documents.length})
                            </h3>

                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No documents uploaded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map((doc) => (
                                        <div
                                            key={doc._id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                <div className="text-teal-600">
                                                    {getFileIcon(doc.contentType)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {doc.fileName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatFileSize(doc.fileSize)} • {' '}
                                                        {new Date(doc.uploadedAt).toLocaleDateString()} • {' '}
                                                        {doc.uploadedBy?.fullName || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handlePreview(doc)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewDocument && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10001]">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {previewDocument.fileName}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {formatFileSize(previewDocument.fileSize)}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewDocument(null)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 p-4">
                            {previewDocument.contentType.startsWith('image/') ? (
                                <img
                                    src={previewDocument.url}
                                    alt={previewDocument.fileName}
                                    className="max-w-full h-auto mx-auto"
                                />
                            ) : previewDocument.contentType === 'application/pdf' ? (
                                <iframe
                                    src={previewDocument.url}
                                    className="w-full h-full min-h-[600px]"
                                    title={previewDocument.fileName}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <FileText className="w-16 h-16 mb-4" />
                                    <p className="text-lg mb-2">Preview not available</p>
                                    <button
                                        onClick={() => handleDownload(previewDocument)}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download to view
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudyDocumentsManager;