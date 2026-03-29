import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, GripVertical, Maximize2, Minimize2, FileText } from 'lucide-react';

/**
 * CompareStudiesModal — Full-screen overlay for comparing 2-3 studies side by side.
 * Each study loads the OnlineReportingSystemWithOHIF in an iframe.
 * Panels are resizable via drag handles and individually closable.
 */
const CompareStudiesModal = ({ isOpen, studies = [], onClose }) => {
  // Track which panels are still visible (user can close individual panels)
  const [panels, setPanels] = useState([]);
  // Panel widths as percentages (flexible array that sums to 100)
  const [panelWidths, setPanelWidths] = useState([]);
  // Drag state for resize handles
  const [dragging, setDragging] = useState(null); // { handleIndex }
  const containerRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartWidths = useRef([]);

  // Initialize panels when studies change
  useEffect(() => {
    if (isOpen && studies.length >= 2) {
      const initialPanels = studies.map(s => ({
        ...s,
        visible: true,
        key: s._id,
      }));
      setPanels(initialPanels);
      // Distribute width equally
      const width = 100 / studies.length;
      setPanelWidths(studies.map(() => width));
    }
  }, [isOpen, studies]);

  // Close a single panel
  const handleClosePanel = useCallback((index) => {
    setPanels(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        onClose();
        return prev;
      }
      return next;
    });
    setPanelWidths(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return prev;
      // Redistribute closed panel's width equally
      const removedWidth = prev[index];
      const share = removedWidth / next.length;
      return next.map(w => w + share);
    });
  }, [onClose]);

  // --- Resize handle drag logic ---
  const handleMouseDown = useCallback((e, handleIndex) => {
    e.preventDefault();
    setDragging({ handleIndex });
    dragStartX.current = e.clientX;
    dragStartWidths.current = [...panelWidths];
  }, [panelWidths]);

  const handleMouseMove = useCallback((e) => {
    if (dragging === null || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - dragStartX.current;
    const deltaPct = (deltaX / containerWidth) * 100;

    const { handleIndex } = dragging;
    const newWidths = [...dragStartWidths.current];
    const minPct = 20; // minimum 20% per panel

    const leftNew = newWidths[handleIndex] + deltaPct;
    const rightNew = newWidths[handleIndex + 1] - deltaPct;

    if (leftNew >= minPct && rightNew >= minPct) {
      newWidths[handleIndex] = leftNew;
      newWidths[handleIndex + 1] = rightNew;
      setPanelWidths(newWidths);
    }
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Global mouse move/up listeners during drag
  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || panels.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-950/95 backdrop-blur-sm">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 flex-shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Compare Studies</h2>
              <p className="text-[9px] text-gray-400 leading-tight">{panels.length} {panels.length === 1 ? 'study' : 'studies'} loaded · Drag dividers to resize</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset layout */}
          {panels.length > 1 && (
            <button
              onClick={() => {
                const w = 100 / panels.length;
                setPanelWidths(panels.map(() => w));
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-300 bg-gray-700/50 rounded hover:bg-gray-600 transition-colors"
              title="Reset equal widths"
            >
              <Maximize2 className="w-3 h-3" /> Reset Layout
            </button>
          )}
          {/* Close All */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold text-white bg-red-600/80 rounded hover:bg-red-500 transition-colors shadow-sm"
          >
            <X className="w-3 h-3" /> Close All
          </button>
        </div>
      </div>

      {/* ── Panels Container ── */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ cursor: dragging !== null ? 'col-resize' : 'default' }}
      >
        {panels.map((panel, index) => (
          <React.Fragment key={panel.key}>
            {/* Panel */}
            <div
              className="flex flex-col min-w-0 h-full transition-[width] duration-150 ease-out"
              style={{ width: `${panelWidths[index]}%` }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate max-w-[180px]" title={panel.patientName || panel.patientInfo?.patientName || 'Unknown'}>
                      {(panel.patientName || panel.patientInfo?.patientName || 'Unknown').toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                      <span className="px-1 py-0 bg-gray-700 rounded text-gray-300 font-mono">{panel.bharatPacsId || panel.accessionNumber || '—'}</span>
                      <span className="px-1 py-0 bg-emerald-900/50 rounded text-emerald-300 font-semibold">{panel.modality || '—'}</span>
                      <span>{panel.patientAge || panel.patientInfo?.age || ''}{panel.patientSex || panel.patientInfo?.gender ? ` / ${panel.patientSex || panel.patientInfo?.gender}` : ''}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleClosePanel(index)}
                  className="p-1 rounded hover:bg-red-600/50 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  title="Close this panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Iframe — loads the existing reporting system */}
              <div className="flex-1 bg-black min-h-0">
                <iframe
                  src={`/online-reporting/${panel._id}?openOHIF=true`}
                  className="w-full h-full border-0"
                  title={`Study ${index + 1}: ${panel.patientName || panel._id}`}
                  allow="cross-origin-isolated"
                />
              </div>
            </div>

            {/* Resize Handle (between panels, not after the last one) */}
            {index < panels.length - 1 && (
              <div
                className={`flex-shrink-0 flex items-center justify-center cursor-col-resize group transition-colors ${
                  dragging?.handleIndex === index
                    ? 'bg-blue-500 w-[5px]'
                    : 'bg-gray-700 hover:bg-blue-500/70 w-[4px]'
                }`}
                onMouseDown={(e) => handleMouseDown(e, index)}
                title="Drag to resize"
              >
                <div className={`transition-opacity ${
                  dragging?.handleIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <GripVertical className="w-3 h-3 text-white/80" />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Drag overlay to prevent iframe stealing mouse events */}
      {dragging !== null && (
        <div className="fixed inset-0 z-[10000] cursor-col-resize" />
      )}
    </div>
  );
};

export default CompareStudiesModal;
