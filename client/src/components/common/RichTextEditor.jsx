import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Type, Palette, Highlighter, Undo2, Redo2, RemoveFormatting
} from 'lucide-react';

/**
 * Compact rich-text editor with Word-style formatting toolbar.
 * Uses contentEditable + execCommand for WYSIWYG editing.
 *
 * Props:
 *  - value: HTML string
 *  - onChange(html): called on every edit
 *  - placeholder: shown when empty
 *  - minHeight: CSS min-height for the editable area (default '300px')
 *  - className: extra classes for the outer wrapper
 */
const RichTextEditor = ({ value, onChange, placeholder = 'Start typing...', minHeight = '300px', className = '' }) => {
  const editorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [showColorPicker, setShowColorPicker] = useState(null); // 'text' | 'bg' | null
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);

  // Sync value prop → editor (only when it differs)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    });
  }, []);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setTimeout(() => { emitChange(); updateActiveFormats(); }, 10);
  };

  const handleInput = () => {
    emitChange();
    updateActiveFormats();
  };

  const handleKeyUp = () => updateActiveFormats();
  const handleMouseUp = () => updateActiveFormats();

  // Keyboard shortcuts
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold'); break;
        case 'i': e.preventDefault(); exec('italic'); break;
        case 'u': e.preventDefault(); exec('underline'); break;
        case 'z': e.preventDefault(); e.shiftKey ? exec('redo') : exec('undo'); break;
        default: break;
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  // ── Colors ──
  const textColors = [
    '#000000', '#434343', '#666666', '#999999',
    '#b7b7b7', '#d32f2f', '#c62828', '#ad1457',
    '#6a1b9a', '#4527a0', '#283593', '#1565c0',
    '#0277bd', '#00838f', '#00695c', '#2e7d32',
    '#558b2f', '#9e9d24', '#f9a825', '#ff8f00',
    '#ef6c00', '#d84315', '#4e342e', '#37474f',
  ];

  const highlightColors = [
    'transparent', '#ffff00', '#00ff00', '#00ffff',
    '#ff00ff', '#ff0000', '#0000ff', '#ffd700',
    '#ffa07a', '#98fb98', '#add8e6', '#dda0dd',
    '#ffe4b5', '#f0e68c', '#e6e6fa', '#fafad2',
  ];

  const fontSizes = [
    { label: '8', value: '8pt' },
    { label: '9', value: '9pt' },
    { label: '10', value: '10pt' },
    { label: '11', value: '11pt' },
    { label: '12', value: '12pt' },
    { label: '14', value: '14pt' },
    { label: '16', value: '16pt' },
    { label: '18', value: '18pt' },
    { label: '20', value: '20pt' },
    { label: '24', value: '24pt' },
    { label: '28', value: '28pt' },
    { label: '36', value: '36pt' },
  ];

  const applyFontSize = (size) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) { setShowFontSizeMenu(false); return; }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = size;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const nr = document.createRange();
        nr.selectNodeContents(span);
        sel.addRange(nr);
      } catch { /* fallback */ }
    }
    setShowFontSizeMenu(false);
    setTimeout(emitChange, 10);
  };

  const insertTable = () => {
    const r = Math.max(1, tableRows);
    const c = Math.max(1, tableCols);
    let html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;"><tbody>';
    for (let ri = 0; ri < r; ri++) {
      html += '<tr>';
      for (let ci = 0; ci < c; ci++) {
        const isHeader = ri === 0;
        const tag = isHeader ? 'th' : 'td';
        const bg = isHeader ? 'background:#f5f5f5;font-weight:bold;' : '';
        html += `<${tag} style="border:1px solid #ddd;padding:8px;${bg}">${isHeader ? `Header ${ci + 1}` : '&nbsp;'}</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><br>';
    exec('insertHTML', html);
    setShowTableDialog(false);
  };

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.rte-popover')) {
        setShowColorPicker(null);
        setShowTableDialog(false);
        setShowFontSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Toolbar button helper ──
  const Btn = ({ onClick, active, title, children, className: cx = '' }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded transition-all text-[11px]
        ${active ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}
        ${cx}`}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 bg-gray-50 border-b border-gray-200 text-[10px]">
        {/* Undo / Redo */}
        <Btn onClick={() => exec('undo')} title="Undo (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('redo')} title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-3.5 h-3.5" /></Btn>

        <Sep />

        {/* Font size */}
        <div className="relative rte-popover">
          <Btn onClick={() => setShowFontSizeMenu(!showFontSizeMenu)} title="Font Size">
            <Type className="w-3.5 h-3.5" />
          </Btn>
          {showFontSizeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 w-16 max-h-48 overflow-y-auto">
              {fontSizes.map(s => (
                <button key={s.value} type="button"
                  onClick={() => applyFontSize(s.value)}
                  className="w-full px-2 py-1 text-left text-[11px] hover:bg-blue-50 hover:text-blue-700"
                >{s.label}</button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Bold / Italic / Underline / Strikethrough */}
        <Btn onClick={() => exec('bold')} active={activeFormats.bold} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('italic')} active={activeFormats.italic} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('underline')} active={activeFormats.underline} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('strikeThrough')} active={activeFormats.strikeThrough} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </Btn>

        <Sep />

        {/* Text color */}
        <div className="relative rte-popover">
          <Btn onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')} active={showColorPicker === 'text'} title="Text Color">
            <div className="flex flex-col items-center">
              <span className="font-bold text-[11px] leading-none">A</span>
              <div className="w-3.5 h-1 rounded-sm bg-red-500 mt-px" />
            </div>
          </Btn>
          {showColorPicker === 'text' && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 w-40">
              <div className="text-[9px] font-semibold text-gray-500 mb-1">Text Color</div>
              <div className="grid grid-cols-6 gap-1">
                {textColors.map(c => (
                  <button key={c} type="button"
                    onClick={() => { exec('foreColor', c); setShowColorPicker(null); }}
                    className="w-5 h-5 rounded border border-gray-200 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative rte-popover">
          <Btn onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')} active={showColorPicker === 'bg'} title="Highlight">
            <Highlighter className="w-3.5 h-3.5" />
          </Btn>
          {showColorPicker === 'bg' && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 w-40">
              <div className="text-[9px] font-semibold text-gray-500 mb-1">Highlight</div>
              <div className="grid grid-cols-4 gap-1">
                {highlightColors.map(c => (
                  <button key={c} type="button"
                    onClick={() => { exec('hiliteColor', c); setShowColorPicker(null); }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
                    title={c === 'transparent' ? 'None' : c}
                  >{c === 'transparent' ? <span className="text-[8px] text-gray-400">x</span> : null}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Sep />

        {/* Alignment */}
        <Btn onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('justifyRight')} title="Align Right"><AlignRight className="w-3.5 h-3.5" /></Btn>

        <Sep />

        {/* Lists */}
        <Btn onClick={() => exec('insertUnorderedList')} title="Bullet List"><List className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => exec('insertOrderedList')} title="Numbered List"><ListOrdered className="w-3.5 h-3.5" /></Btn>

        <Sep />

        {/* Table */}
        <div className="relative rte-popover">
          <Btn onClick={() => setShowTableDialog(!showTableDialog)} active={showTableDialog} title="Insert Table">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" />
            </svg>
          </Btn>
          {showTableDialog && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 w-48">
              <div className="text-[10px] font-semibold text-gray-700 mb-2">Insert Table</div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] text-gray-500 w-10">Rows:</label>
                <input type="number" min="1" max="30" value={tableRows}
                  onChange={e => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-14 px-1.5 py-1 text-[11px] border border-gray-300 rounded" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <label className="text-[10px] text-gray-500 w-10">Cols:</label>
                <input type="number" min="1" max="15" value={tableCols}
                  onChange={e => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-14 px-1.5 py-1 text-[11px] border border-gray-300 rounded" />
              </div>
              <button type="button" onClick={insertTable}
                className="w-full px-2 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                Insert
              </button>
            </div>
          )}
        </div>

        {/* Horizontal line */}
        <Btn onClick={() => exec('insertHTML', '<hr style="border:none;border-top:1px solid #ddd;margin:12px 0;">')} title="Horizontal Line">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        </Btn>

        <Sep />

        {/* Clear formatting */}
        <Btn onClick={() => exec('removeFormat')} title="Clear Formatting">
          <RemoveFormatting className="w-3.5 h-3.5" />
        </Btn>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        data-placeholder={placeholder}
        className="outline-none px-4 py-3 text-[12px] overflow-y-auto"
        style={{
          minHeight,
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.6',
          color: '#1a1a1a',
        }}
      />

      {/* Placeholder styling */}
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
