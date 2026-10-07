const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { ensureDB } = require('./db');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const adminRoutes = require('./routes/admin');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy DB initialization middleware for serverless/local environments
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await ensureDB();
    } catch (err) {
      console.error('Database connection error in request middleware:', err.message);
      return res.status(500).json({
        error: 'Database connection failed. Please ensure PostgreSQL DATABASE_URL is properly configured.',
      });
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: process.env.DATABASE_URL ? 'PostgreSQL Configured' : 'Missing DATABASE_URL',
    time: new Date().toISOString(),
    system: 'Attendance Portal API',
  });
});

// Serve frontend static build if exists (for monolithic local run)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback for SPA routing in Express
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Attendance Portal Backend API is running.');
    }
  });
});

module.exports = app;
