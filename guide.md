# SkinEval — MongoDB to PostgreSQL Migration Guide

> **Your Gemini AI logic is 100% untouched.** Only the database layer changes.  
> This guide takes you from your current project to a fully working PostgreSQL backend — step by step.

---

## 📁 Current Project Structure (What You Have)

```
backend/
  services/
    aiService.js       ← Gemini AI logic (DO NOT TOUCH)
  uploads/             ← temp image storage
  .env
  package.json
  server.js
```

---

## 📁 Final Project Structure (What You'll Have After This Guide)

```
backend/
  routes/
    auth.js            ← User login/register routes
    analysis.js        ← Analyze image + history routes
  controllers/
    authController.js  ← Auth logic (register, login)
    analysisController.js  ← Analysis + history logic
  services/
    aiService.js       ← Gemini AI (UNCHANGED)
  uploads/
  db.js                ← PostgreSQL connection
  server.js            ← Main app entry point
  .env
  package.json
```

---

## ✅ STEP 1 — Install PostgreSQL Package

Open your terminal inside the `backend/` folder and run:

```bash
npm install pg
npm install bcryptjs jsonwebtoken
```

- `pg` — PostgreSQL driver for Node.js
- `bcryptjs` — for hashing passwords
- `jsonwebtoken` — for user authentication tokens

---

## ✅ STEP 2 — Create Database Connection File

**File to create:** `backend/db.js`

```js
// backend/db.js
// This file connects our app to PostgreSQL database

const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// Pool manages multiple database connections efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection when app starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // Release the test connection back to pool
  }
});

module.exports = pool;
```

---

## ✅ STEP 3 — Create the Users Table

**File to create:** `backend/scripts/createTables.js`

This is a one-time setup script. You run it once to create tables in your database.

```js
// backend/scripts/createTables.js
// Run this ONCE to create tables: node scripts/createTables.js

const pool = require('../db');

async function createTables() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ users table created (or already exists)');

    // Create analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        image_url   TEXT,
        result      TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ analysis table created (or already exists)');

    console.log('🎉 All tables ready!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    process.exit(1);
  }
}

createTables();
```

**To run this script once:**

```bash
node scripts/createTables.js
```

---

## ✅ STEP 4 — Update Your `.env` File

**File to edit:** `backend/.env`

Add these lines to your existing `.env`:

```env
# Already in your .env (keep these):
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001

# Add these new lines:
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/skineval
JWT_SECRET=your_secret_key_here_make_it_long_and_random
NODE_ENV=development
```

> **Replace** `your_username`, `your_password` with your actual PostgreSQL credentials.  
> **Replace** `skineval` with your database name (create it first with `CREATE DATABASE skineval;` in psql).  
> **Replace** `your_secret_key_here` with any long random string like `mySecretKey12345!xyz`.

---

## ✅ STEP 5 — Create Auth Controller

**File to create:** `backend/controllers/authController.js`

```js
// backend/controllers/authController.js
// Handles user registration and login

const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Check if user with this email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password before saving (never save plain passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user to PostgreSQL
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    );

    const newUser = result.rows[0];

    // Create JWT token for automatic login after register
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login existing user
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Compare entered password with hashed password in database
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
};

module.exports = { register, login };
```

---

## ✅ STEP 6 — Create Analysis Controller

**File to create:** `backend/controllers/analysisController.js`

> ⚠️ The `analyzeImage` function from `aiService.js` is called here — **completely unchanged**.

```js
// backend/controllers/analysisController.js
// Handles image upload, Gemini analysis, and history

const pool = require('../db');
const { analyzeImage } = require('../services/aiService'); // ← UNCHANGED Gemini logic
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
```

---

## ✅ STEP 7 — Create Route Files

### `backend/routes/auth.js`

```js
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
```

---

### `backend/routes/analysis.js`

```js
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
```

---

## ✅ STEP 8 — Rewrite `server.js`

**File to replace:** `backend/server.js`

> Your old `server.js` had the analyze endpoint directly in it. Now it's cleaner — routes are in separate files.

```js
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
```

> **Note on `/analyze` backward compatibility:** The last few lines keep the old `/analyze` URL working so your React frontend doesn't need any changes. If you're okay updating the frontend too, you can remove those lines and only use `/api/analysis/analyze`.

---

## ✅ STEP 9 — Remove MongoDB (Cleanup)

Since your current backend does **not** have any mongoose files (I checked your code), there is nothing to remove. Your existing code was already MongoDB-free in implementation — it just didn't have PostgreSQL yet.

If you had added mongoose anywhere, these are the commands to clean it up:

```bash
# Remove mongoose package
npm uninstall mongoose

# Delete any MongoDB model files
rm -f models/User.js models/Analysis.js
rm -rf models/
```

Also check `package.json` and remove `"mongoose"` from dependencies if it appears there.

---

## ✅ STEP 10 — Final Folder Structure

After following this guide, your backend should look like this:

```
backend/
  controllers/
    authController.js       ← Register + Login logic
    analysisController.js   ← Gemini analyze + history logic
  routes/
    auth.js                 ← Auth route definitions
    analysis.js             ← Analysis route definitions
  scripts/
    createTables.js         ← One-time DB setup script
  services/
    aiService.js            ← Gemini AI (COMPLETELY UNCHANGED)
  uploads/                  ← Temp image storage
  db.js                     ← PostgreSQL pool connection
  server.js                 ← App entry point
  .env                      ← Environment variables
  package.json
```

---

## ✅ STEP 11 — Setup Checklist (Do These In Order)

```
[ ] 1. Install PostgreSQL on your machine (if not already installed)
        → https://www.postgresql.org/download/

[ ] 2. Open psql terminal and create your database:
        CREATE DATABASE skineval;

[ ] 3. Install Node packages:
        npm install pg bcryptjs jsonwebtoken

[ ] 4. Create all files listed in steps 2–8 above

[ ] 5. Update your .env file with DATABASE_URL and JWT_SECRET

[ ] 6. Run the table creation script (only once):
        node scripts/createTables.js

[ ] 7. Start your server:
        npm run dev

[ ] 8. Test the health check:
        GET http://localhost:3001/health
        → Should return: { "status": "ok", "database": "PostgreSQL" }

[ ] 9. Test image analysis (same as before):
        POST http://localhost:3001/analyze
        Body: form-data, key = "image", value = your image file
        → Should return Gemini analysis result

[ ] 10. Test history endpoint:
        GET http://localhost:3001/api/analysis/history/1
        → Should return list of past analyses
```

---

## 📡 API Reference — All Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/analysis/analyze` | Upload image + get Gemini result |
| `POST` | `/analyze` | Same as above (backward compatible) |
| `GET`  | `/api/analysis/history/:userId` | Get user's analysis history |
| `GET`  | `/health` | Server health check |

---

## 🔐 Register Example Request

```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "mypassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## 🖼️ Analyze Image Example

```
POST /api/analysis/analyze
Content-Type: multipart/form-data

image: [your-image-file.jpg]
userId: 1   (optional)
```

**Response (same as before — Gemini result):**
```json
{
  "condition": "Eczema",
  "confidence": 82,
  "description": "Appears to show characteristics of eczema...",
  "alternatives": [
    { "name": "Contact Dermatitis", "confidence": 45 },
    { "name": "Psoriasis", "confidence": 30 }
  ],
  "savedId": 5,
  "savedAt": "2024-02-04T14:30:00.000Z"
}
```

---

## ⚠️ Important Rules Followed

| Rule | Status |
|------|--------|
| Gemini AI code unchanged | ✅ `aiService.js` not touched |
| Image upload works same | ✅ Same multer config |
| MongoDB removed | ✅ Not used anywhere |
| PostgreSQL added | ✅ Using `pg` with Pool |
| async/await used | ✅ Throughout all files |
| Clean structure | ✅ Controllers + Routes pattern |
| Beginner friendly | ✅ Every line commented |
| Backward compatible URL | ✅ Old `/analyze` still works |

---

## 🐛 Common Errors & Fixes

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`  
**Fix:** PostgreSQL is not running. Start it with `sudo service postgresql start` (Linux) or from the PostgreSQL app (Mac/Windows).

---

**Error:** `database "skineval" does not exist`  
**Fix:** Open psql and run `CREATE DATABASE skineval;`

---

**Error:** `password authentication failed`  
**Fix:** Double-check your `DATABASE_URL` in `.env`. Format is: `postgresql://username:password@localhost:5432/skineval`

---

**Error:** `Cannot find module '../db'`  
**Fix:** Make sure `db.js` is in the `backend/` root folder (same level as `server.js`).

---

**Error:** `JWT_SECRET is not defined`  
**Fix:** Add `JWT_SECRET=anylongrandomstring` to your `.env` file.

---

*Your Gemini analysis and image upload work exactly the same. Only the database changed from MongoDB to PostgreSQL.*