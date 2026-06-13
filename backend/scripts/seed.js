/**
 * Chạy: node scripts/seed.js
 * Tạo roles + tài khoản admin/user mặc định
 */
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

async function seed() {
  try {
    // 1. Roles
    await db.query(`
      INSERT IGNORE INTO Roles (role_id, role_name, description) VALUES
      (1, 'admin', 'Quản trị viên hệ thống'),
      (2, 'user',  'Khách hàng thông thường')
    `);
    console.log('✅ Roles seeded');

    // 2. Admin account
    const adminPass = await bcrypt.hash('Admin@123', 10);
    await db.query(`
      INSERT IGNORE INTO User (id, role_id, full_name, email, password, status)
      VALUES (1, 1, 'Quản trị viên', 'admin@lunexa.vn', ?, 'active')
    `, [adminPass]);
    console.log('✅ Admin seeded if missing  → expected id: 1 | role_id: 1 | email: admin@lunexa.vn | password: Admin@123');

    // 3. User test
    const userPass = await bcrypt.hash('User@123', 10);
    await db.query(`
      INSERT INTO User (role_id, full_name, email, password, phone, status)
      VALUES (2, 'Nguyễn Văn Test', 'user@lunexa.vn', ?, '0901234567', 'active')
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, [userPass]);
    console.log('✅ User seeded   → email: user@lunexa.vn   | password: User@123');

    console.log('\n🎉 Seed hoàn thành!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
