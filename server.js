const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const Database = require('better-sqlite3');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'https://cursoscharlotte.com',
  'https://www.cursoscharlotte.com',
  'https://cursoscharlotte.netlify.app',
  // Agregar más dominios según sea necesario
];

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Permitir requests sin origin (como mobile apps o postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'La política CORS no permite acceso desde el origen: ' + origin;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('⚠️ ERROR: JWT_SECRET no está configurado en las variables de entorno');
  console.error('Por favor configure JWT_SECRET en su archivo .env o variables de entorno');
  process.exit(1);
}

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La política CORS no permite acceso desde el origen: ' + origin;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// ============================================
// CONFIGURACIÓN DE CARGA DE VIDEOS
// ============================================
const fs = require('fs');
const videosDir = path.join(__dirname, 'videos');

// Crear directorio de videos si no existe
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Configurar multer para carga de videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    // Sanitizar nombre del archivo
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

const uploadFilter = (req, file, cb) => {
  const allowedMimes = ['video/mp4', 'video/webm', 'video/x-matroska'];
  const allowedExts = ['.mp4', '.webm', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten videos MP4, WebM o MKV'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: uploadFilter,
  limits: {
    fileSize: 300 * 1024 * 1024 // 300MB max
  }
});

// Endpoint para subir video (actualizado para Firestore Auth)
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  // Solo requiere que haya un archivo, la autenticación se valida desde el cliente
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }

  try {
    const { titulo, descripcion, programa, duracion, userEmail } = req.body;
    
    if (!titulo || !programa) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Título y programa son requeridos' });
    }

    // Logging básico
    console.log(`📹 Video subido por ${userEmail}: ${titulo}`);

    // Retornar información del video
    const videoUrl = `/videos/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Video subido exitosamente',
      video: {
        filename: req.file.filename,
        url: videoUrl,
        size: req.file.size,
        sizeHuman: formatBytes(req.file.size),
        titulo,
        descripcion,
        programa,
        duracion,
        uploadedBy: userEmail,
        fechaSubida: new Date().toISOString()
      }
    });
  } catch (err) {
    // Eliminar archivo en caso de error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error uploading video:', err);
    res.status(500).json({ message: 'Error al subir video: ' + err.message });
  }
});

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS (VIDEOS) CON SOPORTE DE STREAMING
// ============================================

// Mejor manejador para servir videos con streaming y CORS
app.get('/videos/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(videosDir, filename);
  
  // Seguridad: prevenir path traversal
  if (!filepath.startsWith(videosDir)) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }
  
  // Verificar que el archivo existe
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️ Video no encontrado: ${filename}`);
    return res.status(404).json({ message: 'Video no encontrado' });
  }
  
  // Obtener información del archivo
  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  
  // Detectar tipo MIME correcto
  const ext = path.extname(filename).toLowerCase();
  let mimeType = 'video/mp4';
  if (ext === '.webm') mimeType = 'video/webm';
  if (ext === '.mkv') mimeType = 'video/x-matroska';
  
  // Headers CORS y de video
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  
  // Soporte para range requests (para scrubbing de video)
  const range = req.headers.range;
  let stream;
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    if (start >= fileSize) {
      return res.status(416).json({ message: 'Range no válido' });
    }
    
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', end - start + 1);
    
    stream = fs.createReadStream(filepath, { start, end });
    stream.pipe(res);
    
    console.log(`📺 Streaming ${filename} (${start}-${end}/${fileSize} bytes)`);
  } else {
    // Sin range request, servir todo el archivo
    stream = fs.createReadStream(filepath);
    stream.pipe(res);
    
    console.log(`📺 Sirviendo ${filename} (${fileSize} bytes, tipo: ${mimeType})`);
  }
  
  // Manejo de errores
  stream.on('error', (err) => {
    console.error(`❌ Error sirviendo video ${filename}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error sirviendo archivo' });
    }
  });
});

// Fallback para servir archivos estáticos normales
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Endpoint para listar videos disponibles
app.get('/api/videos/list', (req, res) => {
  const fs = require('fs');
  const videosPath = path.join(__dirname, 'videos');
  try {
    const files = fs.readdirSync(videosPath)
      .filter(file => /\.(mp4|webm|mkv)$/i.test(file))
      .map(file => ({
        name: file,
        url: `/videos/${file}`,
        size: fs.statSync(path.join(videosPath, file)).size,
        sizeHuman: formatBytes(fs.statSync(path.join(videosPath, file)).size)
      }));
    res.json({ videos: files });
  } catch(err) {
    console.error('Error listing videos:', err);
    res.status(500).json({ message: 'Error al listar videos' });
  }
});

// Helper para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// --- Rate limiting: protección contra fuerza bruta en auth ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 15,                    // máximo 15 intentos por ventana por IP
  message: { message: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Inicializar SQLite (archivo data.db en la raíz del proyecto)
const db = new Database(path.join(__dirname, 'data.db'));
db.exec(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'student'
  );`
);
// Tabla de settings para opciones configurables
db.exec(
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`
);

// Tabla de salas de videoconferencia
db.exec(
  `CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    createdBy TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER DEFAULT 1,
    maxParticipants INTEGER DEFAULT 50
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
    // Crear admin principal (Kevin) si no existe
    const mainAdminEmail = 'onanuor@gmail.com';
    const mainAdminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(mainAdminEmail);
    if(!mainAdminExists){
      const mainAdminPass = 'Ka140199123Ae';
      const mainAdminHash = await bcrypt.hash(mainAdminPass, 10);
      const insertMainAdmin = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
      insertMainAdmin.run(mainAdminEmail, 'Kevin Andres Nuñez Ortiz', mainAdminHash, 1, 'admin');
      console.log('Usuario admin principal creado:', mainAdminEmail);
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

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email y contraseña requeridos' });
  try{
    const row = db.prepare('SELECT email, name, passwordHash, active, role FROM users WHERE email = ?').get(email);
    if(!row) return res.status(401).json({ message: 'Credenciales inválidas' });
    if(!row.active) return res.status(403).json({ message: 'Cuenta deshabilitada' });
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
app.post('/api/register', authLimiter, async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email ||!password || !name) return res.status(400).json({ message: 'Nombre, email y contraseña requeridos' });
  if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
  try{
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });
    const passwordHash = await bcrypt.hash(password, 10);
    // Usar el rol proporcionado o 'student' por defecto
    const userRole = (role === 'admin' || role === 'student') ? role : 'student';
    const insert = db.prepare('INSERT INTO users (email, name, passwordHash, active, role) VALUES (?, ?, ?, ?, ?)');
    insert.run(email, name, passwordHash, 1, userRole);
    const token = jwt.sign({ email, name, role: userRole }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Usuario registrado en backend:', email, 'con rol:', userRole);
    res.status(201).json({ token, user: { email, name, role: userRole, active: 1 } });
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

// ============================================
// CONFIGURACIÓN SOCKET.IO PARA VIDEOCONFERENCIAS
// ============================================

// Almacenamiento en memoria de las salas activas
const activeRooms = new Map(); // roomId -> { participants: Map(socketId -> userData) }

// --- Middleware de autenticación para Socket.io ---
// Verifica el JWT en el handshake para que socket.user siempre sea fiable
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Token de autenticación requerido'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload; // { email, name, role }
    next();
  } catch (err) {
    next(new Error('Token inválido o expirado. Por favor inicia sesión nuevamente.'));
  }
});

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  
  // Unirse a una sala
  socket.on('join-room', ({ roomId, userName, userId }) => {
    // SEGURIDAD: isAdmin se determina SIEMPRE desde el JWT verificado, nunca desde el cliente
    const isAdmin = socket.user?.role === 'admin';
    const safeUserName = (userName || socket.user?.name || 'Participante').toString().trim().substring(0, 100);
    console.log(`${safeUserName} (${socket.id}) se une a la sala: ${roomId}, isAdmin: ${isAdmin}`);
    
    // Verificar si la sala existe en la base de datos
    const room = db.prepare('SELECT * FROM rooms WHERE roomId = ? AND isActive = 1').get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Sala no encontrada o inactiva' });
      return;
    }
    
    // Inicializar sala si no existe en memoria
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { participants: new Map() });
    }
    
    const roomData = activeRooms.get(roomId);
    
    // Verificar límite de participantes
    if (roomData.participants.size >= room.maxParticipants) {
      socket.emit('error', { message: 'Sala llena' });
      return;
    }
    
    // Agregar participante (isAdmin viene del JWT, no del cliente)
    roomData.participants.set(socket.id, { userName: safeUserName, userId: socket.user?.email, isAdmin, joinedAt: new Date() });
    socket.join(roomId);
    
    // Notificar a otros participantes que alguien se unió
    const participantsList = Array.from(roomData.participants.entries()).map(([id, data]) => ({
      socketId: id,
      userName: data.userName,
      isAdmin: data.isAdmin,
    }));
    
    // Enviar lista de participantes actuales al nuevo usuario
    socket.emit('room-joined', { 
      roomId, 
      participants: participantsList.filter(p => p.socketId !== socket.id)
    });
    
    // Notificar a otros que hay un nuevo participante
    socket.to(roomId).emit('user-joined', { 
      socketId: socket.id, 
      userName: safeUserName,
      isAdmin
    });
  });
  
  // Señalización WebRTC: enviar oferta
  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { 
      from: socket.id, 
      offer 
    });
  });
  
  // Señalización WebRTC: enviar respuesta
  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { 
      from: socket.id, 
      answer 
    });
  });
  
  // Señalización WebRTC: enviar candidato ICE
  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { 
      from: socket.id, 
      candidate 
    });
  });
  
  // Mensajes de chat
  socket.on('chat-message', ({ roomId, message }) => {
    const roomData = activeRooms.get(roomId);
    if (roomData) {
      const userData = roomData.participants.get(socket.id);
      if (userData) {
        io.to(roomId).emit('chat-message', {
          userName: userData.userName,
          message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Cambio de estado de audio/video
  socket.on('media-state-change', ({ roomId, audio, video }) => {
    socket.to(roomId).emit('user-media-state', {
      socketId: socket.id,
      audio,
      video
    });
  });
  
  // Compartir pantalla
  socket.on('screen-share-started', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share-started', {
      socketId: socket.id
    });
  });
  
  socket.on('screen-share-stopped', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share-stopped', {
      socketId: socket.id
    });
  });
  
  // Reacciones/emojis - broadcasting a todos en la sala
  socket.on('reaction', ({ roomId, reaction, userName }) => {
    console.log(`Reacción de ${userName}: ${reaction} en sala ${roomId}`);
    socket.to(roomId).emit('reaction', {
      socketId: socket.id,
      userName: userName,
      reaction: reaction
    });
  });
  
  // Mano levantada
  socket.on('hand-raised', ({ roomId, raised, userName }) => {
    console.log(`Mano ${raised ? 'levantada' : 'bajada'} de ${userName} en sala ${roomId}`);
    socket.to(roomId).emit('hand-raised', {
      socketId: socket.id,
      userName: userName,
      raised: raised
    });
  });
  
  // Modo solo escuchar (audio sin video)
  socket.on('listen-only-mode', ({ roomId, enabled, userName }) => {
    socket.to(roomId).emit('listen-only-mode', {
      socketId: socket.id,
      userName: userName,
      enabled: enabled
    });
  });
  
  // Silenciar participante (solo admin) - validado desde JWT, no desde cliente
  socket.on('mute-participant', ({ roomId, socketId, reason }) => {
    if (socket.user?.role !== 'admin') return; // SEGURIDAD: solo admins
    const safeReason = (reason || '').toString().trim().substring(0, 200) || 'Silenciado por el administrador';
    console.log(`Admin ${socket.user.email} silencia ${socketId} en sala ${roomId}`);
    io.to(socketId).emit('mute-participant', { reason: safeReason });
  });
  
  // Expulsar participante (solo admin) - validado desde JWT
  socket.on('kick-participant', ({ roomId, socketId, reason }) => {
    if (socket.user?.role !== 'admin') return; // SEGURIDAD: solo admins
    const safeReason = (reason || '').toString().trim().substring(0, 200) || 'Expulsado por el administrador';
    console.log(`Admin ${socket.user.email} expulsa ${socketId} de sala ${roomId}`);
    io.to(socketId).emit('kick-participant', { reason: safeReason });
  });

  // Estado de habla (para indicador de quien habla)
  socket.on('speaking-state', ({ roomId, speaking }) => {
    socket.to(roomId).emit('user-speaking', { socketId: socket.id, speaking: !!speaking });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    
    // Remover de todas las salas
    activeRooms.forEach((roomData, roomId) => {
      if (roomData.participants.has(socket.id)) {
        const userData = roomData.participants.get(socket.id);
        roomData.participants.delete(socket.id);
        
        // Notificar a otros participantes
        socket.to(roomId).emit('user-left', { 
          socketId: socket.id,
          userName: userData.userName
        });
        
        // Eliminar sala de memoria si está vacía
        if (roomData.participants.size === 0) {
          activeRooms.delete(roomId);
        }
      }
    });
  });
});

// ============================================
// API ENDPOINTS PARA SALAS DE VIDEOCONFERENCIA
// ============================================

// Crear sala (solo admin)
app.post('/api/rooms', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  const { name, description, maxParticipants } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Nombre de sala requerido' });
  }
  
  try {
    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const insert = db.prepare(
      'INSERT INTO rooms (roomId, name, description, createdBy, maxParticipants) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run(roomId, name, description || '', req.user.email, maxParticipants || 50);
    
    res.status(201).json({ 
      roomId, 
      name, 
      description,
      maxParticipants: maxParticipants || 50
    });
  } catch (err) {
    console.error('Error creando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Listar salas
app.get('/api/rooms', requireAuth, (req, res) => {
  try {
    const rooms = db.prepare(
      'SELECT id, roomId, name, description, createdAt, isActive, maxParticipants FROM rooms WHERE isActive = 1 ORDER BY createdAt DESC'
    ).all();
    
    // Agregar información de participantes actuales
    const roomsWithParticipants = rooms.map(room => ({
      ...room,
      currentParticipants: activeRooms.get(room.roomId)?.participants.size || 0
    }));
    
    res.json({ rooms: roomsWithParticipants });
  } catch (err) {
    console.error('Error listando salas:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Obtener información de una sala
app.get('/api/rooms/:roomId', requireAuth, (req, res) => {
  try {
    const room = db.prepare(
      'SELECT * FROM rooms WHERE roomId = ? AND isActive = 1'
    ).get(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    const roomData = activeRooms.get(req.params.roomId);
    const participants = roomData ? 
      Array.from(roomData.participants.values()).map(p => ({
        userName: p.userName,
        userId: p.userId
      })) : [];
    
    res.json({ 
      room,
      currentParticipants: participants.length,
      participants
    });
  } catch (err) {
    console.error('Error obteniendo sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Actualizar sala (solo admin)
app.patch('/api/rooms/:roomId', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  const { name, description, isActive, maxParticipants } = req.body;
  try {
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(isActive ? 1 : 0);
    }
    if (maxParticipants !== undefined) {
      updates.push('maxParticipants = ?');
      values.push(maxParticipants);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }
    
    values.push(req.params.roomId);
    const query = `UPDATE rooms SET ${updates.join(', ')} WHERE roomId = ?`;
    const result = db.prepare(query).run(...values);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    res.json({ message: 'Sala actualizada' });
  } catch (err) {
    console.error('Error actualizando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Eliminar sala (solo admin)
app.delete('/api/rooms/:roomId', requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido' });
  }
  
  try {
    const result = db.prepare('UPDATE rooms SET isActive = 0 WHERE roomId = ?').run(req.params.roomId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    // Desconectar a todos los participantes si la sala está activa
    const roomData = activeRooms.get(req.params.roomId);
    if (roomData) {
      io.to(req.params.roomId).emit('room-closed', { 
        message: 'La sala ha sido cerrada por el administrador' 
      });
      activeRooms.delete(req.params.roomId);
    }
    
    res.json({ message: 'Sala eliminada' });
  } catch (err) {
    console.error('Error eliminando sala:', err);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Servir archivos estáticos (frontend) desde la carpeta del proyecto
app.use(express.static(path.join(__dirname)));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
