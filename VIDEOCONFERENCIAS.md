# Sistema de Videoconferencias - ECE Charlotte

## 📋 Descripción

Sistema de videoconferencias integrado desarrollado con WebRTC y Socket.io que permite realizar clases virtuales sin depender de servicios externos como Zoom, Teams o BigBlueButton.

## ✨ Características

- **✅ Videoconferencias en tiempo real** con múltiples participantes
- **🎥 Control de audio y video** individual
- **🖥️ Compartir pantalla** para presentaciones
- **💬 Chat en tiempo real** durante las videollamadas
- **👥 Gestión de salas** desde el panel de administración
- **🔒 Autenticación integrada** con el sistema existente
- **📱 Diseño responsivo** para móviles y tablets
- **🌐 Sin dependencias externas** - totalmente autohospedado

## 🏗️ Arquitectura

### Backend (Node.js + Socket.io)
- **Servidor Express** con Socket.io para señalización WebRTC
- **Base de datos SQLite** para gestión de salas
- **API REST** para CRUD de salas
- **Autenticación JWT** integrada

### Frontend (WebRTC + JavaScript)
- **Interfaz de videoconferencia** en [videoconferencia.html](videoconferencia.html)
- **Cliente WebRTC** en [js/webrtc-client.js](js/webrtc-client.js)
- **Panel de administración** en [js/admin/modules/videoconferencia.js](js/admin/modules/videoconferencia.js)
- **Estilos CSS** en [css/admin-videoconferencia.css](css/admin-videoconferencia.css)

## 📦 Instalación

1. **Instalar dependencias:**
```powershell
npm install
```

Esto instalará:
- `socket.io` - Para comunicación en tiempo real
- `jsonwebtoken` - Ya incluido, para autenticación

2. **Configurar variables de entorno:**
Asegúrate de tener configurado `JWT_SECRET` en tus variables de entorno:
```powershell
$env:JWT_SECRET = "tu-secreto-super-seguro"
```

3. **Iniciar el servidor:**
```powershell
npm start
```

El servidor se iniciará en `http://localhost:3000` por defecto.

## 🚀 Uso

### Para Administradores

1. **Acceder al panel de administración:**
   - Ir a `/admin.html`
   - Iniciar sesión con credenciales de administrador
   - Usuario por defecto: `admin@admin.local`
   - Contraseña por defecto: `admin123`

2. **Gestionar salas:**
   - Navegar a la sección "Videoconferencia" en el menú lateral
   - Clic en "Nueva Sala" para crear una sala
   - Configurar:
     - **Nombre:** Identificador de la sala (ej. "Clase de Panadería - Semana 1")
     - **Descripción:** Propósito de la sala
     - **Máximo de participantes:** Entre 2 y 100

3. **Acciones disponibles:**
   - **Ver:** Ver detalles y participantes actuales
   - **Editar:** Modificar nombre, descripción o capacidad
   - **Activar/Desactivar:** Controlar acceso a la sala
   - **Copiar enlace:** Compartir URL con estudiantes
   - **Eliminar:** Desactivar permanentemente la sala

### Para Estudiantes

1. **Acceder a una sala:**
   - Recibir el enlace de la sala del administrador
   - O ir a `/videoconferencia.html` y seleccionar una sala disponible

2. **Unirse a la videoconferencia:**
   - El navegador solicitará permisos de cámara y micrófono
   - Autorizar el acceso
   - Automáticamente se conectará con otros participantes

3. **Controles disponibles:**
   - **🎤 Silenciar/Activar micrófono:** Controlar audio
   - **📹 Activar/Desactivar cámara:** Controlar video
   - **🖥️ Compartir pantalla:** Mostrar tu pantalla a otros
   - **💬 Chat:** Enviar mensajes de texto
   - **👥 Participantes:** Ver lista de conectados
   - **📞 Salir:** Abandonar la sala

## 🔧 Configuración Técnica

### Servidores STUN/TURN

Por defecto, el sistema usa servidores STUN gratuitos de Google:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

Para producción, se recomienda configurar tu propio servidor TURN para garantizar conexiones detrás de firewalls estrictos.

### Configuración de ICE Servers

Editar en [js/webrtc-client.js](js/webrtc-client.js):

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Agregar servidor TURN propio
    {
      urls: 'turn:tu-servidor-turn.com:3478',
      username: 'usuario',
      credential: 'contraseña'
    }
  ]
};
```

## 🔐 Seguridad

- ✅ **Autenticación obligatoria** - Solo usuarios autenticados pueden acceder
- ✅ **Validación de salas** - Verifica que las salas existan y estén activas
- ✅ **Control de capacidad** - Limita participantes por sala
- ✅ **Aislamiento de salas** - Las comunicaciones están separadas por sala
- ✅ **JWT tokens** - Autenticación segura con tokens

## 📊 API Endpoints

### Gestión de Salas

**Crear sala** (Admin)
```http
POST /api/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nombre de la sala",
  "description": "Descripción opcional",
  "maxParticipants": 50
}
```

**Listar salas**
```http
GET /api/rooms
Authorization: Bearer {token}
```

**Obtener detalles de sala**
```http
GET /api/rooms/{roomId}
Authorization: Bearer {token}
```

**Actualizar sala** (Admin)
```http
PATCH /api/rooms/{roomId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "isActive": true,
  "maxParticipants": 100
}
```

**Eliminar sala** (Admin)
```http
DELETE /api/rooms/{roomId}
Authorization: Bearer {token}
```

## 🔌 Eventos Socket.io

### Cliente → Servidor

- `join-room` - Unirse a una sala
- `offer` - Enviar oferta WebRTC
- `answer` - Enviar respuesta WebRTC
- `ice-candidate` - Enviar candidato ICE
- `chat-message` - Enviar mensaje de chat
- `media-state-change` - Notificar cambio de audio/video
- `screen-share-started` - Iniciar compartir pantalla
- `screen-share-stopped` - Detener compartir pantalla

### Servidor → Cliente

- `room-joined` - Confirmación de unión a sala
- `user-joined` - Nuevo participante se unió
- `user-left` - Participante salió
- `offer` - Recibir oferta WebRTC
- `answer` - Recibir respuesta WebRTC
- `ice-candidate` - Recibir candidato ICE
- `chat-message` - Recibir mensaje de chat
- `user-media-state` - Estado de audio/video de usuario
- `room-closed` - Sala cerrada por administrador
- `error` - Error en la sala

## 🎨 Personalización

### Colores y Estilos

Los estilos principales están en:
- [videoconferencia.html](videoconferencia.html) - Estilos inline para la interfaz de video
- [css/admin-videoconferencia.css](css/admin-videoconferencia.css) - Estilos del panel admin

### Límites y Configuraciones

Editar en [server.js](server.js):

```javascript
// Cambiar límite por defecto de participantes
const DEFAULT_MAX_PARTICIPANTS = 50;

// Cambiar tiempo de inactividad antes de cerrar sala vacía
const EMPTY_ROOM_TIMEOUT = 3600000; // 1 hora en ms
```

## 🐛 Resolución de Problemas

### La cámara o micrófono no funciona

1. Verificar permisos del navegador
2. Usar HTTPS en producción (WebRTC require conexión segura)
3. Verificar que el dispositivo esté disponible

### No se conectan los participantes

1. Verificar configuración de servidores STUN/TURN
2. Revisar logs del servidor (Socket.io)
3. Verificar que el firewall permita conexiones WebRTC

### Problemas de calidad de video

1. Reducir resolución en [js/webrtc-client.js](js/webrtc-client.js):
```javascript
video: {
  width: { ideal: 640 },  // Reducir de 1280
  height: { ideal: 480 }  // Reducir de 720
}
```

2. Limitar ancho de banda:
```javascript
pc.addTrack(track, localStream, {
  maxBitrate: 500000 // 500 kbps
});
```

## 📝 Roadmap

Mejoras futuras planeadas:

- [ ] Grabación de sesiones
- [ ] Pizarra colaborativa
- [ ] Encuestas en vivo
- [ ] Reacciones con emojis
- [ ] Sala de espera
- [ ] Modo presentador
- [ ] Subtítulos en tiempo real
- [ ] Estadísticas de red
- [ ] Calidad adaptativa automática

## 📄 Licencia

Este sistema es parte del proyecto ECE Charlotte.

## 🆘 Soporte

Para problemas o preguntas:
1. Revisar esta documentación
2. Verificar logs del servidor
3. Consultar documentación de WebRTC: https://webrtc.org/
4. Consultar documentación de Socket.io: https://socket.io/

---

**Desarrollado para ECE Charlotte** - Sistema de videoconferencias autohospedado
