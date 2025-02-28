// backend/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductByBarcode
} = require('../controllers/productController');

const authMiddleware = require('../middlewares/authMiddleware');
const verifyAdmin = require('../middlewares/verifyAdmin');

// -- Rutas --
// GET /api/products => Ver todos (podrías requerir solo login, no admin)
router.get('/', authMiddleware, getAllProducts);

// GET /api/products/:id => Ver detalle de producto
router.get('/:id', authMiddleware, getProductById);

// GET /api/products/:id => Ver detalle de producto
router.get('/barcode/:code', authMiddleware, getProductByBarcode);

// POST /api/products => Crear producto (solo admin)
router.post('/', authMiddleware, verifyAdmin, createProduct);

// PUT /api/products/:id => Actualizar producto (solo admin)
router.put('/:id', authMiddleware, verifyAdmin, updateProduct);

// DELETE /api/products/:id => Eliminar producto (solo admin)
router.delete('/:id', authMiddleware, verifyAdmin, deleteProduct);

module.exports = router;
