// backend/src/controllers/productController.js
const pool = require("../config/db");
const { customAlphabet } = require("nanoid");

// Un generador de 12 dígitos (para EAN13 se necesitan 13, uno es el check digit)
const generateEANlike = customAlphabet("0123456789", 12);

// Crear producto
exports.createProduct = async (req, res) => {
  try {
    let {
      name,
      description,
      cost,
      price,
      stock,
      barcode,
      is_composite,
      children,
    } = req.body;
    //let { barcode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El campo "name" es obligatorio' });
    }

    // Si no viene barcode, generamos uno
    if (!barcode) {
      // Generar un string de 12 dígitos
      const partialCode = generateEANlike(); // p.ej. "849302938210"

      // Podrías calcular un check-digit si quieres ser más formal,
      // pero para un POS simple, basta con partialCode.
      barcode = partialCode;
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
        barcode ,
        is_composite || false,
      ]
    );

    const newProduct = result.rows[0];
    const parentId = newProduct.id;

    // Ahora sí, insertamos children
    if (newProduct.is_composite && Array.isArray(children)) {
      for (const child of children) {
        const { child_product_id, quantity } = child;
        await pool.query(
          `INSERT INTO product_compositions
           (parent_product_id, child_product_id, quantity)
           VALUES ($1, $2, $3)`,
          [parentId, child_product_id, quantity || 1]
        );
      }
    }

    res.status(201).json({
      message: "Producto creado exitosamente",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
};

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
  try {
    // Si no hay query "search", devuelves todo. Si hay, filtras.
    const search = req.query.search || "";

    let query = "SELECT * FROM products";
    let params = [];
    if (search) {
      // Filtrar por nombre usando ILIKE (no sensible a mayúsculas)
      query += " WHERE name ILIKE $1";
      params.push(`%${search}%`);
    }
    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    // 1. Encabezado del producto
    const productRes = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    const product = productRes.rows[0];

    // 2. Si es compuesto, consultar sus hijos
    let children = [];
    if (product.is_composite) {
      const compRes = await pool.query(
        `SELECT pc.*, p.name as child_name, p.price as child_price, p.cost as child_cost
         FROM product_compositions pc
         JOIN products p ON p.id = pc.child_product_id
         WHERE pc.parent_product_id = $1`,
        [id]
      );
      children = compRes.rows; // array con (child_product_id, quantity, child_name, etc.)
    }

    res.json({
      product,
      children,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener producto" });
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
      is_composite,
      children,
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
      [name, description, cost, price, stock, barcode, is_composite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const updatedProduct = result.rows[0];

    // 2. Si es compuesto, gestionar children
    //    Borramos composiciones existentes y volvemos a insertar
    await pool.query(
      "DELETE FROM product_compositions WHERE parent_product_id = $1",
      [id]
    );

    if (updatedProduct.is_composite && Array.isArray(children)) {
      for (const child of children) {
        const { child_product_id, quantity } = child;
        await pool.query(
          `INSERT INTO product_compositions
           (parent_product_id, child_product_id, quantity)
           VALUES ($1, $2, $3)`,
          [id, child_product_id, quantity || 1]
        );
      }
    }

    res.json({
      message: "Producto actualizado exitosamente",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
};
