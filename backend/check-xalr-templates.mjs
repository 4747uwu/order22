import mongoose from 'mongoose';

const URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
await mongoose.connect(URI, { directConnection: true, serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

const org = await db.collection('organizations').findOne({ identifier: 'XALR' });
console.log(`Org: ${org.name} (${org.identifier}) | status: ${org.status}\n`);

// Templates by organizationIdentifier string (how templates are scoped)
const allTemplates = await db.collection('htmltemplates')
  .find({ organizationIdentifier: 'XALR' })
  .project({ title: 1, category: 1, templateScope: 1, isActive: 1, createdAt: 1, assignedDoctor: 1 })
  .toArray();

console.log(`📄 TEMPLATES for XALR (${allTemplates.length} total):`);
if (allTemplates.length === 0) {
  console.log('   No templates found with organizationIdentifier: XALR');
} else {
  const active   = allTemplates.filter(t => t.isActive);
  const inactive = allTemplates.filter(t => !t.isActive);
  console.log(`   Active: ${active.length}  |  Inactive: ${inactive.length}`);
  allTemplates.forEach(t => {
    console.log(`  [${t.isActive ? 'ACTIVE  ' : 'INACTIVE'}] "${t.title}" | ${t.category} | ${t.templateScope} | created: ${t.createdAt?.toISOString?.().slice(0,10)}`);
  });
}

// Also check super_global templates (cross-org, not scoped to XALR)
const superGlobal = await db.collection('htmltemplates')
  .find({ templateScope: 'super_global' })
  .project({ title: 1, category: 1, isActive: 1, organizationIdentifier: 1 })
  .toArray();
console.log(`\n🌐 SUPER_GLOBAL templates (visible to all orgs): ${superGlobal.length}`);
superGlobal.forEach(t => {
  console.log(`  [${t.isActive ? 'ACTIVE  ' : 'INACTIVE'}] "${t.title}" | ${t.category}`);
});

await mongoose.disconnect();
console.log('\n✅ Done');
