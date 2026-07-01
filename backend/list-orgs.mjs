import mongoose from 'mongoose';
const URI = 'mongodb://appuser:apppassword@206.189.133.52:27017/order2?authSource=admin&directConnection=true';
await mongoose.connect(URI, { directConnection: true, serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

// List all collections first
const collections = await db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name).join(', '));

const orgs = await db.collection('organisations').find({}).project({ name: 1, identifier: 1, status: 1, createdAt: 1 }).toArray();
console.log(`\nTotal orgs: ${orgs.length}`);
orgs.forEach(o => console.log(`  ${o._id} | "${o.identifier}" | ${o.name} | ${o.status}`));

await mongoose.disconnect();
