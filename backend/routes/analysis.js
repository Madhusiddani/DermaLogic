// backend/routes/analysis.js
// Analysis routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyze, getHistory } = require('../controllers/analysisController');

// Configure multer for image uploads (same config as before)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/analysis/analyze         → Upload image and get Gemini analysis
router.post('/analyze', upload.single('image'), analyze);

// GET  /api/analysis/history/:userId → Get past analyses for a user
router.get('/history/:userId', getHistory);

module.exports = router;