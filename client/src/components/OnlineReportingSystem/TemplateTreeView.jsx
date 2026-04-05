import React, { useState, useEffect, useMemo } from 'react';

const TemplateTreeView = ({ templates, selectedTemplate, onTemplateSelect, studyModality }) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-expand matching modality or first category
  useEffect(() => {
    if (templates && Object.keys(templates).length > 0) {
      const matchKey = studyModality && Object.keys(templates).find(k => k.toUpperCase().includes(studyModality.toUpperCase()));
      setExpandedCategories(prev => ({ ...prev, [matchKey || Object.keys(templates)[0]]: true }));
    }
  }, [templates, studyModality]);

  const filteredTemplates = useMemo(() => {
    if (!templates || !searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    const filtered = {};
    Object.entries(templates).forEach(([category, list]) => {
      if (!Array.isArray(list)) return;
      const matches = list.filter(t => t.title.toLowerCase().includes(q) || category.toLowerCase().includes(q));
      if (matches.length > 0) filtered[category] = matches;
    });
    return filtered;
  }, [templates, searchQuery]);

  // Expand all when searching
  useEffect(() => {
    if (searchQuery.trim() && filteredTemplates) {
      const expanded = {};
      Object.keys(filteredTemplates).forEach(k => { expanded[k] = true; });
      setExpandedCategories(expanded);
    }
  }, [searchQuery, filteredTemplates]);

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  const totalCount = useMemo(() => {
    if (!filteredTemplates) return 0;
    return Object.values(filteredTemplates).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
  }, [filteredTemplates]);

  if (!templates || typeof templates !== 'object' || Object.keys(templates).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-3 text-center h-full bg-white">
        <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-[10px] text-gray-400">{templates === null ? 'Loading...' : 'No templates'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white text-[11px]">
      {/* Header */}
      <div className="px-1.5 py-1 bg-gray-900 flex items-center gap-1.5">
        <div className="relative flex-1">
          <svg className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-5 pr-5 py-0.5 text-[10px] bg-white border-0 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <span className="bg-white text-gray-900 text-[9px] font-bold px-1.5 rounded-full">{totalCount}</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery && Object.keys(filteredTemplates).length === 0 ? (
          <div className="p-3 text-center text-[10px] text-gray-400">No results</div>
        ) : (
          Object.entries(filteredTemplates).map(([category, categoryTemplates]) => {
            if (!Array.isArray(categoryTemplates)) return null;
            const isExpanded = expandedCategories[category];
            return (
              <div key={category}>
                {/* Category row */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center w-full px-2 py-1 text-left hover:bg-gray-50 transition-colors"
                >
                  <svg className={`w-2.5 h-2.5 text-gray-400 mr-1.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-[11px] font-semibold text-gray-800 flex-1 truncate">{category}</span>
                  <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 rounded ml-1">{categoryTemplates.length}</span>
                </button>

                {/* Template items */}
                {isExpanded && categoryTemplates.map((template) => {
                  const isActive = selectedTemplate?._id === template.id || selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => onTemplateSelect(template.id)}
                      className={`flex items-center w-full pl-6 pr-2 py-1 text-left transition-colors ${
                        isActive ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full mr-2 ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <span className={`text-[11px] truncate ${isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                        {template.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Selection indicator */}
      {selectedTemplate && (
        <div className="px-2 py-1 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-500 truncate font-medium">{selectedTemplate.title}</p>
        </div>
      )}
    </div>
  );
};

export default TemplateTreeView;
