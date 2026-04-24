const express = require('express');
const jwt = require('jsonwebtoken');
const { auth } = require('../firebase');
const router = express.Router();

// -------------------------------------------------------
// LOGIN - Firebase Authentication
// Frontend sends email + password → we verify with Firebase
// Returns a JWT token for subsequent API calls
// -------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Verify user exists in Firebase Auth
    const userRecord = await auth.getUserByEmail(email);

    // Note: Firebase Admin SDK cannot verify passwords directly.
    // We use Firebase REST API to verify email/password
    const axios = require('axios');
    const firebaseApiKey = process.env.FIREBASE_API_KEY;

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      { email, password, returnSecureToken: true }
    );

    // Issue our own JWT for subsequent API calls
    const token = jwt.sign(
      { uid: userRecord.uid, email: userRecord.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || email.split('@')[0]
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    // Firebase error codes
    if (error.response?.data?.error?.message === 'INVALID_PASSWORD' ||
        error.response?.data?.error?.message === 'EMAIL_NOT_FOUND' ||
        error.response?.data?.error?.message === 'INVALID_LOGIN_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// -------------------------------------------------------
// CREATE USER - Admin only endpoint
// Used to create new agent/staff accounts
// -------------------------------------------------------
router.post('/create-user', async (req, res) => {
  const { email, password, displayName, adminSecret } = req.body;

  // Simple admin protection
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: true
    });

    res.json({
      success: true,
      message: `User created: ${userRecord.email}`,
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Create user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Verify JWT middleware (exported for other routes)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = router;
module.exports.verifyToken = verifyToken;