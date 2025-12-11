# Sistema de Gestión de Contenidos - Charlotte

## 📋 Descripción
Sistema completo de gestión de contenidos educativos para la plataforma Charlotte, con panel de administración y portal de estudiantes totalmente optimizado para dispositivos móviles.

## 🎯 Características Principales

### Panel de Administrador (`admin.html`)
- **Dashboard con Estadísticas**: Visualización en tiempo real de contenidos publicados
- **Gestión de Videos**: Subir enlaces de YouTube, Vimeo, etc.
- **Gestión de Clases**: Crear material de clases con contenido de texto
- **Gestión de Actividades**: Crear tareas con instrucciones y fechas de entrega
- **Gestión de Cuestionarios**: Subir evaluaciones por programa
- **Gestión de Materiales**: Subir recursos adicionales de estudio

### Portal de Estudiantes (`estudiante.html`)
- **Vista de Videos**: Ver todos los videos subidos por el administrador
- **Vista de Clases**: Acceder al material de clase
- **Vista de Actividades**: Consultar tareas asignadas
- **Vista de Cuestionarios**: Descargar evaluaciones
- **Vista de Materiales**: Acceder a recetarios y recursos adicionales

## 🔄 Sincronización de Datos
El sistema utiliza `localStorage` del navegador para almacenar todos los datos:
- Los datos que sube el administrador se guardan en el navegador
- Los estudiantes ven automáticamente el contenido publicado
- Filtrado automático por programa (Panadería/Belleza)

### Estructuras de Datos:
```javascript
// Videos
localStorage.getItem('videos') // Array de objetos video
{
  id: Number,
  titulo: String,
  descripcion: String,
  url: String,
  programa: String,
  fecha: String
}

// Clases
localStorage.getItem('clases') // Array de objetos clase
{
  id: Number,
  titulo: String,
  contenido: String,
  programa: String,
  fecha: String
}

// Actividades
localStorage.getItem('actividades') // Array de objetos actividad
{
  id: Number,
  titulo: String,
  instrucciones: String,
  fecha: String (fecha de entrega),
  programa: String,
  fechaCreacion: String
}

// Cuestionarios
localStorage.getItem('cuestionarios') // Array de objetos cuestionario
{
  id: Number,
  titulo: String,
  descripcion: String,
  programa: String,
  fecha: String
}

// Materiales
localStorage.getItem('materiales') // Array de objetos material
{
  id: Number,
  titulo: String,
  descripcion: String,
  url: String,
  programa: String,
  fecha: String
}
```

## 📱 Diseño Responsive

### Breakpoints:
- **Desktop**: > 768px - Diseño con sidebar fijo
- **Mobile**: ≤ 768px - Sidebar colapsable con menú hamburguesa

### Optimizaciones Móviles:
- Menú lateral deslizante
- Cards adaptables
- Formularios optimizados para touch
- Botones de tamaño adecuado para dedos
- Grid responsivo con `minmax(250px, 1fr)`

## 🔐 Autenticación

### Roles:
- **Admin**: Acceso completo a `admin.html`
- **Student**: Acceso a `estudiante.html`

### Verificación:
```javascript
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
// Debe contener: { role: 'admin' | 'student', programa: 'Panadería' | 'Belleza', ...  }
```

## 🚀 Instrucciones de Uso

### Para Administradores:
1. Iniciar sesión con rol de administrador
2. Acceder a `admin.html`
3. Navegar por las secciones del menú lateral
4. Completar formularios para subir contenido
5. Verificar en el Dashboard las estadísticas actualizadas

### Para Estudiantes:
1. Registrarse y esperar aprobación del administrador
2. Iniciar sesión
3. Acceder a `estudiante.html`
4. Ver contenido filtrado por su programa
5. Acceder a videos, clases, actividades, etc.

## 🎨 Colores del Sistema

### Panel de Administrador:
- Azul primario: `#3b82f6`
- Azul oscuro: `#1e3a8a`
- Verde éxito: `#22c55e`
- Púrpura: `#a855f7`
- Naranja: `#f97316`

### Fondos y Tarjetas:
- Fondo principal: `#f8fafc`
- Tarjetas: `#ffffff`
- Bordes: `#e2e8f0`

## 📂 Estructura de Archivos
```
/
├── admin.html              # Panel de administración
├── estudiante.html         # Portal de estudiantes
├── login.html              # Página de inicio de sesión
├── registro.html           # Página de registro
├── styles.css              # Estilos globales
├── recetario-index.html    # Índice de recetas
├── recetas-*.html          # Archivos de recetas por categoría
└── cuestionarios y evaluaciones/  # Materiales de estudio
```

## 🔧 Tecnologías Utilizadas
- HTML5
- CSS3 (Grid, Flexbox, Media Queries)
- JavaScript (ES6+)
- Font Awesome 6.5.1
- LocalStorage API
- SessionStorage API

## 📝 Notas de Desarrollo
- Sistema diseñado para funcionar sin backend
- Datos almacenados localmente en el navegador
- Para producción, recomendable migrar a base de datos real
- Compatible con todos los navegadores modernos

## 🐛 Solución de Problemas

### El contenido no aparece para los estudiantes:
- Verificar que el navegador soporte localStorage
- Asegurarse de usar el mismo navegador para admin y estudiante (demo)
- Limpiar cache si es necesario

### El menú no se despliega en móvil:
- Verificar que el JavaScript esté cargado correctamente
- Revisar consola del navegador para errores

## 📧 Soporte
Para soporte técnico, contactar a través de la plataforma Charlotte.

---
**Versión**: 2.0  
**Última actualización**: 11 de diciembre de 2025  
**Autor**: Charlotte Educational Center
