/**
 * Diagnostic: pull all users, labs, doctors, and studies for an org by identifier.
 * Usage: node check-org-users.mjs [ORG_IDENTIFIER]
 * Default org: XALR
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
const TARGET_IDENTIFIER = process.argv[2] || 'XALR';

await mongoose.connect(MONGODB_URI, { directConnection: true, serverSelectionTimeoutMS: 8000 });
console.log('✅ Connected to MongoDB\n');

const db = mongoose.connection.db;

// ── 1. Find the organisation ──────────────────────────────────────────────────
const org = await db.collection('organizations').findOne({
  identifier: { $regex: new RegExp(`^${TARGET_IDENTIFIER}$`, 'i') }
});

if (!org) {
  console.error(`❌ No organisation found with identifier: ${TARGET_IDENTIFIER}`);
  await mongoose.disconnect();
  process.exit(1);
}

console.log('='.repeat(60));
console.log(`ORG: ${org.name}  (${org.identifier})`);
console.log(`  _id    : ${org._id}`);
console.log(`  status : ${org.status}`);
console.log(`  created: ${org.createdAt}`);
console.log('='.repeat(60));

const orgId = org._id;

// ── 2. Users ──────────────────────────────────────────────────────────────────
const users = await db.collection('users')
  .find({ organization: orgId })
  .project({ fullName: 1, email: 1, username: 1, role: 1, isActive: 1, createdAt: 1 })
  .toArray();

console.log(`\n👤 USERS (${users.length} total):`);
if (users.length === 0) {
  console.log('   ⚠️  No users found for this org ID.');
} else {
  users.forEach(u => {
    console.log(`  [${u.isActive ? 'ACTIVE' : 'INACTIVE'}] ${u.fullName || '—'} | ${u.email} | role: ${u.role} | created: ${u.createdAt?.toISOString?.() ?? '?'}`);
  });
}

// Also search by organizationIdentifier string (in case org ref is stored differently)
const usersByIdentifier = await db.collection('users')
  .find({ organizationIdentifier: TARGET_IDENTIFIER })
  .project({ fullName: 1, email: 1, role: 1, isActive: 1, organization: 1 })
  .toArray();

if (usersByIdentifier.length !== users.length) {
  console.log(`\n  ⚠️  By organizationIdentifier string "${TARGET_IDENTIFIER}": ${usersByIdentifier.length} users`);
  usersByIdentifier.forEach(u => {
    console.log(`    ${u.fullName} | ${u.email} | org ref: ${u.organization}`);
  });
}

// ── 3. Labs ───────────────────────────────────────────────────────────────────
const labs = await db.collection('labs')
  .find({ organization: orgId })
  .project({ name: 1, identifier: 1, isActive: 1, createdAt: 1 })
  .toArray();

console.log(`\n🏥 LABS (${labs.length} total):`);
labs.forEach(l => {
  console.log(`  [${l.isActive ? 'ACTIVE' : 'INACTIVE'}] ${l.name} (${l.identifier}) | created: ${l.createdAt?.toISOString?.() ?? '?'}`);
});

// ── 4. Doctors ────────────────────────────────────────────────────────────────
const doctors = await db.collection('doctors')
  .find({ organization: orgId })
  .project({ fullName: 1, email: 1, isActiveProfile: 1, createdAt: 1 })
  .toArray();

console.log(`\n👨‍⚕️  DOCTORS (${doctors.length} total):`);
doctors.forEach(d => {
  console.log(`  [${d.isActiveProfile ? 'ACTIVE' : 'INACTIVE'}] ${d.fullName} | ${d.email}`);
});

// ── 5. Study count ────────────────────────────────────────────────────────────
const studyCount = await db.collection('dicomstudies').countDocuments({ organization: orgId });
const studyCountByIdentifier = await db.collection('dicomstudies').countDocuments({ organizationIdentifier: TARGET_IDENTIFIER });

console.log(`\n📂 STUDIES: ${studyCount} (by org ObjectId) | ${studyCountByIdentifier} (by identifier string)`);

// ── 6. Check for orphaned users (matching identifier but wrong org ref) ───────
const allUsersByName = await db.collection('users')
  .find({ fullName: { $regex: /./i } })
  .project({ fullName: 1, email: 1, organization: 1, organizationIdentifier: 1, role: 1, isActive: 1 })
  .limit(5)
  .toArray();

console.log('\n🔍 SAMPLE of all users in DB (first 5, any org):');
allUsersByName.forEach(u => {
  console.log(`  ${u.fullName} | ${u.email} | orgId: ${u.organization} | orgIdentifier: ${u.organizationIdentifier}`);
});

console.log('\n' + '='.repeat(60));
await mongoose.disconnect();
console.log('✅ Done');
