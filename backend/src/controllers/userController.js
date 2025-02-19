// backend/src/controllers/userController.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Obtener todos los usuarios
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
};

// Actualizar un usuario (cambiar nombre, email, role, etc.)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // Aquí no estamos cambiando la contraseña. Para cambiar password,
    // podrías hacer una ruta aparte, con bcrypt.
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role)
       WHERE id = $4
       RETURNING id, name, email, role, created_at`,
      [name, email, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Usuario actualizado',
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
};


exports.changePassword = async (req, res) => {
    /**
 * Permite cambiar la contraseña de un usuario.
 * Reglas:
 *  - Si el rol del que hace la solicitud (req.user.role) es "admin", puede:
 *    cambiar la suya propia o la de un usuario con rol "vendedor".
 *  - Si el rol es "vendedor", solo puede cambiar su propia contraseña.
 */
    try {
      const { id } = req.params;           // El ID del usuario al que se le quiere cambiar el pass
      const { newPassword } = req.body;    // La nueva contraseña
      const requester = req.user;          // Info del usuario logueado (id, role, etc.) traída por el token
  
      // 1. Validar que venga la nueva contraseña
      if (!newPassword) {
        return res.status(400).json({ error: 'Falta el campo "newPassword"' });
      }
  
      // 2. Consultar el usuario que se quiere actualizar
      const userToUpdateQuery = await pool.query(
        'SELECT id, role FROM users WHERE id = $1',
        [id]
      );
      if (userToUpdateQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const userToUpdate = userToUpdateQuery.rows[0];
  
      // 3. Verificar permisos según el rol y el ID
      //    - Si eres "admin", puedes cambiar la contraseña tuya o la de un "vendedor".
      //    - Si eres "vendedor", solo tu propia contraseña.
  
      if (requester.role === 'admin') {
        // Admin NO puede cambiar la contraseña de otro admin, excepto si es él mismo
        if (userToUpdate.role === 'admin' && userToUpdate.id !== requester.id) {
          return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro administrador' });
        }
        // (Si es admin y el userToUpdate es él mismo o un vendedor, pasa sin problemas)
      } else if (requester.role === 'vendedor') {
        // Vendedor solo puede cambiar la suya
        if (userToUpdate.id !== requester.id) {
          return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario' });
        }
      } else {
        // Si hubiera más roles, podríamos manejarlos acá
        return res.status(403).json({ error: 'Rol no autorizado para esta acción' });
      }
  
      // 4. Hashear la nueva contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
      // 5. Actualizar en la base de datos
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, userToUpdate.id]
      );
  
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
  };
