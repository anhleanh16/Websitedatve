import express from 'express';
import { login, register, getMe } from './authController.js';
import { authMiddleware } from './authMiddleware.js';

const router = express.Router();

router.post('/login',    login);
router.post('/register', register);
router.get('/me',        authMiddleware, getMe);

export default router;
