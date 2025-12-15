Plataforma Educativa — Scaffold

Este es un scaffold mínimo para una plataforma educativa estática que utiliza Firebase (Auth, Firestore, Storage).

Pasos para conectar tu Firebase:

1. Crea un proyecto en Firebase. Habilita Authentication (Email/Password), Firestore y Storage.
2. Copia tu `firebaseConfig` y pégalo en `edu-platform/firebase-config.js`.
3. Abre `edu-platform/index.html` en el navegador (o despliega en Netlify).
4. Para producción, configura variables de entorno y el dominio autorizado en la consola de Firebase.

Archivos principales:
- `index.html` — catálogo público (demo).
- `login.html` — inicio de sesión.
- `registro.html` — registro de usuarios.
- `dashboard.html` — área de alumno (lista de cursos desde Firestore).
- `admin.html` — panel administrador (básico).
- `firebase-config-sample.js` — plantilla para tu `firebaseConfig`.
- `firestore.rules` — reglas iniciales sugeridas.

Deploy rápido (Netlify): crea un sitio apuntando a la raíz del repo y deploy.

Si quieres, puedo añadir tu `projectId` y generar `firebase-config.js` con tus credenciales.

Configuración y despliegue local

1. Instala dependencias (ya instalamos `firebase`):

```powershell
npm install
```

2. (Opcional) Instala `firebase-tools` globalmente si quieres usar comandos `firebase` desde cualquier lugar:

```powershell
npm install -g firebase-tools
```

3. Autentícate y selecciona tu proyecto:

```powershell
firebase login
firebase use --add
```

4. Publicar reglas de Firestore:

```powershell
npm run deploy:rules
```

5. Servir la carpeta `edu-platform` localmente para probar:

```powershell
npm run serve:edu
# abrir http://localhost:8080/edu-platform/index.html
```

Seguridad
- No subas el `service account` a repositorios públicos. Mueve `scripts/charlotte-a0d47-firebase-adminsdk-fbsvc-...json` a un lugar seguro si no lo necesitas en el repo.

Uso seguro del service account y pruebas admin
- Coloca el JSON de la cuenta de servicio fuera del control de versión. Ejemplo: `C:\secrets\charlotte-sa.json`.
- Establece la variable de entorno `SERVICE_ACCOUNT_PATH` con la ruta absoluta al JSON antes de ejecutar scripts administrativos.

Ejemplo (PowerShell):
```powershell
$env:SERVICE_ACCOUNT_PATH = 'C:\secrets\charlotte-sa.json'
node scripts/admin_test.js
```

El script `scripts/admin_test.js` crea un curso de prueba en Firestore para verificar que la inicialización Admin funciona correctamente.

