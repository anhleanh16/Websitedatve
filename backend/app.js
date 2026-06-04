import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './src/admin/routes/adminRoutes.js';
import userRoutes from './src/user/routes/userRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Admin routes
app.use('/api/admin', adminRoutes);

// User routes
app.use('/api/user', userRoutes);

// Auth routes (temporary)
app.post('/api/auth/login', (req, res) => {
  res.json({ token: 'sample-token' });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'User registered' });
});

export default app;
