// backend/src/routes/reportsRoutes.js
const express = require('express');
const router = express.Router();
const { getSalesReport, getProfitReport, getTopProducts } = require('../controllers/reportsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ventas (por día, semana, mes)
router.get('/sales', authMiddleware, getSalesReport);

// Utilidades (por día, semana, mes)
router.get('/profit', authMiddleware, getProfitReport);

// Productos más vendidos
router.get('/top-products', authMiddleware, getTopProducts);

module.exports = router;
