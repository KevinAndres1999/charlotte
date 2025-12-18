const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');
const serverless = require('serverless-http');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
let db;
try {
  const dbPath = path.join(process.cwd(), 'data.db');
  db = new Database(dbPath);

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'student'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Add missing columns if needed
  const cols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
  if (!cols.includes('active')) db.prepare("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1").run();
  if (!cols.includes('role')) db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'").run();

} catch (error) {
  console.error('Database initialization error:', error);
}

// Helper functions
function getSetting(key) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch (err) {
    console.error('getSetting error:', err);
    return null;
  }
}

function setSetting(key, value) {
  try {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  } catch (err) {
    console.error('setSetting error:', err);
  }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ message: 'No autorizado' });
  const token = parts[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
}

// Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, name, password, programa } = req.body;
  if (!email || !name || !password || !programa) return res.status(400).json({ message: 'Todos los campos son requeridos' });

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ message: 'El email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
    insert.run(email, name, passwordHash, 1, 'student');

    const token = jwt.sign({ email, name, role: 'student' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { email, name, role: 'student' } });
  } catch (err) {
    console.error('Register error:', err);
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

// Admin routes
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

// Export the serverless function
module.exports.handler = serverless(app);