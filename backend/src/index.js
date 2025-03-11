// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', routes);

// Puesto que configuramos el script en package.json, tomamos el puerto de env o 4000
const PORT = process.env.PORT || 4000;

// ==========================
// 🏓 API para mantener vivo el backend
// ==========================
app.get("/api/ping", (req, res) => {
  res.status(200).send("OK");
});

// ==========================
// 🔄 Auto-Ping cada 10 minutos
// ==========================
const keepAlive = () => {
  const BACKEND_URL = process.env.RENDER_BACKEND_URL || "https://punto-venta-backend.onrender.com";
  setInterval(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ping`);
      const text = await response.text();
      console.log(`[KEEP-ALIVE] Ping exitoso: ${text}`);
    } catch (error) {
      console.error("[KEEP-ALIVE] Error al hacer ping:", error);
    }
  }, 10 * 60 * 1000); // Cada 10 minutos
};

// Ejecutar la función para mantener vivo el servidor
keepAlive();



app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
