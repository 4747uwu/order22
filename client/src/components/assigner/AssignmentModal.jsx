import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, User } from 'lucide-react';
import toast from 'react-hot-toast';

const AssignmentModalContent = ({ 
  study, 
  availableAssignees, 
  onSubmit, 
  onClose, 
  position,
  searchTerm: externalSearchTerm = ''
}) => {
  const [selectedRadiologistIds, setSelectedRadiologistIds] = useState([]);
  const [currentlyAssignedIds, setCurrentlyAssignedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  // ✅ USE EXTERNAL SEARCH TERM FROM TABLE INPUT
  const searchTerm = externalSearchTerm;

  // ✅ EXTRACT CURRENTLY ASSIGNED IDS
  useEffect(() => {
    let assignedIds = [];
    
    if (study?.assignedToIds && Array.isArray(study.assignedToIds) && study.assignedToIds.length > 0) {
      assignedIds = [...study.assignedToIds];
    }
    else if (study?.assignedDoctors && Array.isArray(study.assignedDoctors) && study.assignedDoctors.length > 0) {
      assignedIds = study.assignedDoctors.map(doc => doc.id).filter(Boolean);
    }
    else if (study?.assignment?.assignedToIds && Array.isArray(study.assignment.assignedToIds)) {
      assignedIds = [...study.assignment.assignedToIds];
    }
    else if (study?._raw?.assignment && Array.isArray(study._raw.assignment)) {
      const sortedAssignments = study._raw.assignment.sort((a, b) => 
        new Date(b.assignedAt) - new Date(a.assignedAt)
      );
      
      if (sortedAssignments.length > 0) {
        const latestAssignmentDate = sortedAssignments[0].assignedAt;
        const latestAssignments = sortedAssignments.filter(a => a.assignedAt === latestAssignmentDate);
        assignedIds = [...new Set(latestAssignments.map(a => a.assignedTo?.toString()).filter(Boolean))];
      }
    }
    else if (study?.assignment?.assignedToId) {
      assignedIds = [study.assignment.assignedToId.toString()];
    }
    
    setCurrentlyAssignedIds(assignedIds);
    setSelectedRadiologistIds(assignedIds);
  }, [study]);

  useEffect(() => {
    console.log('🔍 [MODAL] AssignmentModal mounted');
    console.log('📦 [MODAL] Received assignees:', {
      radiologists: availableAssignees?.radiologists?.length || 0,
      verifiers: availableAssignees?.verifiers?.length || 0
    });
    
    if (availableAssignees?.radiologists) {
      console.log('📋 [MODAL] Radiologist list:', 
        availableAssignees.radiologists.map(r => ({ 
          id: r._id, 
          name: r.fullName || r.email 
        }))
      );
    }
  }, [availableAssignees]);

  // ✅ FILTER RADIOLOGISTS BASED ON EXTERNAL SEARCH TERM
  const filteredRadiologists = useMemo(() => {
    if (!availableAssignees?.radiologists) {
      console.warn('⚠️ [MODAL] No radiologists in availableAssignees');
      return [];
    }
    
    console.log('🔍 [MODAL] Filtering radiologists...');
    console.log('📋 [MODAL] Total radiologists:', availableAssignees.radiologists.length);
    console.log('🔎 [MODAL] Search term:', searchTerm);
    
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      console.log('✅ [MODAL] No search term, returning all radiologists:', availableAssignees.radiologists.length);
      return availableAssignees.radiologists;
    }
    
    const filtered = availableAssignees.radiologists.filter(radiologist =>
      radiologist.email.toLowerCase().includes(term) ||
      radiologist.fullName?.toLowerCase().includes(term) ||
      (radiologist.firstName && radiologist.lastName && 
       `${radiologist.firstName} ${radiologist.lastName}`.toLowerCase().includes(term))
    );
    
    console.log('✅ [MODAL] Filtered radiologists:', filtered.length);
    return filtered;
  }, [availableAssignees?.radiologists, searchTerm]);

  // ✅ CLOSE MODAL WHEN CLICKING OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ✅ HANDLE ESC KEY
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  const handleSelectRadiologist = (radiologistId) => {
    setSelectedRadiologistIds(prev => {
      const newSelection = prev.includes(radiologistId)
        ? prev.filter(id => id !== radiologistId)
        : [...prev, radiologistId];
      return newSelection;
    });
  };

  const handleApplyAssignments = async () => {
    setLoading(true);
    try {
      const validPriority = study.priority === 'SELECT' ? 'NORMAL' : study.priority;
      
      await onSubmit({
        study,
        assignedToIds: selectedRadiologistIds,
        assigneeRole: 'radiologist',
        priority: validPriority || 'NORMAL',
        notes: `Assignment updated via modal - ${selectedRadiologistIds.length} radiologist(s) selected`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      
      onClose();
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const newAssignments = selectedRadiologistIds.filter(id => !currentlyAssignedIds.includes(id)).length;
  const removedAssignments = currentlyAssignedIds.filter(id => !selectedRadiologistIds.includes(id)).length;
  const unchangedAssignments = selectedRadiologistIds.filter(id => currentlyAssignedIds.includes(id)).length;

  return (
    <div 
      ref={modalRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl z-[9999]"
      style={{
        top: `${position?.top || 0}px`,
        left: `${position?.left || 0}px`,
        width: `${position?.width || 450}px`,
        maxWidth: '500px',
        maxHeight: '500px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4" />
          <div>
            <div className="text-sm font-semibold">Assign Radiologists</div>
            {searchTerm && (
              <div className="text-[10px] text-blue-100 mt-0.5">
                Searching: "{searchTerm}"
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-blue-800 rounded transition-colors"
          disabled={loading}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ✅ ASSIGNMENT STATUS */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="text-xs text-blue-700">
          <span className="font-medium">
            {selectedRadiologistIds.length === 0 
              ? 'No radiologists selected - study will be unassigned'
              : `${selectedRadiologistIds.length} radiologist(s) selected`
            }
          </span>
          
          {currentlyAssignedIds.length > 0 && (
            <div className="mt-1 text-[10px] text-blue-600">
              Currently: {study?.assignedDoctors?.map(doc => doc.name).join(', ') || `${currentlyAssignedIds.length} doctor(s)`}
            </div>
          )}
          
          {(newAssignments > 0 || removedAssignments > 0) && (
            <div className="mt-1 text-[10px] text-blue-600">
              {newAssignments > 0 && `+${newAssignments} new`}
              {newAssignments > 0 && removedAssignments > 0 && ', '}
              {removedAssignments > 0 && `-${removedAssignments} removed`}
              {unchangedAssignments > 0 && `, ${unchangedAssignments} unchanged`}
            </div>
          )}
        </div>
      </div>

      {/* ✅ SEARCH INFO - NO INPUT FIELD */}
      {searchTerm && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="text-xs text-gray-600">
            {filteredRadiologists.length === 0 ? (
              <span className="text-red-600">No radiologists match "{searchTerm}"</span>
            ) : (
              <span>
                Showing {filteredRadiologists.length} of {availableAssignees?.radiologists?.length} radiologists
              </span>
            )}
          </div>
        </div>
      )}

      {/* ✅ RADIOLOGIST LIST */}
      <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
        {filteredRadiologists.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <User className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {searchTerm ? `No radiologists match "${searchTerm}"` : 'No radiologists available'}
            </p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">Type in the table input to search</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRadiologists.map((radiologist) => {
              const isAssigned = currentlyAssignedIds.includes(radiologist._id?.toString());
              const isSelectedRadiologist = selectedRadiologistIds.includes(radiologist._id?.toString());
              const hasWorkload = radiologist.workload?.currentWorkload > 0;
              
              return (
                <div
                  key={radiologist._id}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelectedRadiologist ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  } ${isAssigned && !isSelectedRadiologist ? 'bg-yellow-50' : ''}`}
                  onClick={() => handleSelectRadiologist(radiologist._id.toString())}
                >
                  <input
                    type="checkbox"
                    checked={isSelectedRadiologist}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectRadiologist(radiologist._id.toString());
                    }}
                    className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isSelectedRadiologist ? 'bg-blue-500' : 
                        isAssigned ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div className={`text-sm font-medium truncate ${
                        isSelectedRadiologist ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {radiologist.fullName || radiologist.email}
                      </div>
                      {isAssigned && !isSelectedRadiologist && (
                        <span className="px-2 py-0.5 bg-yellow-600 text-white text-[10px] rounded-full font-medium">
                          REMOVING
                        </span>
                      )}
                      {isSelectedRadiologist && !isAssigned && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded-full font-medium">
                          ADDING
                        </span>
                      )}
                      {isSelectedRadiologist && isAssigned && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full font-medium">
                          KEEPING
                        </span>
                      )}
                    </div>
                    
                    {radiologist.email && radiologist.fullName && (
                      <div className={`text-xs pl-4 ${
                        isSelectedRadiologist ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {radiologist.email}
                      </div>
                    )}
                    
                    {hasWorkload && (
                      <div className={`text-[11px] pl-4 mt-1 ${
                        isSelectedRadiologist ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        <span className="font-medium">{radiologist.workload.currentWorkload}</span> active cases
                        {radiologist.workload.urgentCases > 0 && (
                          <span className="ml-2 text-red-600 font-medium">
                            • {radiologist.workload.urgentCases} urgent
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ FOOTER */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="text-xs text-gray-600 mb-3 text-center">
          {selectedRadiologistIds.length === 0 ? (
            'No radiologists selected - study will be unassigned'
          ) : (
            <>
              {selectedRadiologistIds.length} selected
              {newAssignments > 0 && ` • ${newAssignments} new`}
              {removedAssignments > 0 && ` • ${removedAssignments} to remove`}
            </>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleApplyAssignments}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Updating...' : 'Apply Changes'}
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AssignmentModal = (props) => {
  return createPortal(
    <AssignmentModalContent {...props} />,
    document.body
  );
};

export default AssignmentModal;