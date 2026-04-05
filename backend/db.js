// ══════════════════════════════════════════
// db.js — Base de datos con sql.js
// Usa sql.js en lugar de better-sqlite3
// porque NO necesita compilar nada en Windows.
// Los datos se guardan en un archivo .db igual.
// ══════════════════════════════════════════

'use strict';

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, process.env.DB_FILE || 'vault.db');

let db = null;

// Guarda el archivo cada vez que hay cambios
function persistir() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Inicializa la base de datos (async porque sql.js lo requiere)
async function iniciarDB() {
  const SQL = await initSqlJs();

  // Si ya existe el archivo, cargarlo. Si no, crear uno nuevo.
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log(`📦 Base de datos cargada: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`📦 Base de datos nueva creada: ${DB_PATH}`);
  }

  // Crear tablas si no existen
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL,
      email     TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL,
      creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vaults (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL UNIQUE,
      datos       TEXT NOT NULL,
      actualizado TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  persistir();
  return db;
}

// Helpers para simplificar queries

function getOne(sql, params = []) {
  const stmt   = db.prepare(sql);
  const result = stmt.getAsObject(params);
  stmt.free();
  return Object.keys(result).length === 0 ? null : result;
}

function getAll(sql, params = []) {
  const stmt    = db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function run(sql, params = []) {
  db.run(sql, params);
  persistir();
  // Obtener el último id insertado
  const lastId = getOne('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: lastId ? lastId.id : null };
}

module.exports = { iniciarDB, getOne, getAll, run };
