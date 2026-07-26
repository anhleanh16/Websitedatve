import { db } from '../config/db.js';

try {
  await db.query(
    'ALTER TABLE Orders ADD COLUMN zalopay_trans_id VARCHAR(100) NULL DEFAULT NULL'
  );
  console.log('✅ Column zalopay_trans_id added to Orders');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('ℹ️  Column already exists, skipped.');
  } else {
    console.error('Error:', e.message);
  }
}
process.exit(0);
