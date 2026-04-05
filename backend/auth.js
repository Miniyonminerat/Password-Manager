// ══════════════════════════════════════════
// auth.js — Rutas de autenticación
// POST /api/auth/register
// POST /api/auth/login
// ══════════════════════════════════════════

'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');  // bcryptjs no necesita compilar
const jwt      = require('jsonwebtoken');
const { getOne, run } = require('./db');

const router      = express.Router();
const SALT_ROUNDS = 12;


// ── POST /api/auth/register ────────────────
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }

  const emailLower = email.trim().toLowerCase();

  const existente = getOne('SELECT id FROM usuarios WHERE email = ?', [emailLower]);
  if (existente) {
    return res.status(409).json({ error: 'Este correo ya está registrado.' });
  }

  try {
    // Hashear contraseña — NUNCA guardar en texto plano
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { lastInsertRowid } = run(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre.trim(), emailLower, passwordHash]
    );

    // Crear vault vacío para este usuario
    run(
      'INSERT INTO vaults (usuario_id, datos) VALUES (?, ?)',
      [lastInsertRowid, JSON.stringify({ iv: [], data: [] })]
    );

    res.status(201).json({ mensaje: 'Cuenta creada exitosamente.' });

  } catch (err) {
    console.error('Error en registro:', err.message);
    res.status(500).json({ error: 'Error al crear la cuenta.' });
  }
});


// ── POST /api/auth/login ───────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
  }

  const usuario = getOne('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);

  // Mismo mensaje para email y contraseña incorrectos (seguridad)
  if (!usuario) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  try {
    const correcta = await bcrypt.compare(password, usuario.password);

    if (!correcta) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      mensaje: 'Sesión iniciada.',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    });

  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});


module.exports = router;
