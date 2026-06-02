import api from '../services/api';

/**
 * Calculate if a study is older than specified days
 * @param {Date|string} studyDate - Study date
 * @param {number} days - Number of days threshold (default 10)
 * @returns {boolean}
 */
export const isStudyOlderThan = (studyDate, days = 10) => { // ✅ Changed back to 10 days
  if (!studyDate) return false;
  
  const studyDateTime = new Date(studyDate);
  const now = new Date();
  const diffTime = now - studyDateTime;
  const diffDays = diffTime / (1000 * 60 * 60 * 24); // ✅ Changed back to days
  
  console.log(`🕐 [Backup Test] Study age: ${diffDays.toFixed(2)} days (threshold: ${days} days)`);
  
  return diffDays >= days; // ✅ Compare days instead of hours
};

/**
 * Check if study needs restoration and restore if necessary
 * @param {Object} study - Study object with studyDate and _id
 * @param {Object} options - Options for restore operation
 * @returns {Promise<{needsRestore: boolean, restored: boolean, error?: string}>}
 */
export const checkAndRestoreStudy = async (study, options = {}) => {
  const {
    daysThreshold = 10,
    showNotifications = true,
    onProgress = null,
    forceRestore = false, // skip age check when caller already confirmed study is missing
  } = options;

  try {
    const needsRestore = forceRestore || isStudyOlderThan(study.studyDate, daysThreshold);

    if (!needsRestore) {
      console.log(`✅ Study ${study.bharatPacsId || study._id} is recent, no restore needed`);
      return { needsRestore: false, restored: false };
    }

    console.log(`🔄 Study ${study.bharatPacsId || study._id} is ${daysThreshold}+ days old, restoring...`);
    
    if (onProgress) onProgress('Checking backup availability...');

    // Call backend to restore study
    const response = await api.post('/backup/restore', {
      studyId: study._id
    });

    if (response.data.success) {
      console.log(`✅ Study restored successfully:`, response.data);
      
      if (showNotifications && window.toast) {
        window.toast.success(`Study restored from backup (${response.data.fileSizeMB}MB)`);
      }

      if (onProgress) onProgress('Study restored successfully');

      return {
        needsRestore: true,
        restored: true,
        data: response.data
      };
    } else {
      throw new Error(response.data.error || 'Restore failed');
    }

  } catch (error) {
    console.error('❌ Error in checkAndRestoreStudy:', error);
    
    const errorMsg = error.response?.data?.error || error.message;
    
    if (showNotifications && window.toast) {
      window.toast.error(`Failed to restore study: ${errorMsg}`);
    }

    return {
      needsRestore: true,
      restored: false,
      error: errorMsg
    };
  }
};

/**
 * Wrapper for navigate with restore check
 * @param {Function} navigate - React Router navigate function
 * @param {string} path - Path to navigate to
 * @param {Object} study - Study object
 * @param {Object} options - Navigation and restore options
 */
export const navigateWithRestore = async (navigate, path, study, options = {}) => {
  const {
    state = {},
    daysThreshold = 10, // ✅ Changed back to 10 days default
    forceRestore = false,
    onRestoreStart = null,
    onRestoreComplete = null,
    onRestoreError = null
  } = options;

  try {
    // Check if study needs restoration
    const needsRestore = forceRestore || isStudyOlderThan(study.studyDate, daysThreshold);
    
    if (needsRestore) {
      console.log(`🔄 Study needs restore, initiating...`);
      
      if (onRestoreStart) onRestoreStart(study);

      // Show loading indicator
      if (window.toast) {
        window.toast.info('Restoring study from backup, please wait...');
      }

      // Restore the study
      const result = await checkAndRestoreStudy(study, {
        daysThreshold,
        showNotifications: true,
        onProgress: (msg) => console.log(`📊 Restore Progress: ${msg}`)
      });

      if (!result.restored && result.error) {
        if (onRestoreError) onRestoreError(result.error);
        
        // Still navigate but with warning
        console.warn('⚠️ Restore failed, navigating anyway:', result.error);
        if (window.toast) {
          window.toast.warning('Could not restore study, opening existing version');
        }
      } else if (result.restored) {
        if (onRestoreComplete) onRestoreComplete(result.data);
        
        // Wait 2 seconds after successful restore
        console.log('⏳ Waiting 2 seconds after restore...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Navigate to the path
    console.log(`🚀 Navigating to: ${path}`);
    navigate(path, { state: { ...state, study } });

  } catch (error) {
    console.error('❌ Error in navigateWithRestore:', error);
    
    if (onRestoreError) onRestoreError(error.message);
    
    // Navigate anyway on error
    console.warn('⚠️ Error during restore, navigating anyway');
    navigate(path, { state: { ...state, study } });
  }
};

/**
 * Batch check multiple studies for restoration needs
 * @param {Array} studies - Array of study objects
 * @param {number} daysThreshold - Days threshold
 * @returns {Array} Studies that need restoration
 */
export const getStudiesNeedingRestore = (studies, daysThreshold = 10) => {
  if (!Array.isArray(studies)) return [];
  
  return studies.filter(study => isStudyOlderThan(study.studyDate, daysThreshold));
};

/**
 * Determine the open strategy for a study based on its calendar date.
 *
 * - 'today'   : study date is the current calendar day → open directly, no checks
 * - 'check'   : study is 1 or 2 calendar days old → ask Orthanc first, restore only if missing
 * - 'restore' : study is 10+ calendar days old → restore immediately (existing behaviour)
 * - 'pass'    : study is 3–9 calendar days old → open directly
 */
export const getStudyOpenStrategy = (studyDate) => {
  if (!studyDate) {
    console.log('🔍 [Strategy] No studyDate → check');
    return 'check';
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sd = new Date(studyDate);
  const studyMidnight = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());

  const diffDays = Math.round((todayMidnight - studyMidnight) / (1000 * 60 * 60 * 24));

  // 0-1 days old → open directly; 2+ days old → check Orthanc first, restore only if missing
  const strategy = diffDays <= 1 ? 'today' : 'check';

  console.log(`🔍 [Strategy] studyDate=${studyDate} | parsed=${sd.toISOString()} | diffDays=${diffDays} | strategy=${strategy}`);
  return strategy;
};

/**
 * Ask the backend whether a study is currently present on its Orthanc instance.
 * Returns true if available, false if missing or on error (triggers restore on false).
 */
export const checkOrthancAvailability = async (studyId) => {
  console.log(`📡 [AvailabilityCheck] Sending request for studyId=${studyId}`);
  try {
    const response = await api.get(`/backup/check-availability/${studyId}`);
    console.log(`📡 [AvailabilityCheck] Response:`, response.data);
    return response.data.available === true;
  } catch (error) {
    console.error('❌ [AvailabilityCheck] Request failed:', error);
    return false;
  }
};

export default {
  isStudyOlderThan,
  checkAndRestoreStudy,
  navigateWithRestore,
  getStudiesNeedingRestore,
  getStudyOpenStrategy,
  checkOrthancAvailability,
};