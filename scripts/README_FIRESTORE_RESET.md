Instrucciones para respaldar y recrear Firestore

1) Respaldo (export) usando gcloud (recomendado antes de borrar):

   - Instala y autentica gcloud:
     ```bash
     gcloud auth login
     gcloud config set project YOUR_PROJECT_ID
     ```

   - Crea un bucket GCS para export:
     ```bash
     gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://your-project-backups-12345
     ```

   - Exporta Firestore:
     ```bash
     gcloud firestore export gs://your-project-backups-12345 --project=YOUR_PROJECT_ID
     ```

2) Borrado seguro con Node (requiere `serviceAccount.json`):

   - Copia tu JSON de cuenta de servicio (con permisos Firestore Admin) a `scripts/serviceAccount.json`.
   - Desde la raíz del repo ejecuta:
     ```bash
     cd scripts
     node delete_collections.js
     ```

   - El script borra las colecciones: `users`, `assignments`, `quizzes`, `submissions`, `quizResponses`.

3) Crear nueva base o resetear estructura mínima:

   - Puedes crear manualmente un `user` teacher para pruebas en Firebase Console -> Authentication y en Firestore -> crear doc `users/{uid}` con:
     ```json
     {
       "name": "Profesor Inicial",
       "email": "tu-email@example.com",
       "role": "teacher",
       "status": "approved"
     }
     ```

4) Publicar reglas (si no lo hiciste): usa la pestaña Rules en Firestore o:
   ```bash
   firebase deploy --only firestore:rules
   ```

Notas y advertencias:
 - Esto es irreversible sin el backup. Asegúrate de exportar antes.
 - El script requiere Node y `firebase-admin` en `node_modules` (ya está en `package.json`). Ejecuta `npm install` si hace falta.
