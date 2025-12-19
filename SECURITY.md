# 🔒 Seguridad - Firebase Credentials

## 🚨 Importante: Nunca expongas credenciales de Firebase

Este proyecto ha sido configurado para **NO** exponer credenciales sensibles de Firebase en el código fuente.

### ✅ Lo que SÍ se incluye (Seguro):
- **Firebase Web SDK Config**: API keys, project IDs, etc. (estas son públicas por diseño)
- **Variables de entorno en Netlify**: Configuradas de forma segura

### ❌ Lo que NUNCA debes incluir (Peligroso):
- **Firebase Admin SDK Keys**: Archivos JSON con claves privadas
- **Service Account Credentials**: Emails y claves privadas
- **Private Keys**: Cualquier archivo .key o .pem

### 🛡️ Medidas de Seguridad Implementadas:

1. **Variables de Entorno**: Las credenciales se configuran como variables de entorno en Netlify
2. **.gitignore Actualizado**: Excluye automáticamente archivos de credenciales
3. **Fallback Seguro**: El código tiene valores por defecto para desarrollo local
4. **Documentación Clara**: .env.example explica qué variables se necesitan

### 🚀 Configuración en Producción:

```bash
# Configurar variables de entorno en Netlify (solo las del Web SDK)
netlify env:set FIREBASE_API_KEY your_api_key
netlify env:set FIREBASE_AUTH_DOMAIN your_project.firebaseapp.com
netlify env:set FIREBASE_PROJECT_ID your_project_id
# ... etc
```

### 🔍 Verificación de Seguridad:

- ✅ Revisa que no hay archivos JSON de Firebase Admin SDK en el repositorio
- ✅ Verifica que las variables de entorno en Netlify no incluyen claves privadas
- ✅ Asegúrate de que .gitignore excluya archivos sensibles

### 📞 Si encuentras credenciales expuestas:

1. **Inmediatamente**: Rota todas las claves afectadas en Google Cloud Console
2. **Revisa**: Todos los commits del repositorio por credenciales expuestas
3. **Previene**: Usa herramientas como git-secrets o credential scanners

### 🛠️ Herramientas Recomendadas:

- **GitGuardian**: Escanea repositorios por credenciales expuestas
- **TruffleHog**: Busca secrets en commits de git
- **Git Secrets**: Hook pre-commit para prevenir commits de secrets

---

**Recuerda**: La seguridad es responsabilidad de todos. Nunca subas credenciales a repositorios públicos. 🎯