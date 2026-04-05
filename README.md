# 🔐 Vault Seguro — Backend

Backend de una aplicación de gestión de contraseñas con enfoque en **seguridad y privacidad**.

Este proyecto sigue el principio de **zero-knowledge**, lo que significa que el servidor **nunca tiene acceso a las contraseñas en texto plano**.
Toda la información sensible es cifrada en el cliente antes de enviarse.

---

## 🚀 Cómo ejecutar el servidor

### 1. Instalar Node.js

Descarga Node.js desde: https://nodejs.org
Instala la versión **LTS**.

Verifica la instalación:

```bash
node --version
npm --version
```

---

### 2. Abrir la terminal

Ubícate dentro de la carpeta del backend:

```bash
cd backend
```

---

### 3. Instalar dependencias

```bash
npm install
```

---

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
JWT_SECRET=tu_clave_super_segura
JWT_EXPIRES_IN=cuanto_tiempo_estara_disponible_la_cuenta
DB_FILE=nombre_dela_base_de_datos 
```

#### 🔐 Sobre JWT_SECRET

* Es la clave que firma los tokens de autenticación
* Debe ser larga, aleatoria y privada
* Nunca la subas a GitHub

Puedes generar una segura con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 5. Ejecutar el servidor

Modo normal:

```bash
npm start
```

Modo desarrollo:

```bash
npm run dev
```

Salida esperada:

```
📦 Base de datos conectada: /ruta/vault.db
✅ Servidor corriendo en http://localhost:3000
```

---

## 📡 Endpoints

| Método | Ruta               | Descripción            | Auth |
| ------ | ------------------ | ---------------------- | ---- |
| GET    | /                  | Estado del servidor    | ❌    |
| POST   | /api/auth/register | Registro               | ❌    |
| POST   | /api/auth/login    | Login (JWT)            | ❌    |
| GET    | /api/vault         | Obtener datos cifrados | ✅    |
| PUT    | /api/vault         | Guardar datos cifrados | ✅    |

---

## 🧠 Cómo funciona

1. El usuario se registra
2. La contraseña se hashea con **bcrypt**
3. En login:

   * Se valida la contraseña
   * Se genera un **JWT**
4. El frontend:

   * Cifra los datos con **AES-256-GCM**
   * Envía información ya protegida
5. El backend:

   * Solo almacena datos cifrados
   * Nunca accede a contraseñas reales

---

## 📁 Estructura

```
Password Manager
│
├──index.html
├──script.js
├──styles.css
├──README.md
├──.gitignore
│
├──backend/
   ├── server.js
   ├── app.js
   ├── db.js
   ├── auth.js
   ├── vault.js
   ├── middleware.js
   ├── .env
   └── package.json
```

---

## 🔐 Tecnologías

* **bcrypt** → Hash de contraseñas
* **JWT** → Autenticación
* **AES-256-GCM** → Cifrado del lado del cliente
* **SQLite** → Base de datos

---

## 🧪 Pruebas

### Registro

```
POST http://localhost:3000/api/auth/register
```

```json
{
  "nombre": "Juan",
  "email": "juan@email.com",
  "password": "123456789"
}
```

---

### Login

```
POST http://localhost:3000/api/auth/login
```

```json
{
  "email": "juan@email.com",
  "password": "123456789"
}
```

---

### Obtener vault

```
GET http://localhost:3000/api/vault
```

Header:

```
Authorization: Bearer TU_TOKEN
```

---

## ⚠️ Notas

* No subir `.env` al repositorio
* Este backend depende de un frontend que realice el cifrado
* Proyecto enfocado en seguridad y buenas prácticas

---
