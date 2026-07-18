import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './src/admin/routes/adminRoutes.js';
import userRoutes from './src/user/routes/userRoutes.js';
import authRoutes from './src/auth/authRoutes.js';
import blogRoutes from './src/admin/routes/blogRoutes.js';
import reviewRoutes from './src/admin/routes/reviewRoutes.js';
import pointsRoutes from './src/admin/routes/pointsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration for credential requests
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow frontend origins
  credentials: true,                // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files

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

// Review routes
app.use('/api', reviewRoutes);

// Blog routes
app.use('/api', blogRoutes);

// Points routes
app.use('/api', pointsRoutes);

// User routes
app.use('/api/user', userRoutes);

export default app;
