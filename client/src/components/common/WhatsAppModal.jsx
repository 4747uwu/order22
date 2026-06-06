import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Send, Phone, Clock } from 'lucide-react';
import { notifyReportReady } from '../../api/waba';

const STORAGE_KEY = 'waba_saved_numbers';

const WhatsAppIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const formatStudyDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d)) return String(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return String(date); }
};

const WhatsAppModal = ({ study, onClose }) => {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [savedNumbers, setSavedNumbers] = useState([]);
  const [wantSave, setWantSave] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  useEffect(() => {
    try {
      setSavedNumbers(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch { setSavedNumbers([]); }
  }, []);

  const patientName   = study.patientName || 'Patient';
  const hospitalName  = study.organizationName || study.centerName || study.location || 'BharatPACS';
  const studyDate     = formatStudyDate(study.studyDate);
  const studyUID      = study.studyInstanceUID || study.StudyInstanceUID || study.studyInstanceUid || '';
  const viewerUrl     = studyUID
    ? `https://viewer.bharatpacs.com/viewer?StudyInstanceUIDs=${encodeURIComponent(studyUID)}`
    : `https://pacs.bharatpacs.com/qr/${study._id}`;
  const reportUrl     = `https://pacs.bharatpacs.com/qr/${study._id}`;

  const normalizePhone = (raw) => {
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const handleSend = async () => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 10) {
      toast.error('Enter a valid phone number');
      return;
    }

    setSending(true);
    const tid = toast.loading('Sending WhatsApp…');
    try {
      const res = await notifyReportReady({
        phone: cleaned,
        patientName,
        hospitalName,
        studyDate,
        imageUrl: viewerUrl,
        reportUrl,
        patientRef: study._id,
      });

      if (res?.success) {
        toast.success('WhatsApp message sent!', { id: tid, duration: 3000 });

        if (wantSave && cleaned) {
          const label = saveLabel.trim() || cleaned;
          const prev  = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          const updated = [
            { label, phone: cleaned },
            ...prev.filter(n => n.phone !== cleaned),
          ].slice(0, 12);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
        onClose();
      } else {
        toast.error(res?.message || 'Failed to send message', { id: tid });
      }
    } catch {
      toast.error('Network error. Try again.', { id: tid });
    } finally {
      setSending(false);
    }
  };

  const removeSaved = (e, ph) => {
    e.stopPropagation();
    const updated = savedNumbers.filter(n => n.phone !== ph);
    setSavedNumbers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] text-white">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-none">Send WhatsApp Notification</p>
            <p className="text-xs text-white/70 mt-0.5 truncate">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Study info ── */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
          <div><span className="font-medium text-gray-800">Patient</span><br />{patientName}</div>
          <div><span className="font-medium text-gray-800">Date</span><br />{studyDate || '—'}</div>
          <div className="col-span-2"><span className="font-medium text-gray-800">Hospital</span>&nbsp;{hospitalName}</div>
        </div>

        <div className="px-4 pt-3 pb-1 flex-1 overflow-y-auto space-y-3">
          {/* ── Saved numbers ── */}
          {savedNumbers.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5">
                <Clock className="w-3 h-3" /> Recent
              </p>
              <div className="flex flex-wrap gap-1.5">
                {savedNumbers.map(n => (
                  <button
                    key={n.phone}
                    onClick={() => setPhone(n.phone.replace(/^91/, ''))}
                    className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-800 hover:bg-green-100 transition-colors"
                  >
                    <Phone className="w-2.5 h-2.5" />
                    {n.label}
                    <span
                      onClick={e => removeSaved(e, n.phone)}
                      className="ml-0.5 text-gray-400 hover:text-red-500 font-bold leading-none"
                    >×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Phone input ── */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Phone number to notify
            </label>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
              <span className="flex items-center px-3 bg-gray-100 text-sm text-gray-600 border-r border-gray-300 shrink-0">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="waba-save"
                checked={wantSave}
                onChange={e => setWantSave(e.target.checked)}
                className="w-3.5 h-3.5 accent-green-500"
              />
              <label htmlFor="waba-save" className="text-xs text-gray-600 cursor-pointer select-none">
                Save this number for quick access
              </label>
            </div>
            {wantSave && (
              <input
                type="text"
                value={saveLabel}
                onChange={e => setSaveLabel(e.target.value)}
                placeholder="Label (e.g. Patient's son, Relative)"
                className="mt-1.5 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
          </div>

          {/* ── Message preview ── */}
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-1.5">Message preview</p>
            <div className="bg-[#e7ffd9] rounded-xl rounded-tl-none px-3 py-2.5 text-xs text-gray-800 leading-relaxed shadow-sm border border-green-100">
              <p className="font-semibold text-gray-900 mb-1">Your report are ready</p>
              <p>
                Dear <strong>{patientName}</strong>, thank you for visiting{' '}
                <strong>{hospitalName}</strong> on <strong>{studyDate || '—'}</strong>.
              </p>
              <p className="mt-1">Your diagnostic scan images and report are now available on BharatPACS.</p>
              <p className="mt-1">🖥️ View Images: <span className="text-blue-600">Open here</span> securely.</p>
              <p>📄 View Report: <span className="text-blue-600">Access here</span> securely.</p>
              <p className="mt-1 text-gray-500">For assistance, contact us at +918769919414 anytime.</p>
              <p className="mt-1.5 text-[10px] text-gray-400 border-t border-green-200 pt-1">– Powered by BharatPACS</p>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || phone.replace(/\D/g, '').length < 10}
            className="flex-1 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
