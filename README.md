# 🎓 Charlotte - Plataforma Educativa

Plataforma educativa completa con Firebase backend, interfaces premium y sistema de gestión de contenido.

## ✨ Características

- **Panel Administrador**: Gestión completa de contenido educativo
- **Portal Estudiante**: Acceso intuitivo a materiales de estudio
- **Sistema de Evaluaciones**: Cuestionarios y evaluaciones con calificación automática
- **Gestión de Materiales**: PDFs, videos, documentos con metadatos
- **Interfaz Premium**: Diseño moderno con gradientes institucionales
- **Firebase Integration**: Base de datos en tiempo real

## 🚀 Despliegue en Producción

### Netlify (Recomendado)

La aplicación está configurada para desplegarse automáticamente en Netlify:

1. **Importar proyecto** en [Netlify](https://netlify.com)
2. **Conectar repositorio**: `KevinAndres1999/charlotte`
3. **Configuración automática** desde `netlify.toml`
4. **Deploy automático** en cada push a `main`

📖 **Instrucciones detalladas**: Ver [DEPLOY-NETLIFY.md](DEPLOY-NETLIFY.md)

### Despliegue Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor local
npm start
# o directamente
node server.js
```

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
# Aplicar includes automáticamente
node scripts/add_includes.js

# Windows: ejecutar todo en secuencia
.\scripts\run_all.ps1

# Solo renombrar logo
.\scripts\rename_logo.ps1
```

### Estructura del Proyecto

```
├── admin.html              # Panel de administración
├── estudiante.html         # Portal del estudiante
├── index.html             # Página principal
├── login.html             # Página de login
├── styles.css             # Estilos globales
├── script.js              # Lógica del frontend
├── server.js              # Servidor Express (desarrollo)
├── netlify.toml           # Configuración de Netlify
├── _redirects             # Reglas de redireccionamiento
├── components/            # Componentes reutilizables
├── firebase.json          # Configuración de Firebase
└── firestore.rules        # Reglas de seguridad de Firestore
```

## 📚 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase Firestore
- **Hosting**: Netlify
- **Autenticación**: Firebase Auth
- **UI/UX**: Diseño responsive con gradientes premium

## 🎯 Funcionalidades

### Para Administradores
- ✅ Crear y gestionar clases, videos, actividades
- ✅ Construir cuestionarios y evaluaciones
- ✅ Subir materiales con metadatos (tipo, tamaño)
- ✅ Gestionar estudiantes y calificaciones
- ✅ Dashboard con estadísticas en tiempo real

### Para Estudiantes
- ✅ Acceder a contenido por programa
- ✅ Realizar evaluaciones con tiempo límite
- ✅ Descargar materiales de estudio
- ✅ Ver progreso y calificaciones
- ✅ Interfaz responsive y moderna

## 🔧 Configuración

1. **Firebase Setup**:
   - Crear proyecto en Firebase Console
   - Habilitar Firestore y Authentication
   - Configurar reglas de seguridad

2. **Variables de Entorno** (Netlify):
   - Configurar credenciales de Firebase en Site Settings

## 📞 Soporte

Para soporte técnico o preguntas sobre el despliegue, revisar la documentación en [DEPLOY-NETLIFY.md](DEPLOY-NETLIFY.md).

---

🚀 **¡Listo para revolucionar la educación!**
2. Desde la carpeta del proyecto instala dependencias:

```bash
npm install
```

3. Inicia el servidor (API + archivos estáticos):

```bash
npm start
```

Abre http://localhost:3000 en tu navegador.

Endpoints disponibles:
- `POST /api/login` — cuerpo JSON `{ "email": "...", "password": "..." }` devuelve `{ token, user }`.
- `POST /api/register` — cuerpo JSON `{ "name": "...", "email":"...", "password":"..." }` crea usuario y devuelve `{ token, user }`.
- `GET /api/profile` — devuelve `{ user }` si se envía `Authorization: Bearer <token>`.

Usuario demo (por defecto):
- Email: estudiante@ejemplo.edu
- Contraseña: password123

Nota: este servidor es sólo para demostración; en producción usa HTTPS, almacenamiento seguro y gestión de usuarios en BD.

Base de datos SQLite:
- El servidor crea y utiliza `data.db` en la carpeta del proyecto cuando se inicia.
- Los usuarios se almacenan en la tabla `users` con campos `id`, `email`, `name`, `passwordHash`.
- Para limpiar datos elimina `data.db`.

Credenciales admin de demo:
- Email: admin@admin.local
- Contraseña: admin123

Panel admin:
- Al iniciar sesión con el usuario admin aparecerá el enlace "Admin" en la navegación.
- Desde el panel admin puedes ver la lista de usuarios y activar/desactivar cuentas.

Configuración de confirmación:
- En el panel admin hay una sección "Configuración" donde puedes definir la palabra que se debe escribir para confirmar acciones (por defecto: "CONFIRMAR").
- La palabra se guarda en la base de datos (`settings.confirmWord`) y se aplica inmediatamente.
# Sitio educativo — Demo

Este pequeño sitio contiene 5 secciones y un acceso para estudiantes.

Archivos:
- index.html — página principal
- styles.css — estilos
- script.js — comportamiento (modal y login mock)

Para probar localmente, abre `index.html` en tu navegador (double-click o server simple).

Opcional: servir con Python:

```bash
python -m http.server 8000
```

Luego abre http://localhost:8000 en el navegador.

Servidor de autenticación (Node.js)

1. Instala Node.js (v16+ recomendado).
2. Desde la carpeta del proyecto instala dependencias:

```bash
npm install
```

3. Inicia la API:

```bash
npm start
```

La API de ejemplo se levantará en `http://localhost:3000` y expone:
- `POST /api/login` — cuerpo JSON `{ "email": "...", "password": "..." }` devuelve `{ token, user }`.
- `GET /api/profile` — devuelve `{ user }` si se envía `Authorization: Bearer <token>`.

- `POST /api/register` — cuerpo JSON `{ "name": "...", "email":"...", "password":"..." }` crea usuario (si no existe) y devuelve `{ token, user }`.


Usuario demo (por defecto):
- Email: estudiante@ejemplo.edu
- Contraseña: password123

Nota: este servidor es sólo para demostración; en producción usa HTTPS, almacenamiento seguro y gestión de usuarios en BD.
# Sitio educativo — Demo

Este pequeño sitio contiene 5 secciones y un acceso para estudiantes.

Archivos:
- index.html — página principal
- styles.css — estilos
- script.js — comportamiento (modal y login mock)

Para probar localmente, abre `index.html` en tu navegador (double-click o server simple).

Opcional: servir con Python:

```bash
python -m http.server 8000
```

Luego abre http://localhost:8000 en el navegador.
