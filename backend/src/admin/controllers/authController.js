import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  createUser,
  emailExists,
  ensureEmailVerificationSchema,
  ensurePasswordResetSchema,
  findUserForResendVerification,
  findUserForPasswordReset,
  findUserById,
  findUserWithRoleByEmail,
  getRoleIdByName,
  resetPasswordByToken,
  setPasswordResetToken,
  setEmailVerificationToken,
  updateLastLogin,
  verifyEmailByToken,
} from '../models/authModel.js';
import {
  isEmailVerificationConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/emailVerificationService.js';
import { db } from '../../../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sweetstar_secret_2026';
const JWT_EXPIRES = '7d';
const TOKEN_TTL_MINUTES = 5;
const EMAIL_VERIFY_TTL_MINUTES = TOKEN_TTL_MINUTES;
const PASSWORD_RESET_TTL_MINUTES = TOKEN_TTL_MINUTES;
const FRONTEND_LOGIN_URL = process.env.FRONTEND_LOGIN_URL || 'http://localhost:5173/Logins/Login';
const FRONTEND_RESET_PASSWORD_URL = process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password';

function buildBackendBaseUrl(req) {
  return process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function buildVerifyUrl(req, token, expiresAt) {
  const base = buildBackendBaseUrl(req);
  const exp = Number(expiresAt?.getTime?.() || 0);
  const expPart = exp > 0 ? `&exp=${exp}` : '';
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}${expPart}`;
}

function buildLoginRedirectUrl(params = {}) {
  const search = new URLSearchParams(params).toString();
  return search ? `${FRONTEND_LOGIN_URL}?${search}` : FRONTEND_LOGIN_URL;
}

function buildResetPasswordUrl(token, expiresAt) {
  const exp = Number(expiresAt?.getTime?.() || 0);
  const search = new URLSearchParams({ token: String(token || ''), exp: String(exp || '') }).toString();
  return `${FRONTEND_RESET_PASSWORD_URL}?${search}`;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function getEmailDeliveryErrorMessage(error, purpose = 'xác minh') {
  const code = String(error?.code || '').toUpperCase();
  const responseCode = Number(error?.responseCode || 0);
  const message = String(error?.message || '').toLowerCase();

  const isAuthError =
    code === 'EAUTH' ||
    responseCode === 535 ||
    message.includes('535') ||
    message.includes('badcredentials') ||
    message.includes('username and password not accepted') ||
    message.includes('application-specific password required');

  if (isAuthError) {
    return `Không thể gửi email ${purpose}: tài khoản SMTP hoặc App Password chưa đúng. Vui lòng kiểm tra lại cấu hình email gửi.`;
  }

  const isConnectionError =
    code === 'ECONNECTION' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    message.includes('connection timeout') ||
    message.includes('timed out');

  if (isConnectionError) {
    return `Không thể kết nối máy chủ SMTP để gửi email ${purpose}. Vui lòng thử lại sau.`;
  }

  return null;
}

/* ─── ĐĂNG NHẬP ──────────────────────────────────────────────────────────── */
export const login = async (req, res) => {
  try {
    await ensureEmailVerificationSchema();
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });

    const user = await findUserWithRoleByEmail(email);
    if (!user)
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

    if (String(user.status || '').toLowerCase() === 'blocked') {
      return res.status(403).json({
        message:
          'Tài khoản của bạn đã bị khóa, vui lòng liên hệ CSKH Sweet Star hoặc đến rạp chiếu phim Sweet Star gần nhất để được hỗ trợ.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });

    const role = (user.role_name || user.role || 'user').toLowerCase();
    if (role === 'user' && Number(user.email_verified || 0) !== 1) {
      return res.status(403).json({
        message: 'Tài khoản chưa xác minh email. Vui lòng kiểm tra email và bấm liên kết xác minh.',
      });
    }

    await updateLastLogin(user.id);
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
  let connection = null;
  try {
    await ensureEmailVerificationSchema();
    const { full_name, email, password, phone, birthday, sex } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu phải ít nhất 6 ký tự.' });

    if (await emailExists(email))
      return res.status(409).json({ message: 'Email đã được sử dụng.' });

    if (!isEmailVerificationConfigured()) {
      return res.status(500).json({
        message:
          'Thiếu cấu hình SMTP để gửi email xác minh. Vui lòng cấu hình SMTP trong backend/.env rồi thử lại.',
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const roleId = await getRoleIdByName('user', connection);
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MINUTES * 60 * 1000);

    const userId = await createUser({
      roleId,
      full_name,
      email,
      password: hashedPassword,
      phone,
      birthday,
      sex,
    }, connection);

    await setEmailVerificationToken(userId, verificationToken, expiresAt, connection);
    await sendVerificationEmail({
      toEmail: email,
      fullName: full_name,
      verifyUrl: buildVerifyUrl(req, verificationToken, expiresAt),
      ttlMinutes: EMAIL_VERIFY_TTL_MINUTES,
    });

    await connection.commit();

    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.',
      tokenTtlMinutes: EMAIL_VERIFY_TTL_MINUTES,
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('register rollback error:', rollbackError);
      }
    }
    console.error('register error:', err);
    const friendlyMessage = getEmailDeliveryErrorMessage(err, 'xác minh');
    res.status(500).json({ message: friendlyMessage || 'Lỗi máy chủ, vui lòng thử lại.' });
  } finally {
    if (connection) connection.release();
  }
};

export const verifyEmail = async (req, res) => {
  try {
    await ensureEmailVerificationSchema();
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.redirect(buildLoginRedirectUrl({ verified: '0', reason: 'missing_token' }));
    }

    const success = await verifyEmailByToken(token);
    if (!success) {
      return res.redirect(buildLoginRedirectUrl({ verified: '0', reason: 'invalid_or_expired' }));
    }

    return res.redirect(buildLoginRedirectUrl({ verified: '1' }));
  } catch (err) {
    console.error('verifyEmail error:', err);
    return res.redirect(buildLoginRedirectUrl({ verified: '0', reason: 'server_error' }));
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    await ensureEmailVerificationSchema();
    if (!isEmailVerificationConfigured()) {
      return res.status(500).json({
        message:
          'Thiếu cấu hình SMTP để gửi email xác minh. Vui lòng cấu hình SMTP trong backend/.env rồi thử lại.',
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email để gửi lại xác minh.' });
    }

    const user = await findUserForResendVerification(email);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này.' });
    }

    if (Number(user.email_verified || 0) === 1) {
      return res.status(400).json({ message: 'Email này đã được xác minh.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MINUTES * 60 * 1000);

    await setEmailVerificationToken(user.id, verificationToken, expiresAt);
    await sendVerificationEmail({
      toEmail: user.email,
      fullName: user.full_name,
      verifyUrl: buildVerifyUrl(req, verificationToken, expiresAt),
      ttlMinutes: EMAIL_VERIFY_TTL_MINUTES,
    });

    return res.json({ message: 'Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.' });
  } catch (err) {
    console.error('resendVerificationEmail error:', err);
    const friendlyMessage = getEmailDeliveryErrorMessage(err, 'xác minh');
    return res.status(500).json({
      message: friendlyMessage || 'Không thể gửi lại email xác minh lúc này.',
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    await ensurePasswordResetSchema();

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Vui lòng nhập email để đặt lại mật khẩu.' });
    }

    if (!isEmailVerificationConfigured()) {
      return res.status(500).json({
        message:
          'Thiếu cấu hình SMTP để gửi email đặt lại mật khẩu. Vui lòng cấu hình SMTP trong backend/.env rồi thử lại.',
      });
    }

    const user = await findUserForPasswordReset(email);
    if (!user) {
      return res.json({
        message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await setPasswordResetToken(user.id, resetToken, expiresAt);
    await sendPasswordResetEmail({
      toEmail: user.email,
      fullName: user.full_name,
      resetUrl: buildResetPasswordUrl(resetToken, expiresAt),
      ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    return res.json({
      message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
      tokenTtlMinutes: PASSWORD_RESET_TTL_MINUTES,
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    const friendlyMessage = getEmailDeliveryErrorMessage(err, 'đặt lại mật khẩu');
    return res.status(500).json({
      message: friendlyMessage || 'Không thể gửi email đặt lại mật khẩu lúc này.',
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    await ensurePasswordResetSchema();

    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');

    if (!token) {
      return res.status(400).json({ message: 'Thiếu token đặt lại mật khẩu.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const success = await resetPasswordByToken(token, hashedPassword);

    if (!success) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    return res.json({ message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Không thể đặt lại mật khẩu lúc này.' });
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
