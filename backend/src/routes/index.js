// backend/src/routes/index.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const salesRoutes = require('./salesRoutes');

// Ruta de prueba para ver si la conexión funciona
router.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      message: 'Connection successful',
      time: result.rows[0].current_time
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB connection error' });
  }
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/sales', salesRoutes);

module.exports = router;
