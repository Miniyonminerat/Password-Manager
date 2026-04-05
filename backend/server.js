// ══════════════════════════════════════════
// server.js — Punto de entrada
// Primero inicializa la base de datos,
// luego arranca Express.
// ══════════════════════════════════════════

'use strict';

require('dotenv').config();

const { iniciarDB } = require('./db');
const PORT = process.env.PORT || 3000;

// Iniciar DB primero, luego el servidor
iniciarDB().then(() => {
  const app = require('./app');

  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Presiona Ctrl+C para detenerlo\n`);
  });

}).catch(err => {
  console.error('❌ Error al iniciar la base de datos:', err);
  process.exit(1);
});
