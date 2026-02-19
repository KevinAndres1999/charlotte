# 🔒 Despliegue de Reglas de Seguridad - Firestore

## 📋 Resumen de Cambios

Se han implementado reglas de seguridad robustas que reemplazan el acceso completamente abierto (`allow read, write: if true`) por un sistema basado en roles y autenticación.

## 🛡️ Nuevas Reglas Implementadas

### **Funciones Helper**
- `isAuthenticated()`: Verifica usuario autenticado
- `isAdmin()`: Verifica rol de administrador
- `isStudent()`: Verifica rol de estudiante  
- `isOwner(userId)`: Verifica propiedad del documento

### **Control de Acceso por Colección**

| Colección | Lectura | Escritura | Eliminación | Quién puede acceder |
|-----------|---------|-----------|-------------|-------------------|
| `users` | Admins | Dueño/Admins | Admins | Solo admins leen datos de usuarios |
| `classes` | Autenticados | Admins | Admins | Contenido educativo protegido |
| `cuestionarios` | Autenticados | Admins | Admins | Evaluaciones protegidas |
| `entregas` | Dueño/Admins | Estudiantes | Admins | Trabajos de estudiantes |
| `configuracion` | Admins | Admins | Admins | Solo administradores |
| `contactos` | Admins | Público | Admins | Formulario de contacto público |

## 🚀 Pasos para Despliegue

### **1. Instalar Firebase CLI**
```bash
npm install -g firebase-tools
```

### **2. Autenticar con Firebase**
```bash
firebase login
```

### **3. Inicializar proyecto (si no está hecho)**
```bash
firebase init firestore
```

### **4. Desplegar reglas**
```bash
firebase deploy --only firestore:rules
```

### **5. Configurar Claims de Usuarios**
```bash
node setup-firebase-claims.js
```

## ⚙️ Configuración de Claims (Requerido)

Las nuevas reglas dependen de **custom claims** en Firebase Auth. Cada usuario necesita tener un claim `role` configurado.

### **Opción A: Script Automático**
```bash
# Requiere Firebase Admin SDK y clave de servicio
node setup-firebase-claims.js
```

### **Opción B: Manual (Consola Firebase)**
1. Ve a Firebase Console → Authentication → Users
2. Selecciona un usuario
3. Haz clic en "Add custom claim"
4. Agrega: `{"role": "admin"}` o `{"role": "student"}`

### **Opción C: Cloud Function**
```javascript
// Ejemplo de función para establecer claims
exports.setUserRole = functions.https.onCall(async (data, context) => {
  const uid = data.uid;
  const role = data.role;
  
  await admin.auth().setCustomUserClaims(uid, { role });
  return { success: true };
});
```

## 🧪 Pruebas de Seguridad

### **Ejecutar pruebas automatizadas**
```bash
node test-security-rules.js
```

### **Pruebas manuales recomendadas**

1. **Como estudiante**:
   - ✅ Puede leer clases y materiales
   - ✅ Puede crear entregas
   - ❌ No puede leer otros usuarios
   - ❌ No puede modificar configuración

2. **Como admin**:
   - ✅ Puede leer/escribir todo
   - ✅ Puede gestionar usuarios
   - ✅ Puede modificar configuración

3. **Sin autenticación**:
   - ❌ No puede acceder a contenido educativo
   - ✅ Puede crear contactos (formulario público)

## 🔄 Rollback (si algo falla)

Si las nuevas reglas causan problemas, puedes revertir rápidamente:

```bash
# Revertir a reglas anteriores (backup)
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

## 📊 Monitoreo

### **Firebase Console**
Ve a Firestore → Rules para ver:
- Logs de evaluación de reglas
- Operaciones denegadas
- Patrones de acceso

### **Alertas recomendadas**
Configura alertas para:
- Múltiples intentos de acceso denegados
- Cambios en configuración
- Creación de usuarios anómalos

## 🛠️ Solución de Problemas

### **Error: "Missing or insufficient permissions"**
- Verifica que el usuario tenga el claim `role` configurado
- Confirma que el usuario esté autenticado
- Revisa la regla específica de la colección

### **Error: "Custom claims not set"**
- Ejecuta `setup-firebase-claims.js`
- Verifica la configuración de Admin SDK
- Confirma permisos del servicio

### **Problemas con isOwner()**
- Asegúrate que los documentos tengan campo `userId`
- Verifica que `userId` coincida con `request.auth.uid`

## 📝 Notas Importantes

1. **Las reglas se evalúan en el servidor**, no en el cliente
2. **Los claims se almacenan en el token JWT**, duran 1 hora
3. **Las reglas son versionadas**, puedes revertir cambios
4. **Prueba siempre en modo desarrollo primero**

## 🎯 Siguientes Pasos

1. ✅ Desplegar reglas de seguridad
2. ✅ Configurar claims de usuarios  
3. ✅ Probar accesos por rol
4. 🔄 Implementar logging de seguridad
5. 🔄 Configurar monitoreo y alertas

---

**⚠️ ADVERTENCIA**: No despliegues a producción sin probar exhaustivamente en desarrollo.
