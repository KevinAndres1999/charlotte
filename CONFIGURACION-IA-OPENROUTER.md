# 🤖 Configuración Segura de IA (OpenRouter)

## Problema Resuelto ✅

La API key de OpenRouter **ya no se expone públicamente** en el cliente. Ahora usa una **función serverless de Netlify** como intermediaria segura.

## Cómo Funciona

```
Estudiante escribe respuesta
         ↓
Cliente llama a: /.netlify/functions/ai-proxy
         ↓
Netlify recibe petición
         ↓
Lee API key desde VARIABLES DE ENTORNO (privadas)
         ↓
Llama a OpenRouter con la API key
         ↓
Retorna respuesta al estudiante
```

**Ventaja**: La API key nunca sale de los servidores de Netlify.

## Configuración en Netlify

### Paso 1: Ir al Dashboard de Netlify
1. Ve a: https://app.netlify.com
2. Selecciona el sitio: **cursoscharlotte**

### Paso 2: Agregar Variable de Entorno
1. Ve a: **Site settings** → **Build & deploy** → **Environment**
2. Haz clic en **Edit variables** (o **Add variable**)
3. Agrega una nueva variable:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: Tu API key (la que compartiste)
4. **Guarda** los cambios

### Paso 3: Re-desplegar
1. Ve a: **Deploys**
2. Haz clic en **Trigger deploy** → **Deploy site**
3. Espera a que termine (1-2 minutos)

### ✅ Listo
La IA ahora funcionará automáticamente para todos los estudiantes.

## Validar que Funciona

1. Abre https://cursoscharlotte.com
2. Inicia sesión como estudiante
3. Ve a "Mi Proyecto"
4. Responde una pregunta
5. Deberías ver 3 opciones mejoradas por la IA

## Seguridad

- ✅ La API key está en Netlify (privada)
- ✅ No se transmite al cliente
- ✅ Los estudiantes no pueden verla
- ✅ Solo la función serverless la accede

## Troubleshooting

Si la IA no funciona:
1. Verifica que la variable `OPENROUTER_API_KEY` está en Netlify ✓
2. Re-despliega el sitio ✓
3. Abre el DevTools (F12) → Console y busca errores
4. Si ves "IA no disponible", la variable no está configurada correctamente

## Después: Regenerar la API Key (por seguridad)

Una vez que confirmes que funciona:
1. Ve a: https://openrouter.ai/keys
2. Regenera/revoca la key actual
3. Copia la nueva key
4. Actualiza la variable en Netlify
5. Re-despliega

Así nadie podrá usar la key antigua.
