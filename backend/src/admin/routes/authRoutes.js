import express from 'express';
import {
	login,
	register,
	getMe,
	verifyEmail,
	resendVerificationEmail,
	forgotPassword,
	resetPassword,
} from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login',    login);
router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me',        authMiddleware, getMe);

export default router;
