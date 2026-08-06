import express from 'express';
import { login, register, confirmRegistrationOtp, resendRegistrationOtp, getMe } from '../../admin/controllers/authController.js';
import { authMiddleware } from '../../admin/middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/register/confirm-otp', confirmRegistrationOtp);
router.post('/register/resend-otp', resendRegistrationOtp);
router.get('/me', authMiddleware, getMe);

export default router;
