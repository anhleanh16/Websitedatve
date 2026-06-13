import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './src/admin/routes/adminRoutes.js';
import userRoutes from './src/user/routes/userRoutes.js';
import authRoutes from './src/auth/authRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/trailer', (req, res, next) => {
  const trailerPath = path.join(__dirname, 'uploads', 'trailers', 'DORAEMON_ NOBITA VÀ CUỘC CHIẾN VŨ TRỤ TÍ HON.mp4');
  res.sendFile(trailerPath, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(err.status || 404).json({ error: 'Trailer not found' });
      } else {
        console.error('Trailer sendFile error after headers sent:', err);
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (login, register, me)
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// User routes
app.use('/api/user', userRoutes);

export default app;
