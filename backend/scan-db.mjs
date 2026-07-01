/**
 * Full DB scan — counts active vs inactive across every org and every collection.
 */
import mongoose from 'mongoose';

const URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
await mongoose.connect(URI, { directConnection: true, serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

const line = (char = '─', len = 70) => console.log(char.repeat(len));

// ── 0. Collections overview ───────────────────────────────────────────────────
const cols = await db.listCollections().toArray();
console.log('\n📦 COLLECTIONS IN DATABASE:');
for (const c of cols) {
  const count = await db.collection(c.name).countDocuments();
  console.log(`  ${c.name.padEnd(30)} ${count} docs`);
}

// ── 1. Organizations ──────────────────────────────────────────────────────────
line('═');
const orgs = await db.collection('organizations').find({}).toArray();
console.log(`\n🏢 ORGANIZATIONS (${orgs.length} total)`);
line();

for (const org of orgs) {
  const id = org._id;
  const ident = org.identifier || '—';

  const [
    usersActive, usersInactive,
    labsActive, labsInactive,
    doctorsActive, doctorsInactive,
    studies, patients,
    templatesActive, templatesInactive,
    reports
  ] = await Promise.all([
    db.collection('users').countDocuments({ organization: id, isActive: true }),
    db.collection('users').countDocuments({ organization: id, isActive: false }),
    db.collection('labs').countDocuments({ organization: id, isActive: true }),
    db.collection('labs').countDocuments({ organization: id, isActive: false }),
    db.collection('doctors').countDocuments({ organization: id, isActiveProfile: true }),
    db.collection('doctors').countDocuments({ organization: id, isActiveProfile: false }),
    db.collection('dicomstudies').countDocuments({ organization: id }),
    db.collection('patients').countDocuments({ organization: id }),
    db.collection('htmltemplates').countDocuments({ organizationIdentifier: ident, isActive: true }),
    db.collection('htmltemplates').countDocuments({ organizationIdentifier: ident, isActive: false }),
    db.collection('reports').countDocuments({ organization: id }),
  ]);

  const orgStatus = org.status === 'active' ? '✅' : '❌';
  console.log(`\n${orgStatus} ${org.name} (${ident}) — org status: ${org.status}`);
  console.log(`   _id: ${id}`);

  const warn = (active, inactive, label) => {
    const flag = inactive > 0 ? ' ⚠️  HAS INACTIVE' : '';
    console.log(`   ${label.padEnd(12)}: ${active} active, ${inactive} inactive${flag}`);
  };

  warn(usersActive,   usersInactive,   'Users');
  warn(labsActive,    labsInactive,    'Labs');
  warn(doctorsActive, doctorsInactive, 'Doctors');
  warn(templatesActive, templatesInactive, 'Templates');
  console.log(`   ${'Studies'.padEnd(12)}: ${studies}`);
  console.log(`   ${'Patients'.padEnd(12)}: ${patients}`);
  console.log(`   ${'Reports'.padEnd(12)}: ${reports}`);
}

// ── 2. Orphan check — docs with no matching org ───────────────────────────────
line('═');
console.log('\n🔍 ORPHAN CHECK (docs whose organization ref points to a non-existent org)');
line();

const orgIds = orgs.map(o => o._id.toString());

const checkOrphans = async (collection, field) => {
  const docs = await db.collection(collection).find({}, { projection: { [field]: 1 } }).toArray();
  const orphans = docs.filter(d => d[field] && !orgIds.includes(d[field].toString()));
  console.log(`  ${collection.padEnd(20)} ${orphans.length} orphan(s)`);
  if (orphans.length > 0 && orphans.length <= 5) {
    orphans.forEach(o => console.log(`    → ${o._id} (org ref: ${o[field]})`));
  }
};

await checkOrphans('users',       'organization');
await checkOrphans('labs',        'organization');
await checkOrphans('doctors',     'organization');
await checkOrphans('patients',    'organization');
await checkOrphans('dicomstudies','organization');
await checkOrphans('reports',     'organization');

// ── 3. Super-global templates ─────────────────────────────────────────────────
line('═');
const sgTemplates = await db.collection('htmltemplates')
  .find({ templateScope: 'super_global' })
  .project({ title: 1, category: 1, isActive: 1 })
  .toArray();
console.log(`\n🌐 SUPER_GLOBAL TEMPLATES (${sgTemplates.length})`);
sgTemplates.forEach(t => console.log(`  [${t.isActive ? 'ACTIVE' : 'INACTIVE'}] ${t.title} | ${t.category}`));

// ── 4. Quick summary ──────────────────────────────────────────────────────────
line('═');
console.log('\n📊 TOTALS ACROSS ALL COLLECTIONS:');
for (const c of cols) {
  const total = await db.collection(c.name).countDocuments();
  console.log(`  ${c.name.padEnd(30)} ${total}`);
}

line('═');
await mongoose.disconnect();
console.log('\n✅ Scan complete');
