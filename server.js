const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const doctorRoutes = require('./routes/doctor');
const aiRoutes = require('./routes/ai');
const envRoutes = require('./routes/environment');
const ashaRoutes = require('./routes/asha');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://arogyaswarm-backend.onrender.com', // Render backend (self-requests)
    /\.onrender\.com$/,                          // Any Render-hosted frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Serve static frontend files only if dist folder exists (local full-stack mode)
const distPath = path.join(__dirname, '../frontend/dist');
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/environment', envRoutes);
app.use('/api/asha', ashaRoutes);

// Database check schema (Optional placeholder to ensure routes are hit)
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Debug endpoint: shows which env vars are loaded (safe — no secret values)
app.get('/api/debug-env', async (req, res) => {
  const { db } = require('./db');
  const { sql } = require('drizzle-orm');
  let dbStatus = 'untested';
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = `failed: ${e.message}`;
  }
  res.json({
    PORT: process.env.PORT || 'not set',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ set' : '❌ missing',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ set' : '❌ missing',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅ set' : '❌ missing',
    dbConnection: dbStatus,
  });
});

// Fallback: serve index.html if it exists (full-stack mode), else return JSON 404
app.use((req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
