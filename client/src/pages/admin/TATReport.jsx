import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, X } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import api from '../../services/api';

const COLUMNS = [
  { key: 'center', label: 'CENTER', w: 130 },
  { key: 'patientId', label: 'PT ID', w: 100 },
  { key: 'patientName', label: 'PATIENT NAME', w: 150 },
  { key: 'modality', label: 'MOD', w: 50 },
  { key: 'imageCount', label: 'IMG', w: 45, numeric: true },
  { key: 'noOfReports', label: 'RPT', w: 40, numeric: true },
  { key: 'patientAge', label: 'AGE', w: 45 },
  { key: 'studyName', label: 'STUDY NAME', w: 180 },
  { key: 'studyDateTime', label: 'STUDY DATE/TIME', w: 130 },
  { key: 'history', label: 'HISTORY', w: 180 },
  { key: 'historyAt', label: 'HISTORY AT', w: 130 },
  { key: 'assignedBy', label: 'ASSIGNED BY', w: 110 },
  { key: 'assignedAt', label: 'ASSIGNED AT', w: 130 },
  { key: 'referringPhysicianName', label: 'REFERRING DR', w: 120 },
  { key: 'lockedAt', label: 'LOCKED AT', w: 130 },
  { key: 'reportedBy', label: 'REPORTED BY', w: 110 },
  { key: 'reportedAt', label: 'REPORTED AT', w: 130 },
  { key: 'verifyBy', label: 'VERIFY BY', w: 110 },
  { key: 'verifyAt', label: 'VERIFY AT', w: 130 },
  { key: 'tatAssignedToFinal', label: 'ASSIGNED→FINAL', w: 100, tat: true },
  { key: 'tatHistoryCreatedToVerify', label: 'HISTORY→VERIFY', w: 100, tat: true },
  { key: 'tatUploadedToVerify', label: 'UPLOAD→VERIFY', w: 100, tat: true },
  { key: 'turnAroundTime', label: 'TAT', w: 80, tat: true },
  { key: 'bharatPacsId', label: 'BP ID', w: 160 },
  { key: 'revertCount', label: 'REVERT', w: 55, numeric: true },
];

// Convert "HH:MM:00" → total minutes
const tatToMin = (v) => {
  if (!v || v === '-') return null;
  const parts = String(v).split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  return h * 60 + m;
};

// Visual gradient: green (fast) → red (slow)
const tatColor = (v) => {
  const m = tatToMin(v);
  if (m === null) return 'bg-gray-100 text-gray-400 border border-gray-200';
  if (m <= 30) return 'bg-emerald-100 text-emerald-800 border border-emerald-300';       // ≤30m
  if (m <= 60) return 'bg-green-100 text-green-800 border border-green-300';             // ≤1h
  if (m <= 120) return 'bg-lime-100 text-lime-800 border border-lime-300';               // ≤2h
  if (m <= 240) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';         // ≤4h
  if (m <= 480) return 'bg-amber-100 text-amber-800 border border-amber-300';            // ≤8h
  if (m <= 1440) return 'bg-orange-100 text-orange-800 border border-orange-300';        // ≤24h
  return 'bg-red-100 text-red-800 border border-red-300';                                 // >24h
};

const TATReport = () => {
  const [filters, setFilters] = useState({ dateType: 'uploadDate', fromDate: '', toDate: '', location: '', status: '' });
  const [locations, setLocations] = useState([]);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // ── Server-side pagination state ─────────────────────────────
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [summary, setSummary] = useState(null);

  const hasFetched = useRef(false);

  useEffect(() => {
    api.get('/tat/locations').then(r => { if (r.data?.success) setLocations(r.data.locations || []); }).catch(() => {});
  }, []);

  const fetchReport = useCallback(async ({ pageNum = page, pageSize = perPage } = {}) => {
    if (!filters.fromDate || !filters.toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try {
      const params = {
        dateType: filters.dateType, fromDate: filters.fromDate, toDate: filters.toDate,
        page: pageNum, limit: pageSize,
      };
      if (filters.location) params.location = filters.location;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/tat/report', { params });
      if (res.data?.success) {
        setStudies(res.data.studies || []);
        setPagination(res.data.pagination || { page: pageNum, limit: pageSize, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
        setSummary(res.data.summary || null);
        hasFetched.current = true;
      } else {
        setStudies([]); setPagination({ page: 1, limit: pageSize, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
        toast.error('No data');
      }
    } catch { setStudies([]); toast.error('Failed'); }
    finally { setLoading(false); }
  }, [filters, page, perPage]);

  // Refetch when page or perPage changes (after initial fetch)
  useEffect(() => {
    if (hasFetched.current) fetchReport({ pageNum: page, pageSize: perPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  const handleGenerate = () => {
    setPage(1);
    hasFetched.current = false;
    fetchReport({ pageNum: 1, pageSize: perPage });
  };

  const exportReport = useCallback(async () => {
    if (!filters.fromDate || !filters.toDate) { toast.error('Select dates first'); return; }
    setLoading(true);
    try {
      const params = { dateType: filters.dateType, fromDate: filters.fromDate, toDate: filters.toDate };
      if (filters.location) params.location = filters.location;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/tat/report/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = `TAT_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setLoading(false); }
  }, [filters]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Client-side search + sort on current page only
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    let out = studies;
    if (t) out = out.filter(s => COLUMNS.some(c => String(s[c.key] || '').toLowerCase().includes(t)));
    if (sortKey) {
      out = [...out].sort((a, b) => {
        let va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
        va = String(va); vb = String(vb);
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return out;
  }, [studies, search, sortKey, sortDir]);

  const totalPages = pagination.totalPages || 1;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Navbar title="TAT Report" subtitle="Turn Around Time Analysis" />

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="px-3 pt-3 shrink-0">
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 flex flex-wrap items-center gap-2">
          <select className="border border-gray-300 rounded px-2 py-1.5 text-[11px] font-medium" value={filters.dateType}
            onChange={e => setFilters(p => ({ ...p, dateType: e.target.value }))}>
            <option value="uploadDate">Upload Date</option>
            <option value="studyDate">Study Date</option>
            <option value="assignedDate">Assigned Date</option>
            <option value="reportDate">Report Date</option>
          </select>

          <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-[11px]" value={filters.fromDate}
            onChange={e => setFilters(p => ({ ...p, fromDate: e.target.value }))} />
          <span className="text-[10px] text-gray-400 font-bold">TO</span>
          <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-[11px]" value={filters.toDate}
            onChange={e => setFilters(p => ({ ...p, toDate: e.target.value }))} />

          <select className="border border-gray-300 rounded px-2 py-1.5 text-[11px]" value={filters.location}
            onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}>
            <option value="">All Centers</option>
            {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>

          <select className="border border-gray-300 rounded px-2 py-1.5 text-[11px]" value={filters.status}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="new_study_received">Created</option>
            <option value="assigned_to_doctor">Assigned</option>
            <option value="report_drafted">Draft</option>
            <option value="report_completed">Completed</option>
            <option value="verification_pending">Verify Pending</option>
            <option value="final_report_downloaded">Downloaded</option>
          </select>

          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input type="text" placeholder="Search current page..." className="w-full pl-7 pr-7 py-1.5 text-[11px] border border-gray-300 rounded"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
          </div>

          <button onClick={handleGenerate} disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1">
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            Generate
          </button>

          <button onClick={exportReport} disabled={loading || !pagination.total}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold disabled:opacity-50 flex items-center gap-1">
            <Download className="w-3 h-3" /> Export All
          </button>
        </div>

        {/* ── Summary Bar ──────────────────────────────────────── */}
        {summary && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-4 text-[10px]">
            <span className="font-semibold text-gray-700">
              Total: <span className="text-blue-700">{summary.totalStudies.toLocaleString()}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-semibold text-gray-700">
              With TAT: <span className="text-indigo-700">{summary.studiesWithTAT}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="font-semibold text-gray-700">
              Avg TAT (page): <span className="text-purple-700">{summary.averageTATFormatted}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center gap-1 text-gray-600">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400" title="≤30m" />
              <span className="inline-block w-2 h-2 rounded-sm bg-green-400" title="≤1h" />
              <span className="inline-block w-2 h-2 rounded-sm bg-lime-400" title="≤2h" />
              <span className="inline-block w-2 h-2 rounded-sm bg-yellow-400" title="≤4h" />
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" title="≤8h" />
              <span className="inline-block w-2 h-2 rounded-sm bg-orange-400" title="≤24h" />
              <span className="inline-block w-2 h-2 rounded-sm bg-red-400" title=">24h" />
              <span className="ml-1 font-medium">fast → slow</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="flex-1 px-3 pt-2 min-h-0">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-max w-full text-[10px]">
              <thead className="bg-gray-900 text-white sticky top-0 z-10">
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="px-2 py-2 text-left font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-800"
                      style={{ minWidth: col.w }} onClick={() => handleSort(col.key)}>
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {sortKey === col.key
                          ? (sortDir === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)
                          : <ArrowUpDown className="w-2.5 h-2.5 opacity-30" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-gray-400 text-xs">
                    {loading ? 'Loading...' : studies.length ? 'No matches on this page' : 'Generate a report to see data'}
                  </td></tr>
                ) : rows.map((s, i) => (
                  <tr key={s._id || i} className={`border-t border-gray-100 hover:bg-blue-50/50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    {COLUMNS.map(col => (
                      <td key={col.key} className={`px-2 py-1.5 whitespace-nowrap ${col.numeric ? 'text-center font-mono' : ''}`}>
                        {col.tat ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${tatColor(s[col.key])}`}>
                            {s[col.key] || '-'}
                          </span>
                        ) : col.key === 'revertCount' ? (
                          s[col.key] > 0 ? <span className="text-red-600 font-bold">{s[col.key]}</span> : <span className="text-gray-300">0</span>
                        ) : (
                          <span className="truncate block max-w-[200px]" title={s[col.key]}>{s[col.key] ?? '-'}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer (always visible, sticky at bottom of table container) ──── */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 text-[10px] shrink-0">
            <div className="flex items-center gap-3 text-gray-600">
              <span className="font-semibold">
                Showing <span className="text-blue-700">{rows.length ? (pagination.page - 1) * pagination.limit + 1 : 0}</span>
                {' – '}
                <span className="text-blue-700">{(pagination.page - 1) * pagination.limit + rows.length}</span>
                {' of '}
                <span className="text-blue-700">{pagination.total.toLocaleString()}</span> records
              </span>
              {search && <span className="text-amber-700 italic">(filtered on page)</span>}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 mr-1">Rows:</span>
              <select className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] bg-white" value={perPage}
                onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1); }}>
                {[50, 100, 250, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <button className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1 || loading} onClick={() => setPage(1)} title="First page">
                <ChevronsLeft className="w-3 h-3" />
              </button>
              <button className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} title="Previous page">
                <ChevronLeft className="w-3 h-3" />
              </button>

              <span className="px-2 py-0.5 bg-white border border-gray-300 rounded font-semibold text-gray-700 min-w-[60px] text-center">
                {page} / {totalPages}
              </span>

              <button className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} title="Next page">
                <ChevronRight className="w-3 h-3" />
              </button>
              <button className="p-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)} title="Last page">
                <ChevronsRight className="w-3 h-3" />
              </button>

              <input type="number" min={1} max={totalPages}
                className="w-12 border border-gray-300 rounded px-1.5 py-0.5 text-[10px] bg-white text-center"
                placeholder="Go" disabled={loading}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = parseInt(e.currentTarget.value);
                    if (v >= 1 && v <= totalPages) { setPage(v); e.currentTarget.value = ''; }
                  }
                }}
              />

              {loading && <RefreshCw className="w-3 h-3 animate-spin text-blue-600 ml-1" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TATReport;
