import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  createUser,
  emailExists,
  findUserById,
  findUserWithRoleByEmail,
  getRoleIdByName,
  updateLastLogin,
} from '../models/authModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lunexa_secret_2026';
const JWT_EXPIRES = '7d';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/* ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });

    const user = await findUserWithRoleByEmail(email);
    if (!user)
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

    await updateLastLogin(user.id);

    const role = user.role_name || 'user';
    const token = makeToken({
      userId: user.id,
      email: user.email,
      name: user.full_name,
      role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        point: user.point,
        role,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
};

/* ─── ĐĂNG KÝ ────────────────────────────────────────────────────────────── */
export const register = async (req, res) => {
  try {
    const { full_name, email, password, phone, birthday, sex } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

    if (await emailExists(email))
      return res.status(409).json({ message: 'Email đã được sử dụng.' });

    const roleId = await getRoleIdByName('user');
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await createUser({
      roleId,
      full_name,
      email,
      password: hashedPassword,
      phone,
      birthday,
      sex,
    });

    const token = makeToken({
      userId,
      email,
      name: full_name,
      role: 'user',
    });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: {
        id: userId,
        name: full_name,
        email,
        phone: phone || null,
        role: 'user',
      },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại.' });
  }
};

/* ─── LẤY PROFILE (dùng trong middleware xác thực) ───────────────────────── */
export const getMe = async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ user });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};
