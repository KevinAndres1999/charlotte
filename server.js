const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

app.use(cors());
app.use(express.json());

// Inicializar SQLite (archivo data.db en la raíz del proyecto)
const db = new Database(path.join(__dirname, 'data.db'));
db.exec(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'pending'
  );`
);
// Tabla de settings para opciones configurables
db.exec(
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`
);
// Tablas para contenido
db.exec(
  `CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    programa TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  );`
);
db.exec(
  `CREATE TABLE IF NOT EXISTS clases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    programa TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  );`
);
db.exec(
  `CREATE TABLE IF NOT EXISTS actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    instrucciones TEXT NOT NULL,
    fecha_entrega TEXT,
    programa TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  );`
);
db.exec(
  `CREATE TABLE IF NOT EXISTS cuestionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    programa TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  );`
);
db.exec(
  `CREATE TABLE IF NOT EXISTS materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    programa TEXT NOT NULL,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  );`
);
// Si la tabla existía sin las columnas, añadirlas (ALTER TABLE solo si faltan)
const cols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
if (!cols.includes('active')) db.prepare("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1").run();
if (!cols.includes('role')) db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'").run();

// Crear usuario demo si no existe (password: password123 por defecto o DEV_STUDENT_PASSWORD env)
(async function ensureDemoUser(){
  try{
    const demoEmail = 'estudiante@ejemplo.edu';
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
    if(!existing){
      const plain = process.env.DEV_STUDENT_PASSWORD || 'password123';
      const passwordHash = await bcrypt.hash(plain, 10);
      const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
      insert.run(demoEmail, 'estudiante', passwordHash, 1, 'student');
      console.log('Usuario demo creado:', demoEmail);
    }
    // Crear admin demo si no existe
    const adminEmail = 'admin@admin.local';
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if(!adminExists){
      const adminPass = process.env.DEV_ADMIN_PASSWORD || 'admin123';
      const adminHash = await bcrypt.hash(adminPass, 10);
      const insertAdmin = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
      insertAdmin.run(adminEmail, 'admin', adminHash, 1, 'admin');
      console.log('Usuario admin creado:', adminEmail);
    }
  }catch(err){ console.error('Error creando usuario demo', err); }
})();

// Helpers para settings
function getSetting(key){
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(key, value){
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  up.run(key, value);
}

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });
  try{
    const row = db.prepare('SELECT email, name, passwordHash, active, role FROM users WHERE email = ?').get(email);
    if(!row) return res.status(401).json({ message: 'Credenciales inválidas' });
    if(!row.active) return res.status(403).json({ message: 'Cuenta deshabilitada' });
    if(row.role === 'pending') return res.status(403).json({ message: 'Cuenta pendiente de aprobación por el administrador' });
    const ok = await bcrypt.compare(password, row.passwordHash);
    if(!ok) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jwt.sign({ email: row.email, name: row.name, role: row.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { email: row.email, name: row.name, role: row.role, active: row.active } });
  }catch(err){
    console.error('Login error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Registro de usuario (demo, guardar en memoria)
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ message: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  try{
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });
    const passwordHash = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
    insert.run(email, name, passwordHash, 1, 'pending');
    const token = jwt.sign({ email, name, role: 'pending' }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { email, name, role: 'pending', active: 1 } });
  }catch(err){
    console.error('Register error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Middleware simple para verificar token y adjuntar payload
function requireAuth(req, res, next){
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data; // {email,name,role}
    next();
  } catch(err){
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// Endpoint admin: listar usuarios
app.get('/api/admin/users', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try{
    const rows = db.prepare('SELECT id, email, name, role, active FROM users ORDER BY id DESC').all();
    res.json({ users: rows });
  }catch(err){
    console.error('Admin list error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: actualizar active
app.patch('/api/admin/users/:email/active', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const email = req.params.email;
  const { active } = req.body || {};
  if(typeof active === 'undefined') return res.status(400).json({ message: 'Campo active requerido' });
  try{
    const update = db.prepare('UPDATE users SET active = ? WHERE email = ?');
    const info = update.run(active ? 1 : 0, email);
    if(info.changes === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'OK' });
  }catch(err){
    console.error('Admin update error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoint admin: obtener/actualizar settings
app.get('/api/admin/settings', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  try{
    const confirmWord = getSetting('confirmWord') || 'CONFIRMAR';
    res.json({ settings: { confirmWord } });
  }catch(err){
    console.error('Admin settings get error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.patch('/api/admin/settings', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const { confirmWord } = req.body || {};
  if(typeof confirmWord !== 'string' || !confirmWord.trim()) return res.status(400).json({ message: 'confirmWord requerido' });
  try{
    setSetting('confirmWord', confirmWord.trim().toUpperCase());
    res.json({ message: 'OK', settings: { confirmWord: confirmWord.trim().toUpperCase() } });
  }catch(err){
    console.error('Admin settings update error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Endpoints para contenido
app.post('/api/admin/content/:type', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const type = req.params.type;
  const tables = { videos: 'videos', clases: 'clases', actividades: 'actividades', cuestionarios: 'cuestionarios', materiales: 'materiales' };
  if(!tables[type]) return res.status(400).json({ message: 'Tipo inválido' });
  const table = tables[type];
  const data = req.body;
  try{
    let sql, params;
    if(type === 'videos'){
      sql = 'INSERT INTO videos (titulo, descripcion, url, programa) VALUES (?, ?, ?, ?)';
      params = [data.titulo, data.descripcion, data.url, data.programa];
    }else if(type === 'clases'){
      sql = 'INSERT INTO clases (titulo, contenido, programa) VALUES (?, ?, ?)';
      params = [data.titulo, data.contenido, data.programa];
    }else if(type === 'actividades'){
      sql = 'INSERT INTO actividades (titulo, instrucciones, fecha_entrega, programa) VALUES (?, ?, ?, ?)';
      params = [data.titulo, data.instrucciones, data.fecha, data.programa];
    }else if(type === 'cuestionarios'){
      sql = 'INSERT INTO cuestionarios (titulo, descripcion, programa) VALUES (?, ?, ?)';
      params = [data.titulo, data.descripcion, data.programa];
    }else if(type === 'materiales'){
      sql = 'INSERT INTO materiales (titulo, descripcion, url, programa) VALUES (?, ?, ?, ?)';
      params = [data.titulo, data.descripcion, data.url, data.programa];
    }
    const insert = db.prepare(sql);
    insert.run(...params);
    res.status(201).json({ message: 'Contenido subido exitosamente' });
  }catch(err){
    console.error('Upload error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.get('/api/content/:type', (req, res) => {
  const type = req.params.type;
  const tables = { videos: 'videos', clases: 'clases', actividades: 'actividades', cuestionarios: 'cuestionarios', materiales: 'materiales' };
  if(!tables[type]) return res.status(400).json({ message: 'Tipo inválido' });
  const table = tables[type];
  try{
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
    res.json({ content: rows });
  }catch(err){
    console.error('Fetch error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.delete('/api/admin/content/:type/:id', requireAuth, (req, res) => {
  if(!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso restringido' });
  const type = req.params.type;
  const id = req.params.id;
  const tables = { videos: 'videos', clases: 'clases', actividades: 'actividades', cuestionarios: 'cuestionarios', materiales: 'materiales' };
  if(!tables[type]) return res.status(400).json({ message: 'Tipo inválido' });
  const table = tables[type];
  try{
    const del = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const info = del.run(id);
    if(info.changes === 0) return res.status(404).json({ message: 'Contenido no encontrado' });
    res.json({ message: 'Eliminado' });
  }catch(err){
    console.error('Delete error', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.get('/api/profile', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ user: { email: data.email, name: data.name } });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

// Rutas para gestión de estudiantes por admin
app.get('/api/admin/students/pending', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    if(data.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const stmt = db.prepare('SELECT id, name, email FROM users WHERE role = ?');
    const students = stmt.all('pending');
    res.json(students);
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

app.get('/api/admin/students/approved', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    if(data.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const stmt = db.prepare('SELECT id, name, email FROM users WHERE role = ?');
    const students = stmt.all('student');
    res.json(students);
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

app.post('/api/admin/students/:id/approve', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    if(data.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const id = req.params.id;
    const update = db.prepare('UPDATE users SET role = ? WHERE id = ? AND role = ?');
    const info = update.run('student', id, 'pending');
    if(info.changes === 0) return res.status(404).json({ message: 'Estudiante no encontrado o ya aprobado' });
    res.json({ message: 'Estudiante aprobado' });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

app.delete('/api/admin/students/:id', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    if(data.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
    const id = req.params.id;
    const del = db.prepare('DELETE FROM users WHERE id = ? AND role = ?');
    const info = del.run(id, 'student');
    if(info.changes === 0) return res.status(404).json({ message: 'Estudiante no encontrado o no aprobado' });
    res.json({ message: 'Estudiante eliminado' });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

app.get('/api/profile', (req, res) => {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ user: { email: data.email, name: data.name } });
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
});

// Servir archivos estáticos (frontend) desde la carpeta del proyecto
app.use(express.static(path.join(__dirname)));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
