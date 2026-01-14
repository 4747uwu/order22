import React, { useState } from 'react';
import { Building2, CheckSquare, Square, Search, MapPin, Users } from 'lucide-react';

/**
 * LabSelector Component
 * Allows admins/assignors to select which labs/centers they should have access to
 * 
 * @param {Array} selectedLabs - Array of lab IDs that are currently selected
 * @param {Function} onLabToggle - Callback when a lab is toggled
 * @param {Function} onSelectAll - Callback to select all labs
 * @param {Function} onClearAll - Callback to clear all selections
 * @param {Array} availableLabs - Array of lab objects to display
 */
const LabSelector = ({ 
  selectedLabs = [], 
  onLabToggle, 
  onSelectAll, 
  onClearAll,
  availableLabs = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleLabToggle = (labId) => {
    onLabToggle(labId);
  };

  const isLabSelected = (labId) => {
    return selectedLabs.includes(labId);
  };

  const filteredLabs = availableLabs.filter(lab => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      lab.name?.toLowerCase().includes(searchLower) ||
      lab.identifier?.toLowerCase().includes(searchLower) ||
      lab.address?.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            Lab/Center Access
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Select which labs/centers this user can access
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(availableLabs.map(lab => lab._id))}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Select All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search labs by name, identifier, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Labs list */}
      {filteredLabs.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            {searchTerm ? 'No labs found matching your search' : 'No labs available'}
          </p>
          {searchTerm && (
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search terms
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLabs.map(lab => {
            const isSelected = isLabSelected(lab._id);
            const activeStaff = lab.staffUsers?.filter(s => s.isActive).length || 0;

            return (
              <button
                key={lab._id}
                type="button"
                onClick={() => handleLabToggle(lab._id)}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? 'bg-teal-50 border-teal-400 shadow-md hover:bg-teal-100'
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
                  }
                `}
              >
                <div className="mt-1">
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-teal-600" />
                  ) : (
                    <Square className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 truncate">
                        {lab.name}
                      </h4>
                      <p className="text-sm text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                        {lab.identifier}
                      </p>
                    </div>
                    {!lab.isActive && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Lab details */}
                  <div className="mt-3 space-y-1.5">
                    {lab.address?.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="truncate">
                          {[lab.address.city, lab.address.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>
                        {activeStaff} active staff member{activeStaff !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Contact info */}
                  {lab.contactPerson && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Contact: <span className="text-slate-700 font-medium">{lab.contactPerson}</span>
                      </p>
                      {lab.contactEmail && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lab.contactEmail}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-teal-900">
              Selected Labs: <span className="text-xl font-bold">{selectedLabs.length}</span> of {availableLabs.length}
            </p>
            <p className="text-xs text-teal-700 mt-1">
              User will only see studies from selected labs in their dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabSelector;
