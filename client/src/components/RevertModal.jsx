import React, { useState, useEffect } from 'react';
import { X, AlertCircle, RotateCcw, Users, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RevertModal = ({ isOpen, onClose, study, onSuccess }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [corrections, setCorrections] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [assignedRadiologists, setAssignedRadiologists] = useState([]);

    // Extract radiologists from study data
    useEffect(() => {
        if (study) {
            console.log('🔍 Study data in RevertModal:', study);
            const radiologists = [];
            
            // Check _assignmentInfo.assignedDoctors (this is the correct structure)
            if (study._assignmentInfo?.assignedDoctors && Array.isArray(study._assignmentInfo.assignedDoctors)) {
                study._assignmentInfo.assignedDoctors.forEach(doctor => {
                    radiologists.push({
                        id: doctor.id,
                        name: doctor.name,
                        email: doctor.email,
                        role: doctor.role,
                        assignedAt: doctor.assignedAt,
                        status: doctor.status,
                        isCurrent: true
                    });
                });
            }
            // Fallback: Check if single radiologist is assigned (old structure)
            else if (study.radiologist) {
                radiologists.push({
                    id: study.assignedToIds?.[0] || 'unknown',
                    name: study.radiologist,
                    email: study.radiologistEmail,
                    role: study.radiologistRole || 'radiologist',
                    isCurrent: true
                });
            }
            
            console.log('👨‍⚕️ Extracted radiologists:', radiologists);
            setAssignedRadiologists(radiologists);
        }
    }, [study]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejecting the report');
            return;
        }

        try {
            setSubmitting(true);

            // ✅ FIXED: Use verifier's reject endpoint (same as handleRejectReport)
            const response = await api.post(
                `/verifier/studies/${study._id}/verify`,
                {
                    approved: false,
                    rejectionReason: rejectionReason.trim(),
                    verificationNotes: verificationNotes.trim(),
                    corrections: corrections,
                    verificationTimeMinutes: 0
                }
            );

            if (response.data.success) {
                toast.success('Report rejected and sent back to radiologist(s) successfully');
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('Error rejecting report:', error);
            toast.error(error.response?.data?.message || 'Failed to reject report');
        } finally {
            setSubmitting(false);
        }
    };

    // Add correction to the list
    const addCorrection = (section, comment, severity = 'major') => {
        setCorrections(prev => [...prev, { section, comment, severity }]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-orange-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <RotateCcw className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-800">
                                Reject Report
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {study?.patientName} • {study?.bharatPacsId || study?.patientId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        disabled={submitting}
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-5">
                        {/* Assigned Radiologists Info */}
                        {assignedRadiologists.length > 0 && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg">
                                <div className="flex items-start gap-2 mb-3">
                                    <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-blue-900">
                                            {assignedRadiologists.length === 1 
                                                ? 'Assigned Radiologist' 
                                                : `${assignedRadiologists.length} Assigned Radiologists`}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-0.5">
                                            Report will be sent back to {assignedRadiologists.length === 1 ? 'this radiologist' : 'all radiologists'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-3">
                                    {assignedRadiologists.map((radiologist, index) => (
                                        <div 
                                            key={radiologist.id || index}
                                            className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-blue-200 shadow-sm"
                                        >
                                            <div className="p-2 bg-blue-100 rounded-full">
                                                <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-blue-900 truncate">
                                                    {radiologist.name}
                                                </p>
                                                <p className="text-xs text-blue-600 truncate">
                                                    {radiologist.email}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                                        {radiologist.role || 'Radiologist'}
                                                    </span>
                                                    {radiologist.status && (
                                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                                            {radiologist.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Warning Message */}
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-800">
                                <p className="font-medium mb-1">
                                    ⚠️ Report Status: <strong>REJECTED</strong>
                                </p>
                                <p>
                                    Study will be marked as <strong>report_rejected</strong> and sent back to the radiologist(s) for corrections.
                                </p>
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                                maxLength={1000}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
                                placeholder="Explain what needs to be corrected or improved..."
                                required
                                disabled={submitting}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {rejectionReason.length} / 1000 characters
                            </p>
                        </div>

                        {/* Verification Notes */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Verification Notes (Optional)
                            </label>
                            <textarea
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                rows={3}
                                maxLength={2000}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
                                placeholder="Any additional feedback or instructions..."
                                disabled={submitting}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {verificationNotes.length} / 2000 characters
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={submitting || !rejectionReason.trim()}
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Rejecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Reject Report</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RevertModal;