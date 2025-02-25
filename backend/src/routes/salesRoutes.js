// backend/src/routes/salesRoutes.js
const express = require('express');
const { createSale, getAllSales, getSaleById } = require('../controllers/salesController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /api/sales => Crear venta
router.post('/', authMiddleware, createSale);

// GET /api/sales => Listar todas las ventas
router.get('/', authMiddleware, getAllSales);

// GET /api/sales/:id => Detalle de venta (encabezado + items)
router.get('/:id', authMiddleware, getSaleById);

// Podrías agregar: router.delete('/:id', authMiddleware, deleteSale) si lo implementas

module.exports = router;
