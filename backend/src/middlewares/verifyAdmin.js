// backend/src/middlewares/verifyAdmin.js
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador' });
    }
    next();
  };
  
  module.exports = verifyAdmin;
  