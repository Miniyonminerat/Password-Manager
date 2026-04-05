/* ══════════════════════════════════════════
   Vault Seguro — script.js
   Descripción: Lógica completa del Password Manager
   Tecnologías de seguridad usadas:
     - PBKDF2 (100,000 iteraciones) para derivar la clave
     - AES-256-GCM para cifrado simétrico autenticado
     - Web Crypto API nativa del navegador
   ══════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   CONSTANTES Y ESTADO GLOBAL
   ══════════════════════════════════════════ */

const DB_KEY = 'vault_v2';

// Estado de la sesión activa (null cuando está cerrada)
let session = null;

// Índice de la entrada que se está editando (-1 = nueva)
let editIdx = -1;

// Categoría activa en el filtro del vault
let activeCat = 'Todas';

// Colores para los avatares (fondo:texto)
const AVATAR_PALETTES = [
  ['#e6f1fb', '#0c447c'],
  ['#e1f5ee', '#085041'],
  ['#eeedfe', '#3c3489'],
  ['#faece7', '#712b13'],
  ['#faeeda', '#633806'],
  ['#fbeaf0', '#72243e'],
];

// Colores por nivel de fortaleza (índice 1-4)
const STR_COLORS = ['', '#e24b4a', '#ef9f27', '#639922', '#185fa5'];
const STR_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];


/* ══════════════════════════════════════════
   CRIPTOGRAFÍA — Web Crypto API
   ══════════════════════════════════════════ */

/**
 * Deriva una clave AES-256 a partir de una contraseña y un salt.
 * Usa PBKDF2 con SHA-256 y 100,000 iteraciones (estándar NIST).
 *
 * @param {string} password - Contraseña maestra del usuario
 * @param {Uint8Array} salt  - Salt aleatorio de 16 bytes
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    rawKey,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra datos con AES-256-GCM.
 * Genera un IV aleatorio de 12 bytes por cada cifrado.
 *
 * @param {CryptoKey} key  - Clave AES derivada
 * @param {any} data       - Datos a cifrar (se serializa a JSON)
 * @returns {Promise<{iv: number[], data: number[]}>}
 */
async function aesEncrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encoded = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoded
  );

  return {
    iv:   Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext)),
  };
}

/**
 * Descifra datos con AES-256-GCM.
 * Si la clave es incorrecta, lanza un error (autenticación fallida).
 *
 * @param {CryptoKey} key                       - Clave AES derivada
 * @param {{iv: number[], data: number[]}} blob - Datos cifrados
 * @returns {Promise<any>}
 */
async function aesDecrypt(key, blob) {
  const decoder = new TextDecoder();

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(blob.iv) },
    key,
    new Uint8Array(blob.data)
  );

  return JSON.parse(decoder.decode(plaintext));
}


/* ══════════════════════════════════════════
   BASE DE DATOS LOCAL (localStorage)
   ══════════════════════════════════════════ */

/**
 * Lee la base de datos del localStorage.
 * Estructura: { users: { email: { name, salt, vault } } }
 */
function getDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || { users: {} };
  } catch {
    return { users: {} };
  }
}

/** Guarda la base de datos en localStorage. */
function setDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

/** Persiste el vault de la sesión activa cifrado. */
async function saveVault() {
  const db = getDB();
  db.users[session.email].vault = await aesEncrypt(session.key, session.entries);
  setDB(db);
}


/* ══════════════════════════════════════════
   AUTENTICACIÓN
   ══════════════════════════════════════════ */

/** Alterna entre las pestañas de login y registro. */
function authTab(tab) {
  document.getElementById('pane-in').classList.toggle('hidden', tab !== 'in');
  document.getElementById('pane-up').classList.toggle('hidden', tab !== 'up');
  document.getElementById('tab-in').classList.toggle('active', tab === 'in');
  document.getElementById('tab-up').classList.toggle('active', tab === 'up');
}

/** Registra un nuevo usuario. */
async function doRegister() {
  const name  = document.getElementById('ru-name').value.trim();
  const email = document.getElementById('ru-email').value.trim().toLowerCase();
  const pw    = document.getElementById('ru-pw').value;
  const pw2   = document.getElementById('ru-pw2').value;
  const errEl = document.getElementById('ru-err');
  const okEl  = document.getElementById('ru-ok');

  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!name || !email || pw.length < 8 || pw !== pw2) {
    errEl.textContent    = 'Las contraseñas no coinciden o son muy cortas.';
    errEl.style.display  = 'block';
    return;
  }

  const db = getDB();

  if (db.users[email]) {
    errEl.textContent   = 'Este correo ya está registrado.';
    errEl.style.display = 'block';
    return;
  }

  // Generar salt, derivar clave, cifrar vault vacío
  const salt  = crypto.getRandomValues(new Uint8Array(16));
  const key   = await deriveKey(pw, salt);
  const vault = await aesEncrypt(key, []);

  db.users[email] = {
    name:  name,
    salt:  Array.from(salt),
    vault: vault,
  };

  setDB(db);

  okEl.style.display = 'block';
  ['ru-name', 'ru-email', 'ru-pw', 'ru-pw2'].forEach(id => {
    document.getElementById(id).value = '';
  });

  setTimeout(() => authTab('in'), 1500);
}

/** Inicia sesión con un usuario existente. */
async function doLogin() {
  const email = document.getElementById('li-email').value.trim().toLowerCase();
  const pw    = document.getElementById('li-pw').value;
  const errEl = document.getElementById('li-err');

  errEl.style.display = 'none';

  const db   = getDB();
  const user = db.users[email];

  if (!user) {
    errEl.style.display = 'block';
    return;
  }

  try {
    const salt    = new Uint8Array(user.salt);
    const key     = await deriveKey(pw, salt);
    const entries = await aesDecrypt(key, user.vault);

    session = { email, name: user.name, key, entries };
    document.getElementById('li-pw').value = '';

    showApp();
  } catch {
    // aesDecrypt lanzará error si la contraseña es incorrecta
    errEl.style.display = 'block';
  }
}

/** Cierra la sesión activa. */
function doLogout() {
  session = null;
  showScreen('auth');
}


/* ══════════════════════════════════════════
   NAVEGACIÓN ENTRE PANTALLAS Y PÁGINAS
   ══════════════════════════════════════════ */

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function showApp() {
  showScreen('app');

  const initials = session.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  document.getElementById('sidebar-av').textContent   = initials;
  document.getElementById('sidebar-name').textContent = session.name;

  goPage('vault');
}

function goPage(page) {
  const pages = ['vault', 'gen', 'audit'];

  pages.forEach(p => {
    document.getElementById('page-' + p).classList.toggle('hidden', p !== page);
    document.getElementById('nav-' + p).classList.toggle('active', p === page);
  });

  if (page === 'vault') renderVault();
  if (page === 'audit') renderAudit();
  if (page === 'gen')   genPw();
}


/* ══════════════════════════════════════════
   FORTALEZA DE CONTRASEÑAS
   ══════════════════════════════════════════ */

/**
 * Calcula la fortaleza de una contraseña en escala 0-4.
 * Criterios: longitud, mezcla de mayúsculas/minúsculas, números, símbolos.
 */
function pwStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, Math.ceil(score * 4 / 5));
}

/**
 * Actualiza visualmente la barra de fortaleza.
 * @param {string} password - Contraseña a evaluar
 * @param {string} barId    - ID del contenedor de la barra (ej: 'f-bar')
 */
function chkStr(password, barId) {
  const level  = pwStrength(password);
  const prefix = barId.replace('-bar', '');

  for (let i = 1; i <= 4; i++) {
    const seg = document.getElementById(prefix + '-s' + i);
    if (seg) {
      seg.style.background = i <= level
        ? STR_COLORS[level]
        : 'var(--color-border-light)';
    }
  }
}

function getBadgeHTML(password) {
  const level = pwStrength(password);
  if (level <= 1) return '<span class="badge weak">Débil</span>';
  if (level <= 2) return '<span class="badge fair">Regular</span>';
  return '<span class="badge strong">Fuerte</span>';
}


/* ══════════════════════════════════════════
   VAULT — RENDERIZADO
   ══════════════════════════════════════════ */

function getCategories() {
  const cats = new Set(
    (session?.entries || []).map(e => e.cat).filter(Boolean)
  );
  return ['Todas', ...cats];
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function colorFor(name) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[hash];
}

function renderCatFilter() {
  const cats = getCategories();
  document.getElementById('cat-filter').innerHTML = cats
    .map(cat => `
      <div class="cat-pill ${cat === activeCat ? 'active' : ''}"
           onclick="activeCat = '${cat}'; renderVault()">
        ${cat}
      </div>
    `)
    .join('');
}

function renderVault() {
  if (!session) return;

  const query   = (document.getElementById('search').value || '').toLowerCase();
  const entries = session.entries;

  // Estadísticas
  const weakCount = entries.filter(e => pwStrength(e.password) <= 2).length;
  const catCount  = new Set(entries.map(e => e.cat).filter(Boolean)).size;

  document.getElementById('st-total').textContent = entries.length;
  document.getElementById('st-cats').textContent  = catCount;
  document.getElementById('st-weak').textContent  = weakCount;
  document.getElementById('vault-sub').textContent =
    `Hola, ${session.name.split(' ')[0]} — ${entries.length} contraseña${entries.length !== 1 ? 's' : ''} guardada${entries.length !== 1 ? 's' : ''}`;

  renderCatFilter();

  // Filtrar por búsqueda y categoría
  const filtered = entries.filter(e => {
    const matchQuery = !query
      || e.name.toLowerCase().includes(query)
      || (e.user || '').toLowerCase().includes(query)
      || (e.cat  || '').toLowerCase().includes(query);

    const matchCat = activeCat === 'Todas' || e.cat === activeCat;
    return matchQuery && matchCat;
  });

  const listEl = document.getElementById('vault-list');

  if (!filtered.length) {
    listEl.innerHTML = '<div class="empty">No hay contraseñas aquí aún.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(entry => {
    const idx        = entries.indexOf(entry);
    const [bg, fg]   = colorFor(entry.name);
    const catLabel   = entry.cat
      ? ` · <span style="color:var(--color-text-tertiary)">${entry.cat}</span>`
      : '';

    return `
      <div class="entry" onclick="openEdit(${idx})">
        <div class="entry-av" style="background:${bg}; color:${fg}">
          ${getInitials(entry.name)}
        </div>
        <div style="flex:1; min-width:0">
          <div class="entry-name">${entry.name}</div>
          <div class="entry-user">${entry.user || '—'}${catLabel}</div>
        </div>
        <div class="entry-right">
          ${getBadgeHTML(entry.password)}
          <button class="btn sm" onclick="event.stopPropagation(); copyEntry(${idx})">
            Copiar
          </button>
        </div>
      </div>
    `;
  }).join('');
}


/* ══════════════════════════════════════════
   VAULT — MODAL AGREGAR / EDITAR
   ══════════════════════════════════════════ */

function openAdd() {
  editIdx = -1;
  document.getElementById('modal-ttl').textContent = 'Nueva contraseña';
  document.getElementById('del-btn').classList.add('hidden');
  ['f-name', 'f-user', 'f-pw', 'f-cat', 'f-url', 'f-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('modal').classList.add('open');
}

function openEdit(idx) {
  editIdx = idx;
  const entry = session.entries[idx];

  document.getElementById('modal-ttl').textContent = 'Editar: ' + entry.name;
  document.getElementById('del-btn').classList.remove('hidden');

  document.getElementById('f-name').value  = entry.name    || '';
  document.getElementById('f-user').value  = entry.user    || '';
  document.getElementById('f-pw').value    = entry.password|| '';
  document.getElementById('f-cat').value   = entry.cat     || '';
  document.getElementById('f-url').value   = entry.url     || '';
  document.getElementById('f-notes').value = entry.notes   || '';

  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

async function saveEntry() {
  const name = document.getElementById('f-name').value.trim();
  const user = document.getElementById('f-user').value.trim();
  const pw   = document.getElementById('f-pw').value;

  if (!name || !user || !pw) {
    alert('Nombre, usuario y contraseña son obligatorios.');
    return;
  }

  const entry = {
    name:     name,
    user:     user,
    password: pw,
    cat:      document.getElementById('f-cat').value.trim(),
    url:      document.getElementById('f-url').value.trim(),
    notes:    document.getElementById('f-notes').value.trim(),
    created:  new Date().toISOString(),
  };

  if (editIdx >= 0) {
    session.entries[editIdx] = entry;
  } else {
    session.entries.unshift(entry);
  }

  await saveVault();
  closeModal();
  renderVault();
}

async function deleteEntry() {
  if (!confirm('¿Eliminar esta entrada permanentemente?')) return;
  session.entries.splice(editIdx, 1);
  await saveVault();
  closeModal();
  renderVault();
}

function copyEntry(idx) {
  navigator.clipboard.writeText(session.entries[idx].password);
  alert('Contraseña copiada. Se borrará del portapapeles en 30 segundos.');
  setTimeout(() => navigator.clipboard.writeText(''), 30000);
}

function toggleFPw() {
  const input = document.getElementById('f-pw');
  input.type = input.type === 'password' ? 'text' : 'password';
}


/* ══════════════════════════════════════════
   GENERADOR DE CONTRASEÑAS
   ══════════════════════════════════════════ */

function generatePw() {
  const length  = parseInt(document.getElementById('gen-len')?.value || 20);
  const upper   = document.getElementById('gen-upper')?.checked !== false;
  const nums    = document.getElementById('gen-num')?.checked !== false;
  const symbols = document.getElementById('gen-sym')?.checked !== false;

  let charset = 'abcdefghijklmnopqrstuvwxyz';
  if (upper)   charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (nums)    charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  return Array.from(randomBytes)
    .map(byte => charset[byte % charset.length])
    .join('');
}

function genPw() {
  const password = generatePw();
  document.getElementById('gen-display').textContent = password;

  const level = pwStrength(password);
  for (let i = 1; i <= 4; i++) {
    const seg = document.getElementById('gen-s' + i);
    if (seg) seg.style.background = i <= level
      ? STR_COLORS[level]
      : 'var(--color-border-light)';
  }

  const lblEl = document.getElementById('gen-lbl');
  if (lblEl) lblEl.textContent = STR_LABELS[level] || '';
}

function copyGen() {
  const pw = document.getElementById('gen-display').textContent;
  if (pw && pw !== 'Haz clic en Generar') {
    navigator.clipboard.writeText(pw);
    alert('Contraseña copiada.');
  }
}

/** Inserta una contraseña generada en el campo del modal. */
function fillGenPw() {
  const pw = generatePw();
  const input = document.getElementById('f-pw');
  input.value = pw;
  input.type  = 'text';
  chkStr(pw, 'f-bar');
}


/* ══════════════════════════════════════════
   AUDITORÍA DE SEGURIDAD
   ══════════════════════════════════════════ */

function renderAudit() {
  if (!session) return;

  const entries = session.entries;
  const listEl  = document.getElementById('audit-list');

  if (!entries.length) {
    listEl.innerHTML = '<div class="empty">No tienes contraseñas guardadas aún.</div>';
    return;
  }

  listEl.innerHTML = entries.map((entry, idx) => {
    const level = pwStrength(entry.password);

    let iconChar, bg, fg, message;

    if (level <= 1) {
      iconChar = '!';
      bg       = 'var(--color-bg-danger)';
      fg       = 'var(--color-text-danger)';
      message  = 'Contraseña muy débil — cámbiala pronto';
    } else if (level <= 2) {
      iconChar = '~';
      bg       = 'var(--color-bg-warning)';
      fg       = 'var(--color-text-warning)';
      message  = 'Podría ser más segura';
    } else {
      iconChar = '✓';
      bg       = 'var(--color-bg-success)';
      fg       = 'var(--color-text-success)';
      message  = 'Contraseña segura';
    }

    return `
      <div class="audit-item">
        <div class="audit-icon" style="background:${bg}; color:${fg}">
          ${iconChar}
        </div>
        <div style="flex:1; min-width:0">
          <div class="audit-name">${entry.name}</div>
          <div class="audit-msg">${message}</div>
        </div>
        <button class="btn sm" onclick="openEdit(${idx}); goPage('vault')">Editar</button>
      </div>
    `;
  }).join('');
}


/* ══════════════════════════════════════════
   INICIALIZACIÓN
   ══════════════════════════════════════════ */

(async function init() {
  // Crear cuenta demo si no existe ningún usuario
  const db = getDB();

  if (!db.users || Object.keys(db.users).length === 0) {
    const salt  = crypto.getRandomValues(new Uint8Array(16));
    const key   = await deriveKey('demo1234', salt);
    const demoEntries = [
      {
        name: 'Gmail', user: 'usuario@gmail.com', password: 'MiClave123',
        cat: 'Correo', url: 'https://gmail.com', notes: '',
        created: new Date().toISOString(),
      },
      {
        name: 'GitHub', user: 'mi_usuario', password: 'Gh!xK9#mP2qL',
        cat: 'Trabajo', url: 'https://github.com', notes: '',
        created: new Date().toISOString(),
      },
      {
        name: 'Netflix', user: 'usuario@email.com', password: 'netflix',
        cat: 'Entretenimiento', url: 'https://netflix.com', notes: '',
        created: new Date().toISOString(),
      },
    ];

    const vault = await aesEncrypt(key, demoEntries);
    db.users['demo@vault.com'] = {
      name:  'Usuario Demo',
      salt:  Array.from(salt),
      vault: vault,
    };
    setDB(db);
  }

  // Agregar listener Enter en login
  document.getElementById('li-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
})();
