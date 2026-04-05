// ══════════════════════════════════════════
// vault.js — Rutas del vault (protegidas)
// GET /api/vault  → obtener vault cifrado
// PUT /api/vault  → guardar vault cifrado
// ══════════════════════════════════════════

'use strict';

const express             = require('express');
const { getOne, run }     = require('./db');
const { verificarToken }  = require('./middleware');

const router = express.Router();

// Proteger todas las rutas con JWT
router.use(verificarToken);


// ── GET /api/vault ─────────────────────────
router.get('/', (req, res) => {
  const usuarioId = req.usuario.id;

  const vault = getOne(
    'SELECT datos, actualizado FROM vaults WHERE usuario_id = ?',
    [usuarioId]
  );

  if (!vault) {
    return res.status(404).json({ error: 'Vault no encontrado.' });
  }

  res.json({
    vault:       JSON.parse(vault.datos),
    actualizado: vault.actualizado,
  });
});


// ── PUT /api/vault ─────────────────────────
router.put('/', (req, res) => {
  const usuarioId = req.usuario.id;
  const { vault } = req.body;

  if (!vault || !vault.iv || !vault.data) {
    return res.status(400).json({ error: 'El vault cifrado es obligatorio.' });
  }

  try {
    const existente = getOne(
      'SELECT id FROM vaults WHERE usuario_id = ?',
      [usuarioId]
    );

    if (existente) {
      run(
        `UPDATE vaults SET datos = ?, actualizado = datetime('now') WHERE usuario_id = ?`,
        [JSON.stringify(vault), usuarioId]
      );
    } else {
      run(
        'INSERT INTO vaults (usuario_id, datos) VALUES (?, ?)',
        [usuarioId, JSON.stringify(vault)]
      );
    }

    res.json({ mensaje: 'Vault guardado exitosamente.' });

  } catch (err) {
    console.error('Error al guardar vault:', err.message);
    res.status(500).json({ error: 'Error al guardar el vault.' });
  }
});


module.exports = router;
