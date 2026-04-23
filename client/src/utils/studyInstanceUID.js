// Strip the `_COPY_<timestamp>` suffix that studyCopy.controller.js appends
// to the studyInstanceUID when a study is copied to another org.
// The OHIF viewer only accepts the raw DICOM UID, so any URL built from the
// stored value must be cleaned first.
//
// Examples:
//   "1.2.840.113619.2.415.3.2831185409.81.1776781197.679_COPY_1776892191157"
//     → "1.2.840.113619.2.415.3.2831185409.81.1776781197.679"
//   "1.2.840.113619.2.415.3.2831185409.81.1776781197.679"
//     → "1.2.840.113619.2.415.3.2831185409.81.1776781197.679"  (unchanged)
//   null / undefined / non-string → returned as-is
export const sanitizeStudyInstanceUID = (uid) => {
  if (!uid) return uid;
  if (Array.isArray(uid)) return uid.map(sanitizeStudyInstanceUID);
  if (typeof uid !== 'string') return uid;
  // Match _COPY_<digits> at the end (case-insensitive, tolerates multiple copies)
  return uid.replace(/(_COPY_\d+)+$/i, '');
};

export default sanitizeStudyInstanceUID;
