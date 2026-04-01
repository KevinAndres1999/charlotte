# Inicio Rápido - Sistema de Videoconferencias

## 🚀 Configuración en 3 pasos

### 1. Instalar dependencias
```powershell
npm install
```

### 2. Configurar JWT_SECRET (si no está configurado)
```powershell
$env:JWT_SECRET = "tu-secreto-super-seguro-aqui"
```

### 3. Iniciar el servidor
```powershell
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📱 Acceso

### Panel de Administración
- URL: `http://localhost:3000/admin.html`
- Usuario: `admin@admin.local`
- Contraseña: `admin123`

### Crear una sala
1. Ir a "Videoconferencia" en el menú lateral
2. Clic en "Nueva Sala"
3. Completar formulario y guardar
4. Copiar enlace para compartir con estudiantes

### Unirse a una videoconferencia
- URL: `http://localhost:3000/videoconferencia.html`
- Seleccionar sala disponible
- Permitir acceso a cámara y micrófono

## 📚 Documentación completa
Ver [VIDEOCONFERENCIAS.md](VIDEOCONFERENCIAS.md) para documentación detallada.

## ⚠️ Importante para producción

Para usar en producción:
1. ✅ Configurar HTTPS (requerido por WebRTC)
2. ✅ Cambiar contraseñas por defecto
3. ✅ Configurar servidor TURN propio (opcional, recomendado)
4. ✅ Ajustar límites según capacidad del servidor

## 🎯 Características principales

- ✅ Videollamadas multipunto
- ✅ Control de audio/video
- ✅ Compartir pantalla
- ✅ Chat en tiempo real
- ✅ Gestión de salas desde admin
- ✅ Sin dependencias externas

---

**¿Problemas?** Consulta [VIDEOCONFERENCIAS.md](VIDEOCONFERENCIAS.md) para resolución de problemas.
