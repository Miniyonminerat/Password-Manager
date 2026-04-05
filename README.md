# Vault Seguro — Backend

## Cómo correr el servidor paso a paso

### 1. Instalar Node.js
Descarga Node.js desde https://nodejs.org  
Elige la versión LTS (la recomendada). Instálala normalmente.

Verifica que quedó instalado abriendo la terminal y escribiendo:
```
node --version
npm --version
```
Los dos deben mostrar un número de versión.

---

### 2. Abrir la terminal en la carpeta del backend
En Windows: clic derecho dentro de la carpeta → "Abrir en Terminal"  
En Mac: arrastra la carpeta al ícono de Terminal  

---

### 3. Instalar las dependencias
```
npm install
```
Esto descarga todas las librerías listadas en package.json.
Solo necesitas hacerlo una vez.

---

### 4. Configurar el archivo .env
El archivo `.env` ya está creado. Abre y cambia `JWT_SECRET` por
cualquier texto largo y aleatorio. Por ejemplo:
```
JWT_SECRET=mi_clave_super_secreta_que_nadie_sabe_xyz_789
```

---

### 5. Correr el servidor
```
npm start
```
Deberías ver:
```
📦 Base de datos conectada: /ruta/vault.db
✅ Servidor corriendo en http://localhost:3000
```

Para desarrollo (se reinicia automáticamente al guardar cambios):
```
npm run dev
```

---

## Rutas disponibles

| Método | Ruta                    | Descripción                  | Auth |
|--------|-------------------------|------------------------------|------|
| GET    | /                       | Verificar que el server vive | No   |
| POST   | /api/auth/register      | Crear cuenta                 | No   |
| POST   | /api/auth/login         | Iniciar sesión → devuelve JWT| No   |
| GET    | /api/vault              | Obtener vault cifrado        | Sí   |
| PUT    | /api/vault              | Guardar vault cifrado        | Sí   |

---

## Estructura de archivos

```
backend/
├── server.js      → Arranca el servidor en el puerto configurado
├── app.js         → Configura Express, CORS y las rutas
├── db.js          → Conexión a SQLite y creación de tablas
├── auth.js        → Registro y login (bcrypt + JWT)
├── vault.js       → Guardar y leer el vault (rutas protegidas)
├── middleware.js  → Verifica el JWT en rutas protegidas
├── .env           → Variables secretas (NO subir a GitHub)
└── package.json   → Dependencias del proyecto
```

---

## Tecnologías de seguridad usadas

- **bcrypt** — Hashea la contraseña maestra antes de guardarla.
  Nunca se almacena la contraseña en texto plano.
- **JWT** — Genera un token firmado al hacer login.
  El frontend lo envía en cada petición para autenticarse.
- **AES-256-GCM** — El vault se cifra en el navegador antes de
  enviarse. El servidor nunca ve las contraseñas individuales.
- **SQLite** — Base de datos local en un solo archivo (vault.db).

---

## Probar la API con Thunder Client o Postman

**Registrar usuario:**
```
POST http://localhost:3000/api/auth/register
Body (JSON):
{
  "nombre": "Tu Nombre",
  "email": "tu@email.com",
  "password": "tucontraseña123"
}
```

**Iniciar sesión:**
```
POST http://localhost:3000/api/auth/login
Body (JSON):
{
  "email": "tu@email.com",
  "password": "tucontraseña123"
}
```
Copia el `token` que devuelve.

**Obtener vault:**
```
GET http://localhost:3000/api/vault
Header: Authorization: Bearer <pega el token aquí>
```
