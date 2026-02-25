# 🎓 Charlotte - Plataforma Educativa

Plataforma educativa completa con Firebase backend, interfaces premium y sistema de gestión de contenido para cursos de Panadería y Belleza.

## ✨ Características

- **Panel Administrador**: Gestión completa de contenido educativo
- **Portal Estudiante**: Acceso intuitivo a materiales de estudio
- **Sistema de Evaluaciones**: Cuestionarios y evaluaciones con calificación automática
- **Gestión de Materiales**: PDFs, videos, documentos con metadatos
- **Interfaz Premium**: Diseño moderno con gradientes institucionales
- **Firebase Integration**: Base de datos en tiempo real
- **PWA**: Funcionalidad offline

## 🚀 Despliegue en Producción

### Netlify (Recomendado)

La aplicación está configurada para desplegarse automáticamente en Netlify:

1. **Importar proyecto** en [Netlify](https://netlify.com)
2. **Conectar repositorio**: `KevinAndres1999/charlotte`
3. **Configuración automática** desde `netlify.toml`
4. **Deploy automático** en cada push a `main`

### Despliegue Local

```bash
# Instalar dependencias
npm install

# Copiar .env.example a .env y configurar variables
cp .env.example .env

# Ejecutar servidor local
npm start
# o directamente
node server.js
```

## 📂 Estructura del Proyecto

```
├── index.html              # Página principal
├── admin.html              # Panel de administración
├── estudiante.html         # Portal del estudiante
├── login.html              # Página de login
├── registro.html           # Página de registro
├── styles.css              # Estilos globales
├── script.js               # Lógica del frontend
├── server.js               # Servidor Express + SQLite
├── sw.js                   # Service Worker (PWA)
├── pwa.js                  # Configuración PWA
├── manifest.json           # Manifiesto PWA
├── netlify.toml            # Configuración de Netlify
├── firebase.json           # Configuración de Firebase
├── firestore.rules         # Reglas de seguridad
├── .env.example            # Variables de entorno necesarias
├── components/             # Componentes reutilizables
└── cuestionarios y evaluaciones/  # Materiales de estudio
```

## 📚 Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase Firestore + Express + SQLite
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
   - Configurar reglas de seguridad en `firestore.rules`

2. **Variables de Entorno**:
   - Copiar `.env.example` a `.env`
   - Configurar credenciales de Firebase
   - Configurar `JWT_SECRET` para el servidor

## 📞 Soporte

Para soporte técnico o preguntas sobre el despliegue, revisar la documentación en [DEPLOY-NETLIFY.md](deploy-netlify.md).

---

🚀 **¡Listo para revolucionar la educación!**
