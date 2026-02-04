// client/src/components/StudyCopy/StudyCopyModal.jsx

import React, { useState, useEffect } from 'react';
import { Copy, AlertTriangle, X, Search, ArrowRight, FileText, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

export const StudyCopyModal = ({ 
    isOpen, 
    onClose, 
    currentOrgName,
    onSuccess 
}) => {
    const [copyAttachments, setCopyAttachments] = useState(true);
    const [copyReports, setCopyReports] = useState(true);
    const [copyNotes, setCopyNotes] = useState(true);
    const [reason, setReason] = useState('');
    const [copying, setCopying] = useState(false);
    const [bharatPacsId, setBharatPacsId] = useState('');
    const [studyInfo, setStudyInfo] = useState(null);
    const [verifyingStudy, setVerifyingStudy] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setBharatPacsId('');
            setStudyInfo(null);
            setReason('');
            setCopyAttachments(true);
            setCopyReports(true);
            setCopyNotes(true);
        }
    }, [isOpen]);

    const verifyStudy = async (bpId) => {
        if (!bpId || !bpId.trim()) {
            toast.error('Please enter a BharatPacs ID');
            return;
        }
        
        try {
            setVerifyingStudy(true);
            const response = await api.get(`/study-copy/verify/${bpId.trim()}`);
            if (response.data.success) {
                setStudyInfo(response.data.data);
                toast.success('Study found and verified!');
            }
        } catch (error) {
            console.error('Error verifying study:', error);
            toast.error(error.response?.data?.message || 'Study not found');
            setStudyInfo(null);
        } finally {
            setVerifyingStudy(false);
        }
    };

    const handleBharatPacsIdChange = (e) => {
        setBharatPacsId(e.target.value);
        setStudyInfo(null);
    };

    const handleVerifyStudy = () => {
        verifyStudy(bharatPacsId);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && bharatPacsId.trim()) {
            handleVerifyStudy();
        }
    };

    const handleCopy = async () => {
        if (!bharatPacsId.trim()) {
            toast.error('Please enter a BharatPacs ID');
            return;
        }

        if (!studyInfo) {
            toast.error('Please verify the study first');
            return;
        }

        if (!reason.trim()) {
            toast.error('Please provide a reason for copying');
            return;
        }

        try {
            setCopying(true);
            const response = await api.post(`/study-copy/copy/${bharatPacsId.trim()}`, {
                copyAttachments,
                copyReports,
                copyNotes,
                reason: reason.trim()
            });

            const { copiedItems } = response.data.data;
            
            toast.success(
                `✅ Study copied successfully!\n\nNew BP ID: ${response.data.data.copiedStudy.bharatPacsId}\n\nCopied: ${copiedItems.notes} notes, ${copiedItems.reports + copiedItems.uploadedReports + copiedItems.doctorReports} reports, ${copiedItems.attachments} attachments`,
                { duration: 6000 }
            );
            
            if (onSuccess) {
                onSuccess();
            }
            
            onClose();
        } catch (error) {
            console.error('Error copying study:', error);
            toast.error(error.response?.data?.message || 'Failed to copy study');
        } finally {
            setCopying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Copy className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold">Copy Study to This Organization</h2>
                            <p className="text-sm text-teal-100">
                                Current Organization: {currentOrgName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-teal-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    
                    {/* Instructions */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium mb-2">📋 How to use:</p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Copy the BP ID from the source organization's study</li>
                            <li>Switch to the target organization using the navbar</li>
                            <li>Paste the BP ID below and verify</li>
                            <li>Click "Copy Study" to copy it to current organization</li>
                        </ol>
                    </div>

                    {/* BharatPacs ID Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            BharatPacs ID <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={bharatPacsId}
                                onChange={handleBharatPacsIdChange}
                                onKeyPress={handleKeyPress}
                                placeholder="Paste BP ID here (e.g., BP-UJJ-LAB-MIEUYV1V-S3IS)"
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                                disabled={verifyingStudy}
                                autoFocus
                            />
                            <button
                                onClick={handleVerifyStudy}
                                disabled={!bharatPacsId.trim() || verifyingStudy}
                                className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                {verifyingStudy ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        <span>Verify</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Study Information Card */}
                    {studyInfo && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Copy className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-green-800 mb-3">✓ Study Verified</p>
                                    
                                    {/* Copy Direction */}
                                    <div className="mb-3 p-3 bg-white rounded border border-green-200">
                                        <div className="flex items-center justify-between text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs mb-1">From</p>
                                                <p className="font-semibold text-gray-900">{studyInfo.organizationName}</p>
                                                <p className="text-xs text-gray-600 font-mono">{studyInfo.organizationIdentifier}</p>
                                            </div>
                                            <ArrowRight className="w-6 h-6 text-teal-600 mx-4" />
                                            <div>
                                                <p className="text-gray-500 text-xs mb-1">To</p>
                                                <p className="font-semibold text-teal-700">{currentOrgName}</p>
                                                <p className="text-xs text-teal-600">(Current Org)</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Study Details */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                        <div>
                                            <span className="text-gray-600">BP ID:</span>
                                            <span className="ml-2 font-mono font-medium text-gray-900">{studyInfo.bharatPacsId}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Patient:</span>
                                            <span className="ml-2 font-medium text-gray-900">{studyInfo.patientName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Modality:</span>
                                            <span className="ml-2 font-medium text-gray-900">{studyInfo.modality}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Study Date:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {new Date(studyInfo.studyDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Series/Images:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {studyInfo.seriesCount}/{studyInfo.instanceCount}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ✅ NEW: Notes and Reports Info */}
                                    <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            <MessageSquare className="w-4 h-4 text-blue-600" />
                                            <span className="text-gray-600">Study Notes:</span>
                                            <span className={`font-medium ${studyInfo.notesCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                                {studyInfo.notesCount || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <FileText className="w-4 h-4 text-purple-600" />
                                            <span className="text-gray-600">Reports:</span>
                                            <span className={`font-medium ${(studyInfo.reportsCount + studyInfo.uploadedReportsCount + studyInfo.doctorReportsCount) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                                                {(studyInfo.reportsCount || 0) + (studyInfo.uploadedReportsCount || 0) + (studyInfo.doctorReportsCount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">Important Information:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>A new BP ID will be generated for the copied study</li>
                                <li>The copied study will be independent from the original</li>
                                <li>Workflow status will be reset to "New Study Received"</li>
                                <li>Assignments will not be copied (reports will be set to draft)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Copy Options */}
                    <div className="mb-6 space-y-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Copy Options:</p>
                        
                        {/* Copy Notes */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={copyNotes}
                                onChange={(e) => setCopyNotes(e.target.checked)}
                                className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
                                disabled={!studyInfo}
                            />
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                <span className={`text-sm font-medium ${studyInfo ? 'text-gray-700' : 'text-gray-400'}`}>
                                    Copy study notes/discussions
                                    {studyInfo?.notesCount > 0 && (
                                        <span className="ml-2 text-xs text-blue-600">({studyInfo.notesCount} notes)</span>
                                    )}
                                </span>
                            </div>
                        </label>

                        {/* Copy Reports */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={copyReports}
                                onChange={(e) => setCopyReports(e.target.checked)}
                                className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
                                disabled={!studyInfo}
                            />
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600" />
                                <span className={`text-sm font-medium ${studyInfo ? 'text-gray-700' : 'text-gray-400'}`}>
                                    Copy reports (will be set to draft status)
                                    {studyInfo && (studyInfo.reportsCount + studyInfo.uploadedReportsCount + studyInfo.doctorReportsCount) > 0 && (
                                        <span className="ml-2 text-xs text-purple-600">
                                            ({(studyInfo.reportsCount || 0) + (studyInfo.uploadedReportsCount || 0) + (studyInfo.doctorReportsCount || 0)} reports)
                                        </span>
                                    )}
                                </span>
                            </div>
                        </label>

                        {/* Copy Attachments */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={copyAttachments}
                                onChange={(e) => setCopyAttachments(e.target.checked)}
                                className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
                                disabled={!studyInfo}
                            />
                            <span className={`text-sm font-medium ${studyInfo ? 'text-gray-700' : 'text-gray-400'}`}>
                                Copy attachments to target organization
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 ml-7">
                            Files will be duplicated in Wasabi S3 for the target organization
                        </p>
                    </div>

                    {/* Reason */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Copy <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="e.g., Patient transferred to another facility, Second opinion, etc."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                            maxLength={500}
                            disabled={!studyInfo}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {reason.length}/500
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={copying}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={!studyInfo || !reason.trim() || copying}
                        className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {copying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Copying Study...
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copy to This Organization
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudyCopyModal;