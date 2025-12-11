# Proyecto — Sitio Educativo

Acciones realizadas: diseño moderno, componentes `header`/`footer`, loader de componentes y optimizaciones visuales.

Cómo aplicar includes automáticamente a todas las páginas HTML (en tu máquina):

1. Asegúrate de tener Node.js instalado.
2. Desde la carpeta del proyecto ejecuta:

```bash
node scripts/add_includes.js
```

Windows (PowerShell) — ejecutar todo en secuencia:

```powershell
# Ejecuta el script que inserta los includes y renombra/optimiza el logo
.\scripts\run_all.ps1
```

Si quieres solo renombrar el logo (sin Node):

```powershell
.\scripts\rename_logo.ps1
```

Esto añadirá `data-include="header"` justo después de `<body>` y `data-include="footer"` antes de `</body>` en todos los `.html` del directorio.

Previsualizar (servidor estático):

```bash
# Python 3
python -m http.server 3000
# o con Node.js (si tienes http-server instalado)
# npx http-server -p 3000
```

Recomendación: renombrar `Mesa de trabajo 3.png` a `logos/intro-logo.png` para evitar espacios en el nombre. Puedes hacerlo manualmente o con PowerShell.
# Sitio educativo — Demo

Este pequeño sitio contiene 5 secciones y un acceso para estudiantes.

Archivos:
- index.html — página principal
- styles.css — estilos
- script.js — comportamiento (modal, login y registro)

Para probar localmente con el servidor que incluye la API y sirve el frontend:

1. Instala Node.js (v16+ recomendado).
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
