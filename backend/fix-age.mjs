/**
 * Fetch live DICOM tags from Orthanc for a study and patch age/gender
 * into both the Patient record and study.patientInfo.
 * Run: node fix-age.mjs
 */
import mongoose from 'mongoose';
import axios from 'axios';

const MONGODB_URI  = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
const BHARAT_PACS_ID = 'BP-DKV-LAB-MQCMKYWT-AXYQ';
const ORTHANC_URL  = 'http://206.189.133.52:8042';
const ORTHANC_AUTH = 'Basic ' + Buffer.from('alice:alicePassword').toString('base64');

// ── DICOM age helper ──────────────────────────────────────────
const parseDicomAge = (raw) => {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;
  // Format: 022Y / 006M / 012W / 003D
  const m = cleaned.match(/^(\d+)([YMWD])$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toUpperCase();
    const suffix = { Y: 'YRS', M: 'MON', W: 'WKS', D: 'DAYS' }[unit] || '';
    return `${n}${suffix}`;  // → "22YRS"
  }
  return cleaned; // return as-is if unknown format
};

await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB\n');
const db = mongoose.connection.db;

// ── 1. Fetch study from DB ────────────────────────────────────
const study = await db.collection('dicomstudies').findOne({ bharatPacsId: BHARAT_PACS_ID });
if (!study) { console.error('❌ Study not found'); process.exit(1); }

const orthancStudyId = study.orthancStudyID;
console.log(`📋 Orthanc Study ID : ${orthancStudyId}`);
console.log(`📋 Patient ref      : ${study.patient}`);

// ── 2. Get first instance ID from Orthanc ────────────────────
let tags = {};
try {
  const seriesRes = await axios.get(`${ORTHANC_URL}/studies/${orthancStudyId}/series`, {
    headers: { Authorization: ORTHANC_AUTH }, timeout: 10000
  });
  const firstInstance = seriesRes.data?.[0]?.Instances?.[0];
  if (!firstInstance) throw new Error('No instances found in Orthanc');

  console.log(`🔍 First instance   : ${firstInstance}`);

  const tagsRes = await axios.get(`${ORTHANC_URL}/instances/${firstInstance}/tags`, {
    headers: { Authorization: ORTHANC_AUTH }, timeout: 10000
  });
  const raw = tagsRes.data;

  // Extract the fields we care about
  tags.PatientAge       = raw['0010,1010']?.Value || '';
  tags.PatientSex       = raw['0010,0040']?.Value || '';
  tags.PatientBirthDate = raw['0010,0030']?.Value || '';
  tags.PatientName      = raw['0010,0010']?.Value || '';

  console.log('\n── Live DICOM tags from Orthanc ─────────────────────');
  console.log('  0010,1010 PatientAge      :', tags.PatientAge       || '(empty)');
  console.log('  0010,0040 PatientSex      :', tags.PatientSex       || '(empty)');
  console.log('  0010,0030 PatientBirthDate:', tags.PatientBirthDate || '(empty)');
  console.log('  0010,0010 PatientName     :', tags.PatientName      || '(empty)');

} catch (err) {
  console.error('❌ Orthanc fetch failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
}

// ── 3. Derive age string ──────────────────────────────────────
let ageString = parseDicomAge(tags.PatientAge);

// Fallback: calculate from DOB if age tag is missing
if (!ageString && tags.PatientBirthDate && tags.PatientBirthDate.length === 8) {
  const y = parseInt(tags.PatientBirthDate.slice(0, 4));
  const m = parseInt(tags.PatientBirthDate.slice(4, 6)) - 1;
  const d = parseInt(tags.PatientBirthDate.slice(6, 8));
  const dob = new Date(y, m, d);
  const now = new Date();
  const age = Math.floor((now - dob) / (365.25 * 24 * 60 * 60 * 1000));
  ageString = `${age}YRS`;
  console.log(`\n💡 Age calculated from DOB ${tags.PatientBirthDate}: ${ageString}`);
}

const gender = (tags.PatientSex || '').toUpperCase() || 'N/A';

console.log(`\n✏️  Will write → age: "${ageString || 'N/A'}"  gender: "${gender}"`);

if (!ageString) {
  console.log('\n⚠️  No age found in DICOM tags and no DOB to calculate from.');
  console.log('   The scanner did not embed PatientAge in this study.');
  await mongoose.disconnect();
  process.exit(0);
}

// ── 4. Patch Patient record ───────────────────────────────────
const patResult = await db.collection('patients').updateOne(
  { _id: study.patient },
  { $set: { ageString, gender: tags.PatientSex || '', updatedAt: new Date() } }
);
console.log(`\n✅ Patient updated  : matchedCount=${patResult.matchedCount}  modifiedCount=${patResult.modifiedCount}`);

// ── 5. Patch study.patientInfo ────────────────────────────────
const studyResult = await db.collection('dicomstudies').updateOne(
  { _id: study._id },
  { $set: {
      'patientInfo.age':    ageString,
      'patientInfo.gender': gender,
      age:    ageString,
      gender: gender,
      updatedAt: new Date()
  }}
);
console.log(`✅ Study updated    : matchedCount=${studyResult.matchedCount}  modifiedCount=${studyResult.modifiedCount}`);

// ── 6. Verify ─────────────────────────────────────────────────
const updated = await db.collection('dicomstudies').findOne(
  { _id: study._id },
  { projection: { patientInfo: 1, age: 1, gender: 1 } }
);
console.log('\n── Verified patientInfo ─────────────────────────────');
console.log(JSON.stringify(updated.patientInfo, null, 2));
console.log('  study.age   :', updated.age);
console.log('  study.gender:', updated.gender);

await mongoose.disconnect();
console.log('\n✅ Done — refresh the worklist to see the updated age.');
