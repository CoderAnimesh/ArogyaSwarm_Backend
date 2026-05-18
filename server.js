const express = require('express');
const cors = require('cors');
const path = require('path');
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
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Serve static frontend files from 'frontend/dist' directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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

// Fallback to index.html for unregistered routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
