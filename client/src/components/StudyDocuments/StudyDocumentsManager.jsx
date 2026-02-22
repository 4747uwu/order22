import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Download, Trash2, Eye, File, Image, FileSpreadsheet, X, Loader } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const StudyDocumentsManager = ({ studyId, isOpen, onClose, studyMeta = null }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewDocument, setPreviewDocument] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!studyId) return;
        setLoading(true);
        try {
            const response = await api.get(`/documents/study/${studyId}`);
            if (response.data.success) setDocuments(response.data.data);
        } catch (error) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [studyId]);

    useEffect(() => {
        if (isOpen && studyId) fetchDocuments();
    }, [isOpen, studyId, fetchDocuments]);

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        
        if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!allowedTypes.includes(file.type)) return toast.error('File type not supported.');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', getDocumentType(file.type));

        try {
            const response = await api.post(`/documents/study/${studyId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.success) {
                toast.success('Uploaded successfully');
                fetchDocuments();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload');
        } finally {
            setUploading(false);
        }
    };

    const getDocumentType = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'clinical';
        return 'other';
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files);
    };

    const handlePreview = async (document) => {
        try {
            const response = await api.get(`/documents/${document._id}/url?action=view`);
            if (response.data.success) setPreviewDocument({ ...document, url: response.data.data.url });
        } catch (error) { toast.error('Failed to preview document'); }
    };

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
        } catch (error) { toast.error('Failed to download document'); }
    };

    const handleDelete = async (documentId) => {
        if (!window.confirm('Delete this document?')) return;
        try {
            const response = await api.delete(`/documents/${documentId}`);
            if (response.data.success) {
                toast.success('Deleted successfully');
                fetchDocuments();
            }
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to delete'); }
    };

    const getFileIcon = (contentType) => {
        if (contentType.startsWith('image/')) return <Image className="w-3.5 h-3.5" />;
        if (contentType === 'application/pdf') return <FileText className="w-3.5 h-3.5" />;
        if (contentType.includes('sheet') || contentType.includes('excel')) return <FileSpreadsheet className="w-3.5 h-3.5" />;
        return <File className="w-3.5 h-3.5" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Main Modal */}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-2">
                <div className="bg-white rounded w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-900 shadow-2xl">
                    
                    {/* ✅ COMPACT HEADER: Matches PatientEditModal */}
                    <div className="px-3 py-2 bg-gray-900 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-xs sm:text-sm font-bold uppercase truncate">Study Documents</h2>
                            {(studyMeta?.patientName || studyMeta?.patientId) && (
                                <p className="text-[9px] text-gray-300 mt-0 uppercase leading-tight">
                                    PT: {studyMeta.patientName || 'Unknown'} | ID: {studyMeta.patientId || 'N/A'}
                                </p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                        {/* ✅ COMPACT UPLOAD ZONE */}
                        <div
                            className={`border border-dashed rounded p-4 text-center transition-all bg-white ${
                                dragActive ? 'border-gray-900 bg-gray-100' : 'border-gray-300 hover:border-gray-500'
                            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                            <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1.5" />
                            <p className="text-[10px] text-gray-600 mb-0.5 font-medium uppercase">Drag & drop files or click to browse</p>
                            <p className="text-[8px] text-gray-400 mb-2 uppercase">Images, PDF, Word, Excel (Max 10MB)</p>
                            
                            <label className="inline-flex items-center px-3 py-1 bg-gray-900 text-white text-[10px] font-bold rounded hover:bg-black cursor-pointer transition-colors uppercase">
                                <Upload className="w-3 h-3 mr-1.5" />
                                {uploading ? 'UPLOADING...' : 'CHOOSE FILE'}
                                <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
                            </label>
                        </div>

                        {/* ✅ COMPACT DOCUMENTS LIST */}
                        <div className="mt-3">
                            <h3 className="text-[10px] font-bold text-gray-800 mb-1.5 uppercase">
                                Uploaded Documents ({documents.length})
                            </h3>

                            {loading ? (
                                <div className="flex items-center justify-center py-4"><Loader className="w-5 h-5 animate-spin text-gray-900" /></div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 border border-gray-200 rounded bg-white">
                                    <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                    <p className="text-[10px] uppercase font-semibold">No documents uploaded</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {documents.map((doc) => (
                                        <div key={doc._id} className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded hover:border-gray-400 transition-colors">
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <div className="p-1 bg-gray-100 rounded text-gray-600">
                                                    {getFileIcon(doc.contentType)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate leading-tight uppercase" title={doc.fileName}>{doc.fileName}</p>
                                                    <p className="text-[8px] text-gray-500 font-medium uppercase truncate">
                                                        {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.uploadedBy?.fullName || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 ml-2">
                                                <button onClick={() => handlePreview(doc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDownload(doc)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Download"><Download className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(doc._id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t bg-white flex justify-end">
                        <button onClick={onClose} className="px-4 py-1.5 text-[10px] font-bold bg-gray-100 text-gray-700 rounded border border-gray-300 uppercase hover:bg-gray-200">CLOSE</button>
                    </div>
                </div>
            </div>

            {/* ✅ COMPACT PREVIEW MODAL */}
            {previewDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[10001] p-2">
                    <div className="bg-white rounded w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                        <div className="px-3 py-2 bg-gray-900 text-white flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-bold uppercase truncate">{previewDocument.fileName}</h3>
                                <p className="text-[9px] text-gray-300 uppercase leading-tight">{formatFileSize(previewDocument.fileSize)}</p>
                            </div>
                            <button onClick={() => setPreviewDocument(null)} className="p-1 hover:bg-gray-700 rounded ml-2">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-2">
                            {previewDocument.contentType.startsWith('image/') ? (
                                <img src={previewDocument.url} alt={previewDocument.fileName} className="max-w-full max-h-full object-contain" />
                            ) : previewDocument.contentType === 'application/pdf' ? (
                                <iframe src={previewDocument.url} className="w-full h-full min-h-[500px] border-0" title={previewDocument.fileName} />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-[10px] font-bold uppercase mb-2">Preview not available</p>
                                    <button onClick={() => handleDownload(previewDocument)} className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded hover:bg-black uppercase flex items-center mx-auto">
                                        <Download className="w-3 h-3 mr-1.5" /> Download File
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