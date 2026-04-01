# 🚀 Guía de Despliegue en Producción

## 📋 Arquitectura de Producción

Para que el sistema de videoconferencias funcione en internet, necesitas:

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Netlify)                                     │
│  - HTML, CSS, JavaScript                                │
│  - videoconferencia.html, admin.html                    │
│  - Se conecta al backend vía HTTPS                      │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│  BACKEND (Render.com / Railway / Heroku)                │
│  - Node.js + Express + Socket.io                        │
│  - server.js                                            │
│  - Base de datos SQLite                                 │
│  - API REST + WebSocket                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Opción 1: Render.com (Recomendado - Gratis)

### Paso 1: Preparar el Repositorio

1. **Asegúrate de tener estos archivos en tu repositorio:**
   - ✅ `server.js`
   - ✅ `package.json`  
   - ✅ `render.yaml`

2. **Haz commit y push:**
   ```bash
   git add .
   git commit -m "Agregar sistema de videoconferencias"
   git push origin main
   ```

### Paso 2: Desplegar en Render.com

1. **Crear cuenta:**
   - Ve a https://render.com
   - Regístrate con tu GitHub

2. **Nuevo Web Service:**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio `KevinAndres1999/charlotte`
   - Render detectará automáticamente `render.yaml`

3. **Configurar variables de entorno:**
   - Render generará `JWT_SECRET` automáticamente
   - O agrégalo manualmente en el dashboard

4. **Desplegar:**
   - Click en "Create Web Service"
   - Espera ~5 minutos mientras se despliega
   - Obtendrás una URL como: `https://charlotte-video-server.onrender.com`

### Paso 3: Actualizar el Frontend

Edita `js/webrtc-client.js` para apuntar al servidor de producción:

```javascript
// En la parte superior del archivo
const BACKEND_URL = 'https://charlotte-video-server.onrender.com';

// Actualizar conexión de Socket.io
socket = io(BACKEND_URL, {
  auth: {
    token: localStorage.getItem('token')
  }
});
```

### Paso 4: Actualizar el Admin

Edita `js/admin/modules/videoconferencia.js` para usar la API de producción:

```javascript
const API_BASE = 'https://charlotte-video-server.onrender.com/api';

// Ejemplo en loadRooms:
const response = await fetch(`${API_BASE}/rooms`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🎯 Opción 2: Railway.app (Más Rápido)

### Paso 1: Desplegar

1. Ve a https://railway.app
2. Click "Start a New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio
5. Railway detecta Node.js automáticamente

### Paso 2: Configurar Variables

En el dashboard de Railway:
- Agregar variable: `JWT_SECRET` = (genera uno aleatorio)
- Agregar variable: `PORT` = (Railway lo asigna automático)

### Paso 3: Obtener URL

Railway te da una URL como: `https://tu-proyecto.up.railway.app`

---

## 🎯 Opción 3: Servidor Propio (VPS)

Si tienes un servidor VPS (DigitalOcean, AWS, etc.):

### Paso 1: Conectar por SSH

```bash
ssh usuario@tu-servidor.com
```

### Paso 2: Instalar Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### Paso 3: Clonar Repositorio

```bash
git clone https://github.com/KevinAndres1999/charlotte.git
cd charlotte
npm install
```

### Paso 4: Configurar Variables de Entorno

```bash
# Crear archivo .env
nano .env

# Agregar:
JWT_SECRET=tu-secreto-super-seguro-aqui-64-caracteres-minimo
PORT=3000
NODE_ENV=production
```

### Paso 5: Instalar PM2 (Process Manager)

```bash
sudo npm install -g pm2
pm2 start server.js --name charlotte-video
pm2 save
pm2 startup
```

### Paso 6: Configurar Nginx (Reverse Proxy + HTTPS)

```bash
# Instalar Nginx y Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/charlotte
```

Contenido de la configuración:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.io específico
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activar configuración:

```bash
sudo ln -s /etc/nginx/sites-available/charlotte /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 7: Obtener Certificado SSL (HTTPS)

```bash
sudo certbot --nginx -d tu-dominio.com
```

---

## 🔧 Configuración del Cliente (Frontend)

### Archivo: `js/config.js` (Crear nuevo)

```javascript
// Configuración de URLs según entorno
const CONFIG = {
  // Detectar si estamos en desarrollo o producción
  BACKEND_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://charlotte-video-server.onrender.com', // Cambiar por tu URL
  
  API_BASE: window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://charlotte-video-server.onrender.com/api'
};

// Exportar para uso global
window.APP_CONFIG = CONFIG;
```

### Actualizar `videoconferencia.html`

```html
<!-- Antes de webrtc-client.js -->
<script src="js/config.js"></script>
<script src="/socket.io/socket.io.js"></script>
<script src="js/webrtc-client.js"></script>
```

### Actualizar `js/webrtc-client.js`

```javascript
// Usar configuración global
function initializeSocket() {
  socket = io(window.APP_CONFIG.BACKEND_URL, {
    auth: {
      token: localStorage.getItem('token')
    }
  });
  // ... resto del código
}
```

### Actualizar `js/admin/modules/videoconferencia.js`

```javascript
async function loadRooms() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${window.APP_CONFIG.API_BASE}/rooms`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // ... resto del código
  }
}
```

---

## 🔐 Configuración de Seguridad

### 1. Actualizar CORS en el Servidor

Edita `server.js`:

```javascript
const io = new Server(server, {
  cors: {
    origin: [
      'https://tu-sitio.netlify.app',
      'https://cursoscharlotte.com',
      'http://localhost:3000' // Solo para desarrollo
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [
    'https://tu-sitio.netlify.app',
    'https://cursoscharlotte.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

### 2. Variables de Entorno Seguras

**NUNCA** guardes estos valores en el código:
- ❌ JWT_SECRET
- ❌ Contraseñas de base de datos
- ❌ API Keys

En **Render.com/Railway**:
- Usa el dashboard para agregar variables de entorno
- Marca como "secretas"

### 3. Actualizar .gitignore

Asegúrate de que `.gitignore` incluya:

```
.env
*.db
data.db
.env.local
.env.production
```

---

## ✅ Checklist de Despliegue

- [ ] Backend desplegado en Render/Railway/VPS
- [ ] JWT_SECRET configurado (64+ caracteres aleatorios)
- [ ] HTTPS habilitado (automático en Render/Railway)
- [ ] CORS configurado con tus dominios
- [ ] Frontend actualizado con URL del backend
- [ ] Probado crear sala desde admin
- [ ] Probado unirse a videoconferencia
- [ ] Audio/Video funciona
- [ ] Chat funciona
- [ ] Pantalla compartida funciona

---

## 🧪 Pruebas

### 1. Verificar API

```bash
curl https://tu-backend-url.onrender.com/api/rooms \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 2. Verificar Socket.io

Abre la consola del navegador en `videoconferencia.html`:

```javascript
// Debería conectar sin errores
socket.on('connect', () => console.log('✅ Conectado a Socket.io'));
socket.on('connect_error', (err) => console.error('❌ Error:', err));
```

---

## 📊 Monitoreo

### Render.com Dashboard
- Ver logs en tiempo real
- Métricas de CPU/RAM
- Reiniciar servicio si es necesario

### Comandos Útiles (VPS)

```bash
# Ver logs
pm2 logs charlotte-video

# Reiniciar
pm2 restart charlotte-video

# Estado
pm2 status

# Monitoreo
pm2 monit
```

---

## 🐛 Solución de Problemas

### Error: "Failed to connect to Socket.io"

**Causa:** URL incorrecta o CORS mal configurado  
**Solución:**
1. Verifica que `BACKEND_URL` sea correcto en `config.js`
2. Revisa configuración de CORS en `server.js`
3. Verifica que el servidor esté corriendo

### Error: "WebRTC connection failed"

**Causa:** Falta servidor TURN o problemas de firewall  
**Solución:**
1. Configura un servidor TURN (ver sección TURN más abajo)
2. Verifica que el navegador tenga permisos de cámara/micrófono

### Error: "Database locked"

**Causa:** SQLite no es ideal para concurrencia en producción  
**Solución:** Considera migrar a PostgreSQL (ver sección opcional)

---

## 🎮 Servidor TURN (Opcional pero Recomendado)

Para garantizar conexiones detrás de firewalls estrictos:

### Opción 1: Usar servicio gratuito

Actualiza `js/webrtc-client.js`:

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Servicio TURN gratuito (limitado)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};
```

### Opción 2: Servidor TURN Propio

Instalar Coturn en tu VPS:

```bash
sudo apt install coturn

# Configurar /etc/turnserver.conf
listening-port=3478
external-ip=TU_IP_PUBLICA
realm=tu-dominio.com
server-name=tu-dominio.com
fingerprint
lt-cred-mech
user=usuario:contraseña

# Iniciar
sudo systemctl enable coturn
sudo systemctl start coturn
```

---

## 💰 Costos Estimados

| Opción | Costo | Características |
|--------|-------|-----------------|
| **Render.com Free** | $0/mes | 750 horas/mes, duerme después 15min inactividad |
| **Railway Free** | $0/mes | 500 horas/mes, $5 crédito gratis mensual |
| **Render.com Starter** | $7/mes | Siempre activo, mejor rendimiento |
| **Railway Pro** | $5/mes | 100GB egreso incluido |
| **DigitalOcean VPS** | $6/mes | Droplet básico, control total |
| **Servidor TURN** | +$5-10/mes | VPS adicional o compartido |

---

## 📞 Soporte

¿Problemas con el despliegue?

1. Revisa esta guía paso a paso
2. Verifica los logs del servidor
3. Consulta la documentación de Render/Railway
4. Revisa [VIDEOCONFERENCIAS.md](VIDEOCONFERENCIAS.md)

---

**¡Listo para producción!** 🚀
