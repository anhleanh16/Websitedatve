import { db } from '../../../config/db.js';

const isUnlinkedEmail = (email) => String(email || '').toLowerCase().endsWith('@unlinked.local');

// Các thao tác có rủi ro (thanh toán, bình luận) luôn kiểm tra DB thay vì
// chỉ dựa vào dữ liệu đã lưu trong token hoặc trình duyệt.
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    const userId = Number(req.userId || 0);
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập trước khi thực hiện thao tác này.' });
    }

    const [[user]] = await db.query(
      'SELECT email, email_verified FROM User WHERE id = ? LIMIT 1',
      [userId],
    );

    if (!user || isUnlinkedEmail(user.email) || Number(user.email_verified || 0) !== 1) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Vui lòng xác minh email trước khi thanh toán hoặc gửi bình luận.',
      });
    }

    return next();
  } catch (error) {
    console.error('Email verification access check failed:', error);
    return res.status(500).json({ message: 'Không thể kiểm tra trạng thái xác minh email.' });
  }
};
