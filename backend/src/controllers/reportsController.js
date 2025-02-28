// backend/src/controllers/reportsController.js
const pool = require('../config/db');

/**
 * GET /api/reports/sales?range=daily|weekly|monthly
 * Devuelve un arreglo con las ventas por fecha (o agrupadas).
 */
exports.getSalesReport = async (req, res) => {
  try {
    const { range } = req.query; // daily, weekly, monthly
    let groupByClause = '';
    let selectDateClause = '';

    if (range === 'daily') {
      // agrupar por fecha (YYYY-MM-DD)
      selectDateClause = "TO_CHAR(sale_date, 'YYYY-MM-DD') as date_label";
      groupByClause = "TO_CHAR(sale_date, 'YYYY-MM-DD')";
    } else if (range === 'weekly') {
      // agrupar por semana (aquí un approach simple)
      selectDateClause = "TO_CHAR(date_trunc('week', sale_date), 'YYYY-\"W\"IW') as date_label";
      groupByClause = "date_trunc('week', sale_date)";
    } else if (range === 'monthly') {
      selectDateClause = "TO_CHAR(sale_date, 'YYYY-MM') as date_label";
      groupByClause = "TO_CHAR(sale_date, 'YYYY-MM')";
    } else {
      // default: daily
      selectDateClause = "TO_CHAR(sale_date, 'YYYY-MM-DD') as date_label";
      groupByClause = "TO_CHAR(sale_date, 'YYYY-MM-DD')";
    }

    const sql = `
      SELECT 
        ${selectDateClause},
        SUM(total) as total_sales
      FROM sales
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} ASC
    `;

    const result = await pool.query(sql);
    res.json(result.rows); // array con { date_label, total_sales }
  } catch (error) {
    console.error('Error getSalesReport:', error);
    res.status(500).json({ error: 'Error al generar reporte de ventas' });
  }
};

/**
 * GET /api/reports/profit?range=daily|weekly|monthly
 * Calcula (ingresos - costos). 
 * Ingresos = SUM(total) en "sales"
 * Costos = SUM( (sale_items.quantity * producto.cost) )? 
 * O si guardaste unit_cost, se hace un JOIN con los productos para sacar el cost. 
 */
exports.getProfitReport = async (req, res) => {
  try {
    const { range } = req.query;
    let groupByClause = '';
    let selectDateClause = '';

    if (range === 'daily') {
      selectDateClause = "TO_CHAR(s.sale_date, 'YYYY-MM-DD') as date_label";
      groupByClause = "TO_CHAR(s.sale_date, 'YYYY-MM-DD')";
    } else if (range === 'weekly') {
      selectDateClause = "TO_CHAR(date_trunc('week', s.sale_date), 'YYYY-\"W\"IW') as date_label";
      groupByClause = "date_trunc('week', s.sale_date)";
    } else if (range === 'monthly') {
      selectDateClause = "TO_CHAR(s.sale_date, 'YYYY-MM') as date_label";
      groupByClause = "TO_CHAR(s.sale_date, 'YYYY-MM')";
    } else {
      selectDateClause = "TO_CHAR(s.sale_date, 'YYYY-MM-DD') as date_label";
      groupByClause = "TO_CHAR(s.sale_date, 'YYYY-MM-DD')";
    }

    // Supongamos que calculas costo con un JOIN a products 
    // (o si guardaste unit_cost en sale_items lo usas directamente).
    // Ejemplo: 
    // cost_total = SUM( sale_items.quantity * p.cost )
    // income_total = SUM( sale_items.quantity * sale_items.unit_price )

    // Para simplificar, un approach: 
    // SELECT date_label, (income_total - cost_total) as profit
    // Podrías agrupar en subconsultas o usar un CTE.

    const sql = `
      SELECT
        ${selectDateClause},
        SUM(si.quantity * si.unit_price) AS income_total,
        SUM(si.quantity * p.cost) AS cost_total
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      JOIN products p ON p.id = si.product_id
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause} ASC
    `;
    
    const result = await pool.query(sql);

    // Mapear para devolver date_label + profit
    const mapped = result.rows.map(row => {
      const profit = (parseFloat(row.income_total) || 0) - (parseFloat(row.cost_total) || 0);
      return {
        date_label: row.date_label,
        income_total: row.income_total,
        cost_total: row.cost_total,
        profit
      };
    });
    res.json(mapped);
  } catch (error) {
    console.error('Error getProfitReport:', error);
    res.status(500).json({ error: 'Error al generar reporte de utilidades' });
  }
};

/**
 * GET /api/reports/top-products?limit=10
 * Lista los productos más vendidos (sumar sale_items.quantity)
 */
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Podrías agrupar por product_id, sum(quantity)
    // y unirte a products para obtener el nombre
    const sql = `
      SELECT 
        p.id,
        p.name,
        SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      GROUP BY p.id
      ORDER BY SUM(si.quantity) DESC
      LIMIT $1
    `;
    const result = await pool.query(sql, [limit]);
    res.json(result.rows); // { id, name, total_sold }
  } catch (error) {
    console.error('Error getTopProducts:', error);
    res.status(500).json({ error: 'Error al obtener productos más vendidos' });
  }
};
