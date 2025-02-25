// backend/src/controllers/salesController.js
const pool = require('../config/db');

/**
 * Crear una nueva venta.
 * Esperamos en req.body algo como:
 * {
 *   payment_method: "efectivo" | "tarjeta" | etc.,
 *   items: [
 *     { product_id: 1, quantity: 2, unit_price?: 1000 },
 *     { product_id: 5, quantity: 1 }
 *   ]
 * }
 * Tomaremos user_id desde req.user.id (el que hace la venta)
 */
exports.createSale = async (req, res) => {
  const client = await pool.connect(); // Para manejar transacción
  try {
    const userId = req.user.id; // Viene del token JWT (authMiddleware)
    const { payment_method, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debes enviar al menos 1 ítem en la venta.' });
    }

    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Insertar registro en "sales" con user_id, payment_method
    const saleResult = await client.query(
      `INSERT INTO sales (user_id, payment_method, total)
       VALUES ($1, $2, 0)  -- total temporalmente 0
       RETURNING id, user_id, sale_date, payment_method, total`,
      [userId, payment_method || 'efectivo']
    );
    const saleId = saleResult.rows[0].id;

    let totalVenta = 0;

    // 2. Insertar cada item en sale_items, descontar stock, acumular total
    for (const item of items) {
      const { product_id, quantity } = item;
      if (!product_id || !quantity) {
        throw new Error('Cada item debe tener product_id y quantity.');
      }

      // Tomar info del producto
      const productRes = await client.query('SELECT * FROM products WHERE id = $1', [product_id]);
      if (productRes.rows.length === 0) {
        throw new Error(`Producto con id ${product_id} no existe.`);
      }
      const product = productRes.rows[0];

      // Verificar stock
      if (product.stock < quantity) {
        throw new Error(`No hay stock suficiente del producto ${product.name}.`);
      }

      // Determinar precio unitario (o usar item.unit_price si lo mandan)
      const unitPrice = item.unit_price || product.price || 0;

      // Acumular total
      const subtotal = unitPrice * quantity;
      totalVenta += subtotal;

      // Insertar el detalle en sale_items
      await client.query(
        `INSERT INTO sale_items
         (sale_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [saleId, product_id, quantity, unitPrice]
      );

      // Descontar stock del producto
      const newStock = product.stock - quantity;
      await client.query(
        `UPDATE products
         SET stock = $1
         WHERE id = $2`,
        [newStock, product_id]
      );
    }

    // 3. Actualizar el total en sales
    await client.query(
      `UPDATE sales
       SET total = $1
       WHERE id = $2`,
      [totalVenta, saleId]
    );

    // 4. Confirmar transacción
    await client.query('COMMIT');

    // Retornar info de la venta
    res.status(201).json({
      message: 'Venta creada exitosamente',
      sale: {
        id: saleId,
        user_id: saleResult.rows[0].user_id,
        sale_date: saleResult.rows[0].sale_date,
        payment_method: saleResult.rows[0].payment_method,
        total: totalVenta
      }
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    // Hacer rollback
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Error al crear la venta' });
  } finally {
    client.release();
  }
};

/**
 * Obtener todas las ventas (encabezado).
 * Opcionalmente, podrías unir con el nombre del usuario (JOIN users)
 */
exports.getAllSales = async (req, res) => {
  try {
    // Podrías hacer un JOIN a la tabla de usuarios para saber quién la hizo
    const result = await pool.query(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

/**
 * Obtener detalles de una venta por ID.
 * Incluye encabezado y sus items.
 */
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Encabezado
    const saleRes = await pool.query(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
    `, [id]);

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    const sale = saleRes.rows[0];

    // Items
    const itemsRes = await pool.query(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = $1
    `, [id]);
    const items = itemsRes.rows;

    res.json({
      sale,
      items
    });
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({ error: 'Error al obtener la venta' });
  }
};
