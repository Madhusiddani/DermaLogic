// backend/server.js
// Main entry point for the SkinEval backend

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import route files
const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Make sure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);         // /api/auth/register, /api/auth/login
app.use('/api/analysis', analysisRoutes); // /api/analysis/analyze, /api/analysis/history/:userId

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'PostgreSQL' });
});

// Keep old /analyze endpoint working so frontend doesn't break
// This is the same URL your frontend currently calls
const multer = require('multer');
const upload = multer({ dest: uploadsDir });
const { analyze } = require('./controllers/analysisController');
app.post('/analyze', upload.single('image'), analyze);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Using PostgreSQL database`);
});

