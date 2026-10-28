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

// Normalize req.url so that /api prefix is always present, even if Vercel serverless rewrites strip it
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Lazy DB initialization middleware for serverless/local environments
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await ensureDB();
    } catch (err) {
      console.error('Database connection error in request middleware:', err.message);
      return res.status(500).json({
        error: 'Database connection failed. Please ensure PostgreSQL DATABASE_URL is properly configured in Vercel Environment Variables.',
      });
    }
  }
  next();
});

// API Routes (mount both with and without /api to guarantee matching regardless of serverless path rewriting)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
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
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl || req.url}` });
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('Attendance Portal Backend API is running.');
    }
  });
});

module.exports = app;
