import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sweetstar_secret_2026';

/* Xác thực JWT — gắn req.userId, req.userRole, req.userEmail */
export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Chưa đăng nhập.' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId    = decoded.userId;
    req.userRole  = String(decoded.role || '').toLowerCase();
    req.userEmail = decoded.email;
    req.userName  = decoded.name;
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

const hasRole = (req, roles) => roles.includes(req.userRole);

export const adminOnly = (req, res, next) => {
  if (!hasRole(req, ['admin', 'employee', 'manager']))
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  next();
};

export const adminManagerOnly = (req, res, next) => {
  if (!hasRole(req, ['admin', 'employee', 'manager']))
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  next();
};

export const staffBasicOnly = (req, res, next) => {
  if (!hasRole(req, ['admin', 'employee', 'manager']))
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  next();
};

/* Cho phép chính chủ hoặc admin */
export const selfOrAdminOnly = (req, res, next) => {
  const paramUserId = Number(req.params.userId);

  if (req.userRole === 'admin') {
    return next();
  }

  if (!paramUserId || Number(req.userId) !== paramUserId) {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập dữ liệu này.' });
  }

  next();
};
