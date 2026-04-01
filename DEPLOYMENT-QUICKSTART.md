# 🚀 Guía Rápida de Despliegue - 5 Minutos

## Paso 1: Preparar el Código (Ya está listo ✓)

```bash
git add .
git commit -m "Agregar sistema de videoconferencias para producción"
git push origin main
```

## Paso 2: Desplegar Backend en Render.com

### 2.1 Crear Cuenta
1. Ve a https://render.com
2. Regístrate con tu cuenta de GitHub

### 2.2 Crear Web Service
1. Click **"New +"** → **"Web Service"**
2. Conecta tu repositorio `KevinAndres1999/charlotte`
3. Render detectará automáticamente `render.yaml`
4. Click **"Apply"** o configura manualmente:
   - **Name:** charlotte-video-server
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### 2.3 Configurar Variables de Entorno
En la pestaña "Environment":
- Click **"Add Environment Variable"**
- Agregar:
  - **Key:** `JWT_SECRET`
  - **Value:** (Click "Generate" o usar: `tu-secreto-muy-largo-de-64-caracteres-aleatorios`)
  - Click **"Add"**

### 2.4 Desplegar
- Click **"Create Web Service"**
- Espera ~5 minutos mientras se despliega
- **Copia la URL** que te dan, ejemplo: `https://charlotte-video-server.onrender.com`

## Paso 3: Actualizar Configuración del Frontend

### 3.1 Editar js/config.js

Cambia esta línea:
```javascript
: 'https://charlotte-video-server.onrender.com', // TODO: Cambiar por tu URL de producción
```

Por tu URL real de Render:
```javascript
: 'https://TU-URL-AQUI.onrender.com', // URL de tu servidor en Render
```

### 3.2 Guardar y Subir Cambios

```bash
git add js/config.js
git commit -m "Actualizar URL del backend"
git push origin main
```

## Paso 4: Desplegar Frontend en Netlify (Ya lo tienes)

El frontend ya está en Netlify, pero asegúrate:

1. Ve a tu dashboard de Netlify
2. Verifica que el sitio se haya actualizado automáticamente
3. Si no, click **"Trigger deploy"** → **"Deploy site"**

## Paso 5: Probar el Sistema

### 5.1 Acceder al Admin
1. Abre: `https://tu-sitio.netlify.app/admin.html`
2. Login:
   - Usuario: `admin@admin.local`
   - Contraseña: `admin123`

### 5.2 Crear una Sala
1. Click en **"Videoconferencia"** en el menú
2. Click **"Nueva Sala"**
3. Completar formulario:
   - Nombre: "Prueba"
   - Descripción: "Sala de prueba"
   - Max participantes: 10
4. Click **"Crear Sala"**

### 5.3 Probar Videoconferencia
1. Copiar enlace de la sala
2. Abrir en otra ventana/navegador
3. Permitir cámara y micrófono
4. ¡Deberías verte en ambas ventanas!

## ✅ Checklist Final

- [ ] Backend desplegado en Render.com
- [ ] URL del backend actualizada en `js/config.js`
- [ ] Frontend actualizado en Netlify
- [ ] Probado crear sala desde admin
- [ ] Probado unirse a videoconferencia
- [ ] Audio y video funcionan

## 🐛 Solución Rápida de Problemas

### "No se puede conectar a Socket.io"
- Verifica que el servidor esté corriendo en Render
- Revisa la URL en `js/config.js`
- Mira los logs en Render: Dashboard → Logs

### "WebRTC no conecta"
- Verifica permisos de cámara/micrófono
- Prueba en navegador diferente
- Usa HTTPS (nunca HTTP en producción)

### "Base de datos bloqueada"
- Normal en Free tier de Render
- Reinicia el servicio en Render
- Considera upgrade a plan pago

## 💡 Tips

1. **Free tier de Render duerme después de 15 min de inactividad**
   - Primera conexión puede tardar 30-60 segundos
   - Para siempre activo: upgrade a plan Starter ($7/mes)

2. **Agregar más dominios a CORS**
   - Edita `server.js` → array `allowedOrigins`
   - Agregar tus dominios personalizados
   - Commit y push

3. **Monitoreo**
   - Render Dashboard → Ver logs en tiempo real
   - Ver CPU/RAM usage
   - Configurar alertas

## 🆘 ¿Necesitas Ayuda?

1. Revisa [DESPLIEGUE-PRODUCCION.md](DESPLIEGUE-PRODUCCION.md) para guía completa
2. Revisa [VIDEOCONFERENCIAS.md](VIDEOCONFERENCIAS.md) para documentación técnica
3. Mira los logs en Render Dashboard

---

**Tiempo estimado: 5-10 minutos** ⏱️  
**Costo: $0/mes** 💰
