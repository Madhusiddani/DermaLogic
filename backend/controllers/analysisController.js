// backend/controllers/analysisController.js
// Handles image upload, Gemini analysis, and history

const pool = require('../db');
// Temporarily use mock service while Gemini API key is being fixed
const { analyzeImage } = require('../services/mockAiService'); 
const fs = require('fs');

// Analyze an image using Gemini and save result to PostgreSQL
// POST /api/analysis/analyze
const analyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = req.file.filename; // Save the filename as image reference

    // ✅ Call Gemini AI — this is EXACTLY the same as before
    const analysis = await analyzeImage(imagePath);

    // Get user_id from request (if user is logged in)
    // If no user, save as null (guest analysis)
    const userId = req.body.userId ? parseInt(req.body.userId) : null;

    // Save the result to PostgreSQL analysis table
    const savedResult = await pool.query(
      'INSERT INTO analysis (user_id, image_url, result) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, imageUrl, JSON.stringify(analysis)]
    );

    // Clean up the uploaded temp image file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Send back the Gemini result (same format as before) + the saved record id
    res.json({
      ...analysis,
      savedId: savedResult.rows[0].id,
      savedAt: savedResult.rows[0].created_at
    });

  } catch (err) {
    console.error('Analysis error:', err.message);

    // Clean up temp file if something went wrong
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to analyze image',
      message: err.message
    });
  }
};

// Get all past analysis results for a user
// GET /api/analysis/history/:userId
const getHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all analysis rows for this user, newest first
    const result = await pool.query(
      'SELECT id, image_url, result, created_at FROM analysis WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Parse the result JSON string back to an object for each row
    const history = result.rows.map(row => ({
      id: row.id,
      imageUrl: row.image_url,
      result: JSON.parse(row.result),
      createdAt: row.created_at
    }));

    res.json({ history });

  } catch (err) {
    console.error('History fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

module.exports = { analyze, getHistory };