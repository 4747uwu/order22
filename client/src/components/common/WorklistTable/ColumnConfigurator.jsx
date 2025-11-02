import React, { useState, useRef, useEffect } from 'react';

const ColumnConfigurator = ({ columnConfig, onColumnChange, onResetToDefault }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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

  const visibleCount = Object.values(columnConfig).filter(col => col.visible).length;
  const totalCount = Object.keys(columnConfig).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ✅ COMPACT MODERN BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        title="Configure Columns"
      >
        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        <span className="hidden sm:inline">
          Columns ({visibleCount})
        </span>
        <svg 
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-72 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-80 overflow-hidden">
          
          {/* ✅ COMPACT HEADER */}
          <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Configure Columns</h3>
              <button
                onClick={onResetToDefault}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Reset
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {visibleCount} of {totalCount} columns visible
            </p>
          </div>

          {/* ✅ COMPACT COLUMN LIST */}
          <div className="max-h-64 overflow-y-auto">
            <div className="p-2 space-y-0.5">
              {Object.entries(columnConfig)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([key, config]) => {
                  const isEssential = ['checkbox', 'workflowStatus', 'patientId', 'patientName'].includes(key);
                  
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors ${
                        isEssential ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          id={`column-${key}`}
                          checked={config.visible}
                          onChange={() => handleColumnToggle(key)}
                          disabled={isEssential}
                          className={`w-3.5 h-3.5 rounded border-gray-300 ${
                            isEssential 
                              ? 'text-blue-600 opacity-50 cursor-not-allowed' 
                              : 'text-black focus:ring-black focus:ring-1'
                          }`}
                        />
                        <label
                          htmlFor={`column-${key}`}
                          className={`text-xs font-medium ${
                            isEssential 
                              ? 'text-blue-700 cursor-not-allowed' 
                              : config.visible 
                                ? 'text-gray-900 cursor-pointer' 
                                : 'text-gray-500 cursor-pointer'
                          }`}
                        >
                          {config.label}
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-1.5">
                        {isEssential && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            Required
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">
                          #{config.order}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ✅ COMPACT FOOTER */}
          <div className="px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>💡 Essential columns cannot be hidden</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnConfigurator;