// backend/src/controllers/productController.js
const pool = require('../config/db');

// Crear producto
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      cost,
      price,
      stock,
      barcode,
      is_composite
    } = req.body;

    // Validar campos obligatorios
    if (!name) {
      return res.status(400).json({ error: 'El campo "name" es obligatorio' });
    }

    // Inserción en la BD
    const result = await pool.query(
      `INSERT INTO products
       (name, description, cost, price, stock, barcode, is_composite)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        cost || 0,
        price || 0,
        stock || 0,
        barcode || null,
        is_composite || false
      ]
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    // Si no hay query "search", devuelves todo. Si hay, filtras.
    const search = req.query.search || '';

    let query = 'SELECT * FROM products';
    let params = [];
    if (search) {
      // Filtrar por nombre usando ILIKE (no sensible a mayúsculas)
      query += ' WHERE name ILIKE $1';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      cost,
      price,
      stock,
      barcode,
      is_composite
    } = req.body;

    // Actualizar en la BD
    const result = await pool.query(
      `UPDATE products
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         cost = COALESCE($3, cost),
         price = COALESCE($4, price),
         stock = COALESCE($5, stock),
         barcode = COALESCE($6, barcode),
         is_composite = COALESCE($7, is_composite),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name,
        description,
        cost,
        price,
        stock,
        barcode,
        is_composite,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto actualizado exitosamente',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
