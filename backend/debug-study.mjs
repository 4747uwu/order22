/**
 * Debug script — fetch full study by bharatPacsId and show all age/patient fields
 * Run: node debug-study.mjs
 */
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
const BHARAT_PACS_ID = 'BP-DKV-LAB-MQCMKYWT-AXYQ';

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB\n');

// Use a raw collection query so we don't need the full model
const db = mongoose.connection.db;
const study = await db.collection('dicomstudies').findOne({ bharatPacsId: BHARAT_PACS_ID });

if (!study) {
  console.error(`❌ No study found with bharatPacsId: ${BHARAT_PACS_ID}`);
  await mongoose.disconnect();
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════');
console.log(`STUDY: ${BHARAT_PACS_ID}`);
console.log('═══════════════════════════════════════════════════════');

// ── Core IDs ──────────────────────────────────────────────────
console.log('\n── Core IDs ─────────────────────────────────────────');
console.log('  _id              :', study._id);
console.log('  bharatPacsId     :', study.bharatPacsId);
console.log('  studyInstanceUID :', study.studyInstanceUID);
console.log('  orthancStudyID   :', study.orthancStudyID);
console.log('  accessionNumber  :', study.accessionNumber);

// ── Patient Info (embedded) ───────────────────────────────────
console.log('\n── patientInfo (embedded in study) ──────────────────');
console.log(JSON.stringify(study.patientInfo, null, 2));

// ── Study-level fields ───────────────────────────────────────
console.log('\n── Study-level fields ───────────────────────────────');
console.log('  studyDate        :', study.studyDate);
console.log('  examDescription  :', study.examDescription);
console.log('  modalitiesInStudy:', study.modalitiesInStudy);
console.log('  institutionName  :', study.institutionName);
console.log('  workflowStatus   :', study.workflowStatus);
console.log('  seriesCount      :', study.seriesCount);
console.log('  instanceCount    :', study.instanceCount);

// ── Organization / Lab ───────────────────────────────────────
console.log('\n── Organization / Lab ───────────────────────────────');
console.log('  organizationIdentifier:', study.organizationIdentifier);
console.log('  labLocation           :', study.labLocation);
console.log('  centerName            :', study.centerName);

// ── Patient record (ref) ──────────────────────────────────────
if (study.patient) {
  const patient = await db.collection('patients').findOne({ _id: study.patient });
  if (patient) {
    console.log('\n── Patient record (from patients collection) ────────');
    console.log('  _id            :', patient._id);
    console.log('  mrn            :', patient.mrn);
    console.log('  patientID      :', patient.patientID);
    console.log('  patientNameRaw :', patient.patientNameRaw);
    console.log('  firstName      :', patient.firstName);
    console.log('  lastName       :', patient.lastName);
    console.log('  ageString      :', patient.ageString);
    console.log('  age            :', patient.age);
    console.log('  gender         :', patient.gender);
    console.log('  dateOfBirth    :', patient.dateOfBirth);
    console.log('  computed       :', JSON.stringify(patient.computed, null, 2));
  } else {
    console.log('\n⚠️  Patient ref exists but no patient document found! patient._id =', study.patient);
  }
}

// ── Raw DICOM tags stored on study ───────────────────────────
console.log('\n── Raw storageInfo ──────────────────────────────────');
console.log(JSON.stringify(study.storageInfo, null, 2));

// ── Full dump of top-level keys ───────────────────────────────
console.log('\n── All top-level keys in study doc ──────────────────');
console.log(Object.keys(study).join(', '));

await mongoose.disconnect();
console.log('\n✅ Done.');
