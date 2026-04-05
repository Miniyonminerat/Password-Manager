// ══════════════════════════════════════════
// middleware.js — Verificación de JWT
//
// Este middleware protege las rutas privadas.
// Se ejecuta ANTES del handler de cada ruta
// y verifica que el usuario esté autenticado.
//
// Flujo:
//   Cliente envía: Authorization: Bearer <token>
//   Middleware verifica el token con JWT_SECRET
//   Si es válido → agrega req.usuario y llama next()
//   Si es inválido → responde 401 Unauthorized
// ══════════════════════════════════════════

'use strict';

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  // Leer el header Authorization
  const authHeader = req.headers['authorization'];

  // El formato esperado es "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado. Debes iniciar sesión.',
    });
  }

  try {
    // Verificar y decodificar el token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar los datos del usuario en el request
    // para que los handlers los puedan usar
    req.usuario = payload;

    next(); // Continuar con el siguiente middleware o handler
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado. Inicia sesión de nuevo.',
    });
  }
}

module.exports = { verificarToken };
