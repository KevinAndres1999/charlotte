README de Despliegue — Portal Charlotte

Resumen
- Este repo usa Firebase (Auth, Firestore, Storage) en cliente y funciones serverless en Netlify para envío de correos vía SendGrid.
- Archivo de función: `netlify/functions/sendEmail.js` (usa `@sendgrid/mail`).

Variables de entorno necesarias (Netlify)
- `SENDGRID_API_KEY` = clave API de SendGrid.
- `FROM_EMAIL` = dirección remitente verificada en SendGrid (ej: no-reply@tu-dominio.com).

Pasos rápidos para desplegar en Netlify (GUI)
1. Hacer push a GitHub (branch `main`).
2. En Netlify crear sitio nuevo y conectar el repo GitHub.
3. En Settings → Build & deploy → Environment, añadir las variables `SENDGRID_API_KEY` y `FROM_EMAIL`.
4. Opcional: en Build settings dejar comando `npm run build` o ninguno si solo sirve static + functions.
5. Netlify detectará la carpeta `netlify/functions` y desplegará las funciones automáticamente.

Comandos útiles (CLI)
- Instalar deps:

```bash
npm install
```

- Ejecutar servidor local (sitio estático con server.js):

```bash
npm start
# o
node server.js
```

- Probar funciones y frontend localmente con Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

- Establecer variables de entorno desde Netlify CLI (opcional):

```bash
netlify env:set SENDGRID_API_KEY "tu_sendgrid_api_key"
netlify env:set FROM_EMAIL "no-reply@tu-dominio.com"
```

SendGrid — creación de API Key y remitente
1. Crear cuenta en SendGrid (si no tienes).
2. En Settings → API Keys → Create API Key → Copiar valor y guardarlo en `SENDGRID_API_KEY` en Netlify.
3. En Sender Authentication verifica el remitente `FROM_EMAIL` (dominio o single sender) según requisitos de SendGrid.

Publicar reglas de Firestore (importante)
1. Ir a Firebase Console → Firestore Database → Rules.
2. Ajustar reglas para permitir lecturas/escrituras sólo a usuarios autenticados y proteger colecciones administrativas.
   Ejemplo mínimo (ajustar según necesidades):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /assignments/{doc} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    match /quizzes/{doc} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    match /submissions/{doc} {
      allow create: if request.auth != null; // students submit
      allow read: if request.auth != null && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' || request.auth.uid == resource.data.studentId);
    }
    match /quizResponses/{doc} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' || request.auth.uid == resource.data.studentId);
    }
  }
}
```

Nota: Publica estas reglas desde la consola — el agente no puede aplicarlas por ti.

Probar envío de email localmente
- Con `netlify dev` las funciones se ejecutan localmente y usarán las env vars del sistema o las que hayas configurado con `netlify env:set`.
- Para probar la función directamente (ejemplo curl):

```bash
curl -X POST http://localhost:8888/.netlify/functions/sendEmail \
  -H "Content-Type: application/json" \
  -d '{"to":["admin@tudominio.com"],"subject":"Prueba","text":"Hola"}'
```

Recomendaciones y seguridad
- No expongas `SENDGRID_API_KEY` en el frontend. Mantenerla en Netlify env vars.
- Verifica el remitente en SendGrid para evitar bloqueos.
- Revisa y endurece las reglas de Firestore según el flujo real de tu app.

¿Quieres que agregue un archivo `netlify.toml` con build settings y funciones configuradas automáticamente?