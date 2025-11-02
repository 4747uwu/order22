import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User } from 'lucide-react';

const AssignmentModalContent = ({ 
  study, 
  availableAssignees, 
  onSubmit, 
  onClose, 
  position
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRadiologistIds, setSelectedRadiologistIds] = useState([]);
  const [currentlyAssignedIds, setCurrentlyAssignedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  // ✅ FIXED: Extract currently assigned IDs from study - multiple methods
  useEffect(() => {
    let assignedIds = [];
    
    console.log('🔍 EXTRACTING ASSIGNMENTS FROM STUDY:', {
      studyId: study?._id,
      assignedToIds: study?.assignedToIds,
      assignedDoctors: study?.assignedDoctors,
      assignmentData: study?.assignment,
      rawAssignment: study?._raw?.assignment
    });
    
    // ✅ Method 1: From formatted assignedToIds (PREFERRED - this should work)
    if (study?.assignedToIds && Array.isArray(study.assignedToIds) && study.assignedToIds.length > 0) {
      assignedIds = [...study.assignedToIds];
      console.log('✅ Method 1 - Found IDs from formatted assignedToIds:', assignedIds);
    }
    
    // ✅ Method 2: From assignedDoctors array
    else if (study?.assignedDoctors && Array.isArray(study.assignedDoctors) && study.assignedDoctors.length > 0) {
      assignedIds = study.assignedDoctors.map(doc => doc.id).filter(Boolean);
      console.log('✅ Method 2 - Found IDs from assignedDoctors:', assignedIds);
    }
    
    // ✅ Method 3: From assignment object (formatted assignment)
    else if (study?.assignment?.assignedToIds && Array.isArray(study.assignment.assignedToIds)) {
      assignedIds = [...study.assignment.assignedToIds];
      console.log('✅ Method 3 - Found IDs from assignment.assignedToIds:', assignedIds);
    }
    
    // ✅ Method 4: From raw assignment array (fallback)
    else if (study?._raw?.assignment && Array.isArray(study._raw.assignment)) {
      // Get the most recent assignments (same timestamp)
      const sortedAssignments = study._raw.assignment.sort((a, b) => 
        new Date(b.assignedAt) - new Date(a.assignedAt)
      );
      
      if (sortedAssignments.length > 0) {
        const latestAssignmentDate = sortedAssignments[0].assignedAt;
        const latestAssignments = sortedAssignments.filter(a => a.assignedAt === latestAssignmentDate);
        assignedIds = [...new Set(latestAssignments.map(a => a.assignedTo?.toString()).filter(Boolean))];
        console.log('✅ Method 4 - Found IDs from raw assignment array:', assignedIds);
      }
    }
    
    // ✅ Method 5: Single assignment (legacy format)
    else if (study?.assignment?.assignedToId) {
      assignedIds = [study.assignment.assignedToId.toString()];
      console.log('✅ Method 5 - Found ID from single assignment:', assignedIds);
    }
    
    setCurrentlyAssignedIds(assignedIds);
    setSelectedRadiologistIds(assignedIds); // Pre-select currently assigned
    
    console.log('🔧 FINAL ASSIGNMENT STATE:', {
      currentlyAssignedIds: assignedIds,
      selectedRadiologistIds: assignedIds,
      count: assignedIds.length
    });
  }, [study]);

  // Filter radiologists based on search
  const filteredRadiologists = useMemo(() => {
    if (!availableAssignees?.radiologists) return [];
    
    return availableAssignees.radiologists.filter(radiologist =>
      radiologist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      radiologist.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableAssignees?.radiologists, searchTerm]);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  // ✅ CHECKBOX SELECTION HANDLER
  const handleSelectRadiologist = (radiologistId) => {
    console.log('🔄 SELECTING RADIOLOGIST:', radiologistId);
    setSelectedRadiologistIds(prev => {
      const newSelection = prev.includes(radiologistId)
        ? prev.filter(id => id !== radiologistId)
        : [...prev, radiologistId];
      console.log('📋 NEW SELECTION:', newSelection);
      return newSelection;
    });
  };

  // ✅ SINGLE ASSIGNMENT FUNCTION - CLEAR & REASSIGN
  const handleApplyAssignments = async () => {
    setLoading(true);
    try {
      const validPriority = study.priority === 'SELECT' ? 'NORMAL' : study.priority;
      
      console.log('🔄 Applying assignments:', {
        studyId: study._id,
        selectedIds: selectedRadiologistIds,
        currentIds: currentlyAssignedIds
      });
      
      // ✅ CALL SINGLE BACKEND FUNCTION WITH SELECTED IDS
      await onSubmit({
        study,
        assignedToIds: selectedRadiologistIds, // Send all selected IDs
        assigneeRole: 'radiologist',
        priority: validPriority || 'NORMAL',
        notes: `Assignment updated via modal - ${selectedRadiologistIds.length} radiologist(s) selected`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      
      onClose();
    } catch (error) {
      console.error('Assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CHECK IF RADIOLOGIST IS CURRENTLY ASSIGNED
  const isCurrentlyAssigned = (radiologist) => {
    const isAssigned = currentlyAssignedIds.includes(radiologist._id?.toString());
    console.log(`🔍 isCurrentlyAssigned(${radiologist._id}):`, isAssigned);
    return isAssigned;
  };

  // ✅ CHECK IF RADIOLOGIST IS SELECTED
  const isSelected = (radiologist) => {
    const selected = selectedRadiologistIds.includes(radiologist._id?.toString());
    console.log(`🔍 isSelected(${radiologist._id}):`, selected);
    return selected;
  };

  // Calculate changes for display
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
        width: `${Math.max(position?.width || 400, 400)}px`,
        maxWidth: '500px',
        maxHeight: '600px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">
            Assign Radiologists
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          disabled={loading}
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ✅ ASSIGNMENT STATUS */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="text-xs text-blue-700">
          <span className="font-medium">
            {selectedRadiologistIds.length === 0 
              ? 'No radiologists selected - study will be unassigned'
              : `${selectedRadiologistIds.length} radiologist(s) will be assigned`
            }
          </span>
          
          {/* ✅ SHOW CURRENT ASSIGNMENTS */}
          {currentlyAssignedIds.length > 0 && (
            <div className="mt-1 text-[10px] text-blue-600">
              Currently assigned to: {study?.assignedDoctors?.map(doc => doc.name).join(', ') || `${currentlyAssignedIds.length} doctor(s)`}
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

      
      {/* Search */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search radiologists by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            disabled={loading}
          />
        </div>
      </div>

      {/* ✅ RADIOLOGIST LIST WITH CHECKBOXES */}
      <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
        {filteredRadiologists.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <User className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">No radiologists found</p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRadiologists.map((radiologist) => {
              const isAssigned = isCurrentlyAssigned(radiologist);
              const isSelectedRadiologist = isSelected(radiologist);
              const hasWorkload = radiologist.workload?.currentWorkload > 0;
              
              console.log(`🔍 RENDERING RADIOLOGIST ${radiologist._id}:`, {
                email: radiologist.email,
                isAssigned,
                isSelectedRadiologist,
                currentlyAssignedIds,
                selectedRadiologistIds
              });
              
              return (
                <div
                  key={radiologist._id}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelectedRadiologist ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  } ${isAssigned && !isSelectedRadiologist ? 'bg-yellow-50' : ''}`}
                  onClick={() => handleSelectRadiologist(radiologist._id.toString())}
                >
                  {/* ✅ CHECKBOX */}
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
                        {radiologist.email}
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
                    
                    {radiologist.fullName && (
                      <div className={`text-xs pl-4 ${
                        isSelectedRadiologist ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {radiologist.fullName}
                      </div>
                    )}
                    
                    {/* Workload indicator */}
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

      {/* ✅ FOOTER WITH SINGLE ACTION BUTTON */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {/* Status Info */}
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
        
        {/* ✅ SINGLE ACTION BUTTON */}
        <div className="flex space-x-2">
          <button
            onClick={handleApplyAssignments}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Updating Assignments...' : 'Apply Assignment Changes'}
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ MAIN COMPONENT WITH PORTAL
const AssignmentModal = (props) => {
  return createPortal(
    <AssignmentModalContent {...props} />,
    document.body
  );
};

export default AssignmentModal;