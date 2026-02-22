import React, { useState, useRef, useEffect, useMemo } from 'react';


const DB_TO_CONFIG_KEY_MAP = {
  // DB key (visibleColumns)  : columnConfig key (getDefaultColumnConfig)
  'checkbox'           : 'checkbox',
  'bharatPacsId'       : 'bharatPacsId',
  'centerName'         : 'centerName',
  'location'           : 'location',
  'timeline'           : 'timeline',
  'patientName'        : 'patientName',
  'patientId'          : 'patientId',
  'ageGender'          : 'ageGender',
  'modality'           : 'modality',
  'viewOnly'           : 'viewOnly',
  'reporting'           : 'reporting',
  'studySeriesImages'  : 'seriesCount',       // ← DB sends 'studySeriesImages', config key is 'seriesCount'
  'accessionNumber'    : 'accessionNumber',
  'referralDoctor'     : 'referralDoctor',
  'clinicalHistory'    : 'clinicalHistory',
  'studyDateTime'      : 'studyTime',         // ← DB sends 'studyDateTime', config key is 'studyTime'
  'uploadDateTime'     : 'uploadTime',        // ← DB sends 'uploadDateTime', config key is 'uploadTime'
  'assignedRadiologist': 'radiologist',       // ← DB sends 'assignedRadiologist', config key is 'radiologist'
  'studyLock'          : 'studyLock',
  'status'             : 'caseStatus',        // ← DB sends 'status', config key is 'caseStatus'
  'assignedVerifier'   : 'assignedVerifier',
  'verifiedDateTime'   : 'verifiedDateTime',
  'actions'            : 'actions',
  'rejectionReason'    : 'rejectionReason',
};

const ColumnConfigurator = ({ columnConfig, onColumnChange, onResetToDefault, theme = 'default', visibleColumns = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleColumnToggle = (columnKey) => {
    onColumnChange(columnKey, !columnConfig[columnKey].visible);
  };

  // ✅ Convert DB visibleColumns keys → columnConfig keys
  const allowedConfigKeys = useMemo(() => {
    if (!visibleColumns || visibleColumns.length === 0) return null; // null = no restriction

    const mapped = visibleColumns
      .map(dbKey => DB_TO_CONFIG_KEY_MAP[dbKey] || dbKey) // map or use as-is
      .filter(Boolean);

    console.log('🎛️ [ColumnConfigurator] DB columns mapped to config keys:', mapped);
    return new Set(mapped);
  }, [visibleColumns]);

  // ✅ Filter columnConfig to only DB-allowed columns (using mapped keys)
  const filteredColumnConfig = useMemo(() => {
    if (!allowedConfigKeys) return columnConfig; // No DB restriction = show all
    
    return Object.fromEntries(
      Object.entries(columnConfig).filter(([key]) => allowedConfigKeys.has(key))
    );
  }, [columnConfig, allowedConfigKeys]);

  const visibleCount = Object.values(filteredColumnConfig).filter(c => c.visible).length;
  const totalCount = Object.keys(filteredColumnConfig).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ✅ COMPACT MODERN BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        title="Configure Columns"
      >
        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110 4m0-4v2m0-6V4" />
        </svg>
        <span className="hidden sm:inline">Columns ({visibleCount})</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-80 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Configure Columns</h3>
              <button onClick={onResetToDefault} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                Reset
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">{visibleCount} of {totalCount} columns visible</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="p-2 space-y-0.5">
              {Object.entries(filteredColumnConfig)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([key, config]) => {
                  const isEssential = ['patientName'].includes(key);
                  return (
                    <div key={key} className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors ${isEssential ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          id={`column-${key}`}
                          checked={config.visible}
                          onChange={() => handleColumnToggle(key)}
                          disabled={isEssential}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                        />
                        <label htmlFor={`column-${key}`} className={`text-xs cursor-pointer ${isEssential ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                          {config.label}
                          {isEssential && <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-semibold">Required</span>}
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>💡 Essential columns cannot be hidden</span>
              <button onClick={() => setIsOpen(false)} className="text-blue-600 hover:text-blue-800 font-medium transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnConfigurator;