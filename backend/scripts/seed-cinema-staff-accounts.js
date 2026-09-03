import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

const DEFAULT_PASSWORD = '123456';
const STAFF_PER_CINEMA = 11;

const PEOPLE = [
  ['Nguyễn Minh Anh', 'Nu'], ['Trần Quốc Bảo', 'Nam'], ['Lê Hoàng Nam', 'Nam'],
  ['Phạm Ngọc Mai', 'Nu'], ['Hoàng Gia Huy', 'Nam'], ['Vũ Thảo Linh', 'Nu'],
  ['Đặng Đức Long', 'Nam'], ['Bùi Khánh Vy', 'Nu'], ['Đỗ Thành Công', 'Nam'],
  ['Hồ Nhật Minh', 'Nam'], ['Ngô Quỳnh Trang', 'Nu'],

  ['Dương Hải Yến', 'Nu'], ['Lý Tuấn Kiệt', 'Nam'], ['Võ Mỹ Duyên', 'Nu'],
  ['Huỳnh Anh Khoa', 'Nam'], ['Phan Thanh Hà', 'Nu'], ['Mai Đức Thịnh', 'Nam'],
  ['Tạ Ngọc Hân', 'Nu'], ['Trương Minh Quân', 'Nam'], ['Cao Bảo Trâm', 'Nu'],
  ['Đinh Quốc Việt', 'Nam'], ['Chu Khánh Linh', 'Nu'],

  ['Nguyễn Thành Đạt', 'Nam'], ['Trần Thu Phương', 'Nu'], ['Lê Minh Hoàng', 'Nam'],
  ['Phạm Thùy Chi', 'Nu'], ['Hoàng Đức Anh', 'Nam'], ['Vũ Ngọc Bích', 'Nu'],
  ['Đặng Quang Huy', 'Nam'], ['Bùi Hải My', 'Nu'], ['Đỗ Công Thành', 'Nam'],
  ['Hồ Gia Bảo', 'Nam'], ['Ngô Mai Anh', 'Nu'],

  ['Dương Quốc Khánh', 'Nam'], ['Lý Thanh Tâm', 'Nu'], ['Võ Hoàng Phúc', 'Nam'],
  ['Huỳnh Ngọc Lan', 'Nu'], ['Phan Minh Trí', 'Nam'], ['Mai Thu Hà', 'Nu'],
  ['Tạ Đức Duy', 'Nam'], ['Trương Bảo Ngọc', 'Nu'], ['Cao Nhật Quang', 'Nam'],
  ['Đinh Thảo Vy', 'Nu'], ['Chu Anh Tuấn', 'Nam'],

  ['Nguyễn Khánh An', 'Nu'], ['Trần Minh Đức', 'Nam'], ['Lê Thu Hương', 'Nu'],
  ['Phạm Quốc Hưng', 'Nam'], ['Hoàng Ngọc Diệp', 'Nu'], ['Vũ Thành Trung', 'Nam'],
  ['Đặng Hà My', 'Nu'], ['Bùi Tuấn Anh', 'Nam'], ['Đỗ Phương Thảo', 'Nu'],
  ['Hồ Đức Mạnh', 'Nam'], ['Ngô Khánh Huyền', 'Nu'],
];

const CINEMA_CODES = ['HN', 'SG', 'DN', 'CT', 'HP'];
const STAFF_DEPARTMENTS = [
  'Vé & Quầy thu ngân',
  'Phục vụ khách hàng',
  'Thực phẩm & Đồ uống',
  'Vận hành rạp',
  'An ninh & Sảnh',
];
const TECH_DEPARTMENTS = [
  'Kỹ thuật chiếu phim',
  'Âm thanh & Ánh sáng',
  'Điện & Thiết bị',
  'Hệ thống & Mạng',
  'Bảo trì phòng chiếu',
];
const STAFF_SHIFTS = ['morning', 'afternoon', 'night', 'morning,afternoon', 'afternoon,night'];
const TECH_SHIFTS = ['morning', 'afternoon', 'night', 'morning,night', 'afternoon,night'];

const toAscii = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .replace(/[^a-zA-Z0-9 ]/g, '')
  .trim();

const getAccountIdentity = (fullName, cinemaCode) => {
  const parts = toAscii(fullName).split(/\s+/).filter(Boolean);
  const personalName = parts.slice(1).join('') || parts[0] || 'NhanVien';
  const emailName = parts.slice(1).map((part) => part.toLowerCase()).join('.');
  return {
    userName: `${personalName}${cinemaCode}`,
    email: `${emailName}.${cinemaCode.toLowerCase()}@sweetstar.vn`,
  };
};

const getJobProfile = (indexInCinema) => {
  if (indexInCinema === 0) {
    return {
      roleCode: 'QL',
      roleNumber: 1,
      position: 'Quản lý',
      department: 'Quản lý rạp',
      salary: 18_000_000,
      shifts: 'morning,afternoon',
    };
  }

  if (indexInCinema <= 5) {
    const roleNumber = indexInCinema;
    return {
      roleCode: 'NV',
      roleNumber,
      position: 'Nhân viên',
      department: STAFF_DEPARTMENTS[roleNumber - 1],
      salary: 8_500_000 + (roleNumber - 1) * 250_000,
      shifts: STAFF_SHIFTS[roleNumber - 1],
    };
  }

  const roleNumber = indexInCinema - 5;
  return {
    roleCode: 'KT',
    roleNumber,
    position: 'Kỹ thuật viên',
    department: TECH_DEPARTMENTS[roleNumber - 1],
    salary: 11_500_000 + (roleNumber - 1) * 300_000,
    shifts: TECH_SHIFTS[roleNumber - 1],
  };
};

const makeDateOfBirth = (globalIndex) => {
  const year = 1987 + (globalIndex % 14);
  const month = String((globalIndex % 12) + 1).padStart(2, '0');
  const day = String((globalIndex % 27) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const makeHireDate = (globalIndex) => {
  const month = String((globalIndex % 8) + 1).padStart(2, '0');
  const day = String((globalIndex % 24) + 1).padStart(2, '0');
  return `2026-${month}-${day}`;
};

const main = async () => {
  if (PEOPLE.length !== 55) {
    throw new Error(`Danh sách nhân sự phải có đúng 55 người, hiện có ${PEOPLE.length}.`);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let [[employeeRole]] = await connection.query(
      "SELECT role_id FROM Roles WHERE LOWER(role_name) = 'employee' LIMIT 1",
    );
    if (!employeeRole) {
      const [roleResult] = await connection.query(
        "INSERT INTO Roles (role_name, description) VALUES ('employee', 'Nhân viên rạp chiếu phim')",
      );
      employeeRole = { role_id: Number(roleResult.insertId) };
    }

    const [cinemas] = await connection.query(`
      SELECT cinemas_id, cinema_name, address, city
      FROM Cinemas
      WHERE status = 'active'
      ORDER BY cinemas_id
    `);
    if (cinemas.length !== 5) {
      throw new Error(`Seed này cần đúng 5 rạp đang hoạt động, hiện tìm thấy ${cinemas.length}.`);
    }

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    let usersCreated = 0;
    let usersUpdated = 0;
    let employeesCreated = 0;
    let employeesUpdated = 0;

    for (let cinemaIndex = 0; cinemaIndex < cinemas.length; cinemaIndex += 1) {
      const cinema = cinemas[cinemaIndex];
      const cinemaCode = CINEMA_CODES[cinemaIndex];

      for (let indexInCinema = 0; indexInCinema < STAFF_PER_CINEMA; indexInCinema += 1) {
        const globalIndex = cinemaIndex * STAFF_PER_CINEMA + indexInCinema;
        const [fullName, sex] = PEOPLE[globalIndex];
        const profile = getJobProfile(indexInCinema);
        const identity = getAccountIdentity(fullName, cinemaCode);
        const phone = `09${cinemaIndex + 1}${String(globalIndex + 1).padStart(7, '0')}`;
        const citizenId = `${String(31 + cinemaIndex).padStart(3, '0')}2${String(globalIndex + 1).padStart(8, '0')}`;
        const employeeCode = `SS-${cinemaCode}-${profile.roleCode}-${String(profile.roleNumber).padStart(2, '0')}`;
        const dob = makeDateOfBirth(globalIndex);
        const hireDate = makeHireDate(globalIndex);
        const address = `${cinema.address || cinema.city || 'Việt Nam'} (${cinema.cinema_name})`;

        const [[existingUser]] = await connection.query(
          'SELECT id FROM User WHERE email = ? LIMIT 1',
          [identity.email],
        );

        let userId;
        if (existingUser) {
          userId = Number(existingUser.id);
          await connection.query(
            `UPDATE User
            SET role_id = ?, full_name = ?, user_name = ?, password = ?,
                must_change_password = 0, phone = ?, birthday = ?, sex = ?,
                status = 'active', email_verified = 1, email_verified_at = COALESCE(email_verified_at, NOW())
            WHERE id = ?`,
            [employeeRole.role_id, fullName, identity.userName, passwordHash, phone, dob, sex, userId],
          );
          usersUpdated += 1;
        } else {
          const [userResult] = await connection.query(
            `INSERT INTO User
              (role_id, full_name, user_name, email, password, must_change_password,
              phone, birthday, sex, status, email_verified, email_verified_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', 1, NOW())`,
            [employeeRole.role_id, fullName, identity.userName, identity.email, passwordHash, phone, dob, sex],
          );
          userId = Number(userResult.insertId);
          usersCreated += 1;
        }

        const [[existingEmployee]] = await connection.query(
          'SELECT employee_id FROM Employees WHERE user_id = ? OR employee_code = ? LIMIT 1',
          [userId, employeeCode],
        );
        const employeeValues = [
          userId,
          employeeCode,
          profile.position,
          profile.department,
          'full_time',
          hireDate,
          profile.salary,
          'active',
          profile.shifts,
          address,
          sex,
          dob,
          citizenId,
          cinema.cinemas_id,
        ];

        if (existingEmployee) {
          await connection.query(
            `UPDATE Employees
            SET user_id = ?, employee_code = ?, position = ?, department = ?, type = ?,
                hire_date = ?, salary = ?, status = ?, shifts = ?, address = ?, sex = ?,
                dob = ?, citizen_id = ?, cinema_id = ?
            WHERE employee_id = ?`,
            [...employeeValues, existingEmployee.employee_id],
          );
          employeesUpdated += 1;
        } else {
          await connection.query(
            `INSERT INTO Employees
              (user_id, employee_code, position, department, type, hire_date, salary,
              status, shifts, address, sex, dob, citizen_id, cinema_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            employeeValues,
          );
          employeesCreated += 1;
        }
      }
    }

    await connection.commit();
    console.log(JSON.stringify({
      cinemas: cinemas.length,
      accountsPerCinema: STAFF_PER_CINEMA,
      usersCreated,
      usersUpdated,
      employeesCreated,
      employeesUpdated,
      defaultPassword: DEFAULT_PASSWORD,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
};

main().catch((error) => {
  console.error('Không thể tạo tài khoản nhân viên:', error.message);
  process.exitCode = 1;
});
