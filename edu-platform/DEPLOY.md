Despliegue de reglas Firestore

Pasos locales:

1. Asegúrate de tener `firebase-tools`:

```bash
npm install -g firebase-tools
```

2. Autentícate con la cuenta que tiene permisos al proyecto (`charlotte-a0d47`):

```bash
npx firebase login
```

3. Desde la raíz del repositorio publica las reglas:

```bash
npx firebase deploy --only firestore:rules --project charlotte-a0d47
```

Notas de seguridad (CI):

- No guardes la clave de servicio en el repositorio. En CI guarda el contenido JSON en una secret llamada `FIREBASE_SERVICE_ACCOUNT_B64` (base64 del archivo JSON).
- El workflow de ejemplo `.github/workflows/deploy-rules.yml` decodifica la secret en `sa.json` y usa `GOOGLE_APPLICATION_CREDENTIALS` para desplegar.

Requisitos:

- La cuenta usada en CI debe tener permisos para desplegar reglas y acceder al proyecto. Si obtienes errores 403, verifica permisos en Google Cloud Console.
