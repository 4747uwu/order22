import React, { useState } from 'react';
import { X, AlertCircle, RotateCcw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RevertModal = ({ isOpen, onClose, study, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            toast.error('Please provide a reason for reverting');
            return;
        }

        try {
            setSubmitting(true);

            const response = await api.post(
                `/admin/studies/${study._id}/revert-to-radiologist`,
                {
                    reason: reason.trim(),
                    notes: notes.trim()
                }
            );

            if (response.data.success) {
                toast.success('Report reverted to radiologist successfully');
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('Error reverting report:', error);
            toast.error(error.response?.data?.message || 'Failed to revert report');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-orange-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <RotateCcw className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-800">
                                Revert to Radiologist
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {study?.patientName} • {study?.bharatPacsId}
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

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-5">
                    {/* Warning Message */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-800">
                            <p className="font-medium mb-1">This will send the report back to the radiologist</p>
                            <p>The radiologist will be notified and must address your concerns before resubmitting.</p>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Reason for Revert <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
                            placeholder="Explain what needs to be corrected or improved..."
                            required
                            disabled={submitting}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {reason.length} / 500 characters
                        </p>
                    </div>

                    {/* Additional Notes */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
                            placeholder="Any additional instructions or context..."
                            disabled={submitting}
                        />
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
                            disabled={submitting || !reason.trim()}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Reverting...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Revert to Radiologist</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RevertModal;