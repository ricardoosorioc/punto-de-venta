// backend/src/routes/authRoutes.js
const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
    // Gracias a authMiddleware, tenemos req.user con { id, role, name, email, ... }
    // Esto viene del payload del token JWT que se validó.
    res.json({
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
      email: req.user.email
    });
  });

module.exports = router;
