import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import toast from 'react-hot-toast';

const ReportEditor = ({ content, onChange }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [paginatedContent, setPaginatedContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState('11pt');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [showWordCount, setShowWordCount] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [lineSpacing, setLineSpacing] = useState('1.4');
  const [showRuler, setShowRuler] = useState(true);
  const [activeTools, setActiveTools] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    subscript: false,
    superscript: false
  });
  const contentEditableRef = useRef(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const lastTranscriptRef = useRef('');
  const [isRecording, setIsRecording] = useState(false);

  // ✅ Check if we're on a secure context (HTTPS or localhost)
  const isSecureContext = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');

  // Voice to Text functionality
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // ✅ Combined check: browser support AND secure context
  const canUseVoice = browserSupportsSpeechRecognition && isSecureContext;

  // Insert transcript into editor when it changes
  useEffect(() => {
    if (!isRecording || !transcript || !contentEditableRef.current) return;
    if (transcript === lastTranscriptRef.current) return;

    const previousLength = lastTranscriptRef.current.length;
    const newText = transcript.substring(previousLength);
    lastTranscriptRef.current = transcript;

    if (newText.trim()) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        const range = document.createRange();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const needsLeadingSpace = previousLength > 0 && !transcript[previousLength - 1]?.match(/\s/);
      const textToInsert = (needsLeadingSpace ? ' ' : '') + newText;

      document.execCommand('insertText', false, textToInsert);
      onChange(contentEditableRef.current.innerHTML);
    }
  }, [transcript, isRecording, onChange]);

  // Sync content from props (but not during recording)
  useEffect(() => {
    if (listening) return;
    if (contentEditableRef.current && content !== contentEditableRef.current.innerHTML) {
      contentEditableRef.current.innerHTML = content || '';
    }
  }, [content, listening]);

  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    // ✅ Check for HTTPS first
    if (!isSecureContext) {
      toast.error('Voice input requires HTTPS. Please access the site via HTTPS or use localhost.', {
        duration: 5000,
        icon: '🔒'
      });
      return;
    }

    if (!browserSupportsSpeechRecognition) {
      toast.error('Your browser does not support speech recognition. Try Chrome or Edge.', {
        duration: 4000
      });
      return;
    }

    if (isRecording || listening) {
      setIsRecording(false);
      SpeechRecognition.stopListening();
    } else {
      setIsRecording(true);
      
      if (contentEditableRef.current) {
        contentEditableRef.current.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      resetTranscript();
      lastTranscriptRef.current = '';

      SpeechRecognition.startListening({ 
        continuous: true, 
        language: 'en-US' 
      });
    }
  };

  // Sync local state with actual listening state
  useEffect(() => {
    if (!listening && isRecording) {
      setIsRecording(false);
    }
    if (listening && !isRecording) {
      setIsRecording(true);
    }
  }, [listening, isRecording]);

  // Process content for multi-page preview
  const processContentForPreview = useCallback((htmlContent) => {
    if (!htmlContent) return '';
    if (htmlContent.includes('report-page')) {
      return htmlContent.replace(
        /(<div[^>]*class="[^"]*report-page[^"]*"[^>]*>)/g, 
        '$1'
      );
    }
    return `<div class="report-page-preview" data-page="1">${htmlContent}</div>`;
  }, []);

  useEffect(() => {
    if (isPreviewMode && content) {
      const processed = processContentForPreview(content);
      setPaginatedContent(processed);
    }
  }, [content, isPreviewMode, processContentForPreview]);

  const handleContentChange = (e) => {
    onChange(e.target.innerHTML);
    updateToolStates();
  };

  const updateToolStates = () => {
    setActiveTools({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      subscript: document.queryCommandState('subscript'),
      superscript: document.queryCommandState('superscript')
    });
  };

  const applyCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
    updateToolStates();
  };

  const applyStyle = (style, value) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style[style] = value;
      try {
        range.surroundContents(span);
      } catch (e) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(style, false, value);
        document.execCommand('styleWithCSS', false, false);
      }
    }
    contentEditableRef.current?.focus();
    updateToolStates();
  };

  const getWordCount = () => {
    const text = contentEditableRef.current?.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    return { words, characters, charactersNoSpaces };
  };

  const getPageCount = () => {
    const pages = document.querySelectorAll('.report-page, .report-page-preview');
    return pages.length || 1;
  };

  const handleFind = () => {
    if (!findText) return;
    window.find(findText);
  };

  const handleReplace = () => {
    if (!findText || !replaceText) return;
    const currentContent = contentEditableRef.current?.innerHTML || '';
    const updatedContent = currentContent.replace(new RegExp(findText, 'g'), replaceText);
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = updatedContent;
      onChange(updatedContent);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            applyCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            applyCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            applyCommand('underline');
            break;
          case 'f':
            e.preventDefault();
            setShowFindReplace(!showFindReplace);
            break;
          case 'p':
            e.preventDefault();
            setIsPreviewMode(!isPreviewMode);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode, showFindReplace]);

  const ToolbarButton = ({ onClick, active, children, tooltip, className = "", disabled = false }) => (
    <button
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      className={`
        flex items-center justify-center px-2 py-1 rounded text-sm font-medium
        transition-all duration-150
        ${active 
          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
        ${className}
      `}
    >
      {children}
    </button>
  );

  const ToolbarSeparator = () => <div className="w-px h-5 bg-gray-300 mx-1"></div>;

  const ToolbarGroup = ({ children, label }) => (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-0.5 bg-gray-50 rounded p-0.5">{children}</div>
      {label && <span className="text-[9px] text-gray-500 mt-0.5">{label}</span>}
    </div>
  );

  return (
    <div className={`flex flex-col h-screen transition-all duration-300 bg-gray-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b shadow-sm bg-white border-gray-200">
        <div className="px-3 py-1.5 flex flex-wrap items-center gap-1.5 border-b border-gray-200">
          
          {/* Font Group */}
          <ToolbarGroup label="Font">
            <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); applyCommand('fontName', e.target.value); }}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
            </select>
            <select value={fontSize} onChange={(e) => { setFontSize(e.target.value); applyStyle('fontSize', e.target.value); }}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs w-14">
              <option value="10pt">10</option>
              <option value="11pt">11</option>
              <option value="12pt">12</option>
              <option value="14pt">14</option>
              <option value="16pt">16</option>
              <option value="18pt">18</option>
            </select>
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* Format Group */}
          <ToolbarGroup label="Format">
            <ToolbarButton onClick={() => applyCommand('bold')} active={activeTools.bold} tooltip="Bold (Ctrl+B)">
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton onClick={() => applyCommand('italic')} active={activeTools.italic} tooltip="Italic (Ctrl+I)">
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton onClick={() => applyCommand('underline')} active={activeTools.underline} tooltip="Underline (Ctrl+U)">
              <u>U</u>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarSeparator />

          {/* View Tools */}
          <ToolbarGroup label="Tools">
            <ToolbarButton onClick={() => setShowWordCount(!showWordCount)} active={showWordCount} tooltip="Word Count">
              #
            </ToolbarButton>
            <ToolbarButton onClick={() => setShowFindReplace(!showFindReplace)} active={showFindReplace} tooltip="Find & Replace">
              🔍
            </ToolbarButton>

            {/* ✅ Voice Button - Shows warning tooltip if not HTTPS */}
            <ToolbarButton 
              onClick={toggleVoiceRecognition} 
              active={isRecording}
              tooltip={!isSecureContext ? "Voice requires HTTPS" : (isRecording ? "Stop Voice" : "Start Voice")}
              className={`${isRecording ? 'animate-pulse bg-red-100 text-red-700' : ''} ${!isSecureContext ? 'opacity-60' : ''}`}
            >
              🎤
            </ToolbarButton>
          </ToolbarGroup>
        </div>

        {/* View Mode + Recording Status */}
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setIsPreviewMode(false)}
                className={`px-3 py-0.5 rounded text-xs font-medium ${!isPreviewMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Edit
              </button>
              <button onClick={() => setIsPreviewMode(true)}
                className={`px-3 py-0.5 rounded text-xs font-medium ${isPreviewMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}
              >
                Preview
              </button>
            </div>

            {/* ✅ Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium animate-pulse">
                🔴 Recording...
              </div>
            )}

            {/* ✅ HTTPS warning */}
            {!isSecureContext && (
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                🔒 Voice requires HTTPS
              </div>
            )}
          </div>

          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-gray-100 rounded" title="Fullscreen">
            ⛶
          </button>
        </div>

        {/* Find & Replace */}
        {showFindReplace && (
          <div className="px-3 py-1.5 bg-yellow-50 border-t flex items-center gap-2">
            <input type="text" placeholder="Find..." value={findText} onChange={(e) => setFindText(e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="text" placeholder="Replace..." value={replaceText} onChange={(e) => setReplaceText(e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <button onClick={handleFind} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Find</button>
            <button onClick={handleReplace} className="px-2 py-1 bg-green-600 text-white text-xs rounded">Replace</button>
            <button onClick={() => setShowFindReplace(false)} className="ml-auto text-gray-500">✕</button>
          </div>
        )}
      </div>

      {/* Word Count Status */}
      {showWordCount && (
        <div className="px-3 py-1 border-b text-xs bg-white text-gray-600">
          Words: {getWordCount().words} | Characters: {getWordCount().characters}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto" style={{ background: '#e1e1e1' }}>
        <style dangerouslySetInnerHTML={{ __html: documentStyles }} />
        <div className="min-h-full py-6 px-4 flex justify-center">
          <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
            {isPreviewMode ? (
              <div className="preview-container-wrapper">
                <div className="multi-page-preview" dangerouslySetInnerHTML={{ __html: paginatedContent || content }} />
              </div>
            ) : (
              <div
                ref={contentEditableRef}
                contentEditable
                className="report-editor ms-word-page"
                style={{ lineHeight: lineSpacing }}
                onInput={handleContentChange}
                onMouseUp={updateToolStates}
                onKeyUp={updateToolStates}
                suppressContentEditableWarning={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep your existing documentStyles constant here...
const documentStyles = `
  .ms-word-page {
    width: 21cm;
    min-height: 29.7cm;
    padding: 2cm 2.5cm;
    margin: 0 auto 15px auto;
    background: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif;
    font-size: 11pt;
    color: #000;
    outline: none;
    box-sizing: border-box;
  }
  .ms-word-page:focus {
    box-shadow: 0 0 10px rgba(0,0,0,0.15), 0 0 0 1px rgba(59, 130, 246, 0.3);
  }
  .preview-container-wrapper { width: 21cm; margin: 0 auto; }
  .multi-page-preview { width: 21cm; display: flex; flex-direction: column; gap: 15px; }
  .report-page, .report-page-preview {
    background: white; width: 21cm; min-height: 29.7cm; padding: 2cm 2.5cm;
    margin: 0 auto 15px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif; font-size: 11pt;
  }
  .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;

export default ReportEditor;