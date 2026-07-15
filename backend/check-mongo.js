const mongoose = require('mongoose');
require('dotenv').config({ path: 'C:\\Users\\rahul\\Desktop\\freelancerRRR\\backend\\.env' });

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  const V = mongoose.connection.collection('vouchers');
  const L = mongoose.connection.collection('ledgers');
  const C = mongoose.connection.collection('companies');

  const vCount = await V.countDocuments({ companyId: 'cmp_atul' });
  const lCount = await L.countDocuments({ companyId: 'cmp_atul' });
  const comp   = await C.findOne({ companyId: 'cmp_atul' });
  const latest = await V.find({ companyId: 'cmp_atul' }).sort({ date: -1 }).limit(5).toArray();

  console.log('=== MongoDB Reality Check ===');
  console.log('Total vouchers :', vCount);
  console.log('Total ledgers  :', lCount);
  console.log('lastSyncAt     :', comp && comp.lastSyncAt);
  console.log('Latest 5 vouchers:');
  latest.forEach(v => console.log(' -', v.voucherType, '|', new Date(v.date).toDateString(), '|', v.amount));

  const fy2425 = await V.countDocuments({ companyId: 'cmp_atul', date: { $gte: new Date('2024-04-01'), $lte: new Date('2025-03-31') } });
  const fy2526 = await V.countDocuments({ companyId: 'cmp_atul', date: { $gte: new Date('2025-04-01'), $lte: new Date('2026-03-31') } });
  const fy2627 = await V.countDocuments({ companyId: 'cmp_atul', date: { $gte: new Date('2026-04-01'), $lte: new Date('2027-03-31') } });

  console.log('\nVouchers in FY 2024-25:', fy2425);
  console.log('Vouchers in FY 2025-26:', fy2526);
  console.log('Vouchers in FY 2026-27:', fy2627);

  process.exit(0);
}).catch(e => { console.error('DB Error:', e.message); process.exit(1); });
