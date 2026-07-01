/**
 * Fix: reactivate all users, labs, and doctors for the XALR (TELEPLUS) org
 * that were deactivated by a soft-delete that was later reversed.
 *
 * Run: node fix-xalr-users.mjs
 */

import mongoose from 'mongoose';

const URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
await mongoose.connect(URI, { directConnection: true, serverSelectionTimeoutMS: 8000 });
console.log('✅ Connected\n');

const db = mongoose.connection.db;

// Find the org
const org = await db.collection('organizations').findOne({ identifier: 'XALR' });
if (!org) { console.error('❌ Org XALR not found'); process.exit(1); }
console.log(`Org: ${org.name} (${org._id})\n`);

const orgId = org._id;

// Reactivate users
const userResult = await db.collection('users').updateMany(
  { organization: orgId, isActive: false },
  { $set: { isActive: true } }
);
console.log(`👤 Users reactivated : ${userResult.modifiedCount}`);

// Reactivate labs
const labResult = await db.collection('labs').updateMany(
  { organization: orgId, isActive: false },
  { $set: { isActive: true } }
);
console.log(`🏥 Labs reactivated  : ${labResult.modifiedCount}`);

// Reactivate doctors
const doctorResult = await db.collection('doctors').updateMany(
  { organization: orgId, isActiveProfile: false },
  { $set: { isActiveProfile: true } }
);
console.log(`👨‍⚕️  Doctors reactivated: ${doctorResult.modifiedCount}`);

// Confirm final state
const users = await db.collection('users').find({ organization: orgId }).project({ fullName: 1, email: 1, role: 1, isActive: 1 }).toArray();
console.log('\n── Final user list ──────────────────────────────────');
users.forEach(u => console.log(`  [${u.isActive ? 'ACTIVE' : 'INACTIVE'}] ${u.fullName} | ${u.email} | ${u.role}`));

await mongoose.disconnect();
console.log('\n✅ Done');
