# 🚀 Despliegue en Netlify

## Configuración Automática

La aplicación está configurada para desplegarse automáticamente en Netlify desde este repositorio.

### Pasos para configurar Netlify:

1. **Crear cuenta en Netlify** (si no tienes una):
   - Ve a [netlify.com](https://netlify.com)
   - Regístrate con tu cuenta de GitHub

2. **Importar proyecto**:
   - Haz clic en "Add new site" → "Import an existing project"
   - Selecciona GitHub como proveedor
   - Autoriza el acceso a tu repositorio `KevinAndres1999/charlotte`

3. **Configuración del build**:
   - **Branch to deploy**: `main`
   - **Build command**: `echo 'No build step required'`
   - **Publish directory**: `.` (raíz del proyecto)

4. **Variables de entorno** (opcional):
   - Si necesitas configurar Firebase, agrega las variables de entorno en Netlify

5. **Despliegue**:
   - Haz clic en "Deploy site"
   - Netlify detectará automáticamente la configuración en `netlify.toml`

## Configuración Manual (si es necesario)

Si Netlify no detecta automáticamente la configuración, configura manualmente:

- **Build settings**:
  - Build command: `echo 'No build step required'`
  - Publish directory: `.`

- **Redirects** (ya configurado en `_redirects`):
  - Maneja rutas SPA
  - Redirige APIs a funciones serverless

## Verificación del Despliegue

Después del despliegue, verifica:
- ✅ La aplicación carga correctamente
- ✅ Las páginas HTML se sirven
- ✅ Los estilos CSS se aplican
- ✅ Los scripts JavaScript funcionan
- ✅ Firebase se conecta correctamente

## URL del Sitio

Después del despliegue exitoso, Netlify te proporcionará una URL como:
`https://[nombre-del-sitio].netlify.app`

## Configuración de Dominio Personalizado (opcional)

Para usar un dominio personalizado:
1. Ve a Site settings → Domain management
2. Agrega tu dominio personalizado
3. Configura los registros DNS según las instrucciones de Netlify

---

¡Tu plataforma educativa Charlotte está lista para el mundo! 🎓✨