// backend/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // 1. Obtener el header Authorization
  const authHeader = req.headers.authorization;

  // Si no existe el header, negamos acceso
  if (!authHeader) {
    return res.status(401).json({ error: 'No se proporcionó un token' });
  }

  // 2. El formato esperado es "Bearer <token>"
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    // 3. Verificar el token con jwt.verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Guardamos la info del token (payload) en req.user
    req.user = decoded;

    // 5. Continuar a la ruta
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = authMiddleware;
