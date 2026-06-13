import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lunexa_secret_2026';

/* Xác thực JWT — gắn req.userId, req.userRole, req.userEmail */
export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Chưa đăng nhập.' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId    = decoded.userId;
    req.userRole  = decoded.role;
    req.userEmail = decoded.email;
    req.userName  = decoded.name;
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

/* Yêu cầu role admin */
export const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin')
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  next();
};
