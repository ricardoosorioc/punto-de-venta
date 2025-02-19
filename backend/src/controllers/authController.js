// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // nuestra conexión a Postgres
require('dotenv').config();

// Registrar un nuevo usuario
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validar que vengan los campos necesarios
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos (name, email, password)' });
    }

    // 2. Verificar si el usuario (email o name) ya existe
    const userExist = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR name = $2',
      [email, name]
    );
    if (userExist.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe (email o name repetido)' });
    }

    // 3. Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Insertar en la BD
    //    role es opcional, si no viene, quedará 'vendedor' por defecto
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, role || 'vendedor']
    );

    // 5. Devolver respuesta
    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: newUser.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login de usuario
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validar que vengan email y password
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos (email, password)' });
    }

    // 2. Verificar si existe el usuario con ese email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'El usuario no existe' });
    }

    const user = userResult.rows[0];

    // 3. Comparar contraseñas
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 4. Generar JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // el token expira en 1 día
    );

    // 5. Devolver el token al cliente
    res.status(200).json({
      message: 'Login exitoso',
      token: token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};
