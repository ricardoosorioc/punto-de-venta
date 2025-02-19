// backend/src/routes/userRoutes.js
const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
} = require('../controllers/userController');

const authMiddleware = require('../middlewares/authMiddleware');
const verifyAdmin = require('../middlewares/verifyAdmin');

const router = express.Router();

// GET /api/users
router.get('/', authMiddleware, verifyAdmin, getAllUsers);

// GET /api/users/:id
router.get('/:id', authMiddleware, verifyAdmin, getUserById);

// PUT /api/users/:id
router.put('/:id', authMiddleware, verifyAdmin, updateUser);

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, verifyAdmin, deleteUser);

// Endpoint para cambiar contraseña (admin o vendedor, con reglas internas)
router.put('/:id/password', authMiddleware, changePassword);

module.exports = router;
