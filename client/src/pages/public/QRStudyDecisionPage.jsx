import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Monitor, FileText, AlertCircle, Loader2, ChevronRight, Lock, Clock } from 'lucide-react';

const QRStudyDecisionPage = () => {
  const { studyId } = useParams();
  const [searchParams] = useSearchParams();
  const autoViewMode = searchParams.get('mode') === 'viewer';
  const autoViewTriggered = useRef(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [viewStatus, setViewStatus] = useState(''); // '' | 'checking' | 'restoring' | 'done' | 'error'

  useEffect(() => {
    const loadInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/qr/${studyId}/info`);
        const json = res.data;
        if (!json.success) throw new Error(json.message || 'Failed to load study info');
        setData(json.data);
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    if (studyId) loadInfo();
  }, [studyId]);

  // When ?mode=viewer: auto-check availability, restore if needed, then redirect in-tab.
  // Using window.location.href instead of window.open() avoids popup-blocking from async handlers.
  useEffect(() => {
    if (!data || !autoViewMode || autoViewTriggered.current) return;
    autoViewTriggered.current = true;

    const ohifUrl = data?.viewer?.ohifUrl;
    if (!ohifUrl) { setViewStatus('error'); return; }

    (async () => {
      try {
        setViewStatus('checking');
        const availRes = await api.get(`/qr/${studyId}/check-availability`);

        if (availRes.data.available) {
          setViewStatus('done');
          window.location.href = ohifUrl;
        } else {
          setViewStatus('restoring');
          await api.post(`/qr/${studyId}/restore`);
          setViewStatus('done');
          window.location.href = ohifUrl;
        }
      } catch {
        setViewStatus('error');
      }
    })();
  }, [data, autoViewMode, studyId]);

  const VIEW_LABELS = {
    '': 'View Study',
    checking: 'Checking availability…',
    restoring: 'Restoring study…',
    done: 'Opening viewer…',
    error: 'Failed — tap to retry',
  };

  const openStudy = async () => {
    if (!data?.viewer?.ohifUrl) return;
    if (viewStatus === 'checking' || viewStatus === 'restoring') return;

    const ohifUrl = data.viewer.ohifUrl;

    try {
      setViewStatus('checking');
      const availRes = await api.get(`/qr/${studyId}/check-availability`);
      const { available } = availRes.data;

      if (available) {
        setViewStatus('done');
        window.open(ohifUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => setViewStatus(''), 1500);
      } else {
        setViewStatus('restoring');
        await api.post(`/qr/${studyId}/restore`);
        setViewStatus('done');
        window.open(ohifUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => setViewStatus(''), 1500);
      }
    } catch {
      setViewStatus('error');
      setTimeout(() => setViewStatus(''), 4000);
    }
  };

  const openReport = () => {
    if (!data?.report?.downloadUrl) return;
    const reportUrl = `https://pacs.bharatpacs.com${data.report.downloadUrl}`;
    window.open(reportUrl, '_blank', 'noopener,noreferrer');
  };

  // ── Auto-view redirect loading screen ──
  const autoViewBusy = autoViewMode && (loading || viewStatus === 'checking' || viewStatus === 'restoring' || viewStatus === 'done');
  if (autoViewBusy) return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-5">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-5 h-5 text-black animate-spin" />
        <p className="text-[12px] text-neutral-400 font-medium tracking-wide">
          {loading ? 'Loading…' : (VIEW_LABELS[viewStatus] || 'Opening viewer…')}
        </p>
      </div>
    </div>
  );

  // ── Loading ──
  if (loading) return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-5">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-5 h-5 text-black animate-spin" />
        <p className="text-[12px] text-neutral-400 font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[340px] text-center">
        <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-[15px] font-semibold text-black mb-1">Unable to load</h2>
        <p className="text-[12px] text-neutral-400 leading-relaxed mb-5">{error}</p>
        <button onClick={() => window.location.reload()}
          className="w-full h-10 text-[12px] font-semibold text-black border border-neutral-200 rounded-lg hover:bg-neutral-50 active:scale-[0.98] transition-all">
          Try again
        </button>
      </div>
    </div>
  );

  // ── Main ──
  const initials = (data?.patientName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasReport = !!data?.report?.downloadUrl;
  const hasViewer = !!data?.viewer?.ohifUrl;
  const viewBusy = viewStatus === 'checking' || viewStatus === 'restoring';
  const viewLabel = VIEW_LABELS[viewStatus] || 'View Study';

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[340px]">

        {/* Patient */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center shrink-0">
            <span className="text-[13px] font-bold text-white tracking-tight">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-black truncate leading-tight">{data?.patientName || 'Unknown'}</p>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">{String(data?.studyId || '—')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={openStudy}
            disabled={!hasViewer || viewBusy}
            className="group w-full flex items-center gap-3 px-4 h-14 bg-black text-white rounded-xl
              hover:bg-neutral-800 active:scale-[0.98] transition-all
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {viewBusy
              ? <Loader2 className="w-[18px] h-[18px] shrink-0 animate-spin" />
              : <Monitor className="w-[18px] h-[18px] shrink-0" />
            }
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold leading-tight">{viewLabel}</p>
              <p className="text-[10px] text-neutral-400">OHIF DICOM Viewer</p>
            </div>
            {!viewBusy && <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-0.5 transition-transform shrink-0" />}
          </button>

          <button
            onClick={openReport}
            disabled={!hasReport}
            className="group w-full flex items-center gap-3 px-4 h-14 bg-white text-black border border-neutral-200 rounded-xl
              hover:bg-neutral-50 hover:border-neutral-300 active:scale-[0.98] transition-all
              disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <FileText className="w-[18px] h-[18px] shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold leading-tight">View Report</p>
              <p className="text-[10px] text-neutral-400">{hasReport ? 'Download PDF' : 'Not available yet'}</p>
            </div>
            {hasReport
              ? <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
              : <Clock className="w-4 h-4 text-neutral-300 shrink-0" />
            }
          </button>

          {/* Report not ready notice */}
          {!hasReport && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Your report is being prepared by the radiologist and will be available here once finalized.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Lock className="w-3 h-3 text-neutral-300" />
          <p className="text-[10px] text-neutral-300 font-medium">Secure, time-limited access</p>
        </div>
      </div>
    </div>
  );
};

export default QRStudyDecisionPage;