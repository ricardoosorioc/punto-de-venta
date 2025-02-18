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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
