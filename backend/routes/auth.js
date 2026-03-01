// backend/routes/auth.js
// Authentication routes

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register  → Create new user account
router.post('/register', register);

// POST /api/auth/login     → Login with email + password
router.post('/login', login);

module.exports = router;