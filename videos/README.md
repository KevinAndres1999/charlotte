# 📹 Carpeta de Videos - Charlotte LMS

## ¿Dónde subo los videos?

**Esta carpeta es donde subirás todos los archivos MP4, WebM o MKV que quieras servir en la plataforma.**

### 🎯 Ubicación del Archivo
```
workspace/
└── videos/
    ├── curso-belleza-1.mp4
    ├── turorial-panaderia.mp4
    └── video-especial.webm
```

---

## 🚀 Paso a Paso

### 1️⃣ **Agrega el video aquí**
- Copia tu archivo MP4/WebM a esta carpeta
- Ejemplo: `mi-video.mp4`

### 2️⃣ **Haz git add y push**
```bash
cd c:\workspace
git add videos/mi-video.mp4
git commit -m "Agregar video: Mi Video"
git push origin main
```

### 3️⃣ **Se desplegará en Render automáticamente**
En ~2-3 minutos, el video estará disponible en:
```
https://charlotte-video-server.onrender.com/videos/mi-video.mp4
```

### 4️⃣ **Crea un registro en Firestore**
En el panel admin, crea un video con:
- **Título**: Mi Video
- **URL**: `/videos/mi-video.mp4` (o la URL completa de Render)
- **Programa**: Belleza / Panadería / etc.
- **Descripción**: Tu descripción

---

## 📋 Formatos Soportados
- ✅ **MP4** (mejor compatibilidad)
- ✅ **WebM** (más pequeño)
- ✅ **MKV** (con transcoding)

---

## ⚠️ Límites

| Aspecto | Límite |
|--------|--------|
| Por archivo | Hasta 500MB (recomendado: 100-200MB) |
| Total en GitHub | ~500MB total |
| Video muy grande | Se rechaza en Git |

---

## 🎬 Ejemplo de Estructura Recomendada

```
videos/
├── belleza/
│   ├── maquillaje-basico-1.mp4
│   └── skincare-avanzado.mp4
├── panaderia/
│   ├── pan-integral-paso-a-paso.mp4
│   └── decoracion-pasteles.mp4
└── tutoriales/
    └── plataforma-como-usar.mp4
```

---

## 🔧 Comando Rápido para Comprimir Video (si es muy grande)

```bash
# Reduce tamaño a ~50MB
ffmpeg -i video-grande.mp4 -crf 28 -preset fast video-comprimido.mp4
```

---

## 📞 Dudas?

Si el video:
- ❌ No carca después de 5 min: Verifica que push fue exitoso
- ❌ Da error 404: Revisa el nombre del archivo en la URL
- ❌ Se traba: Puede ser muy grande, intenta comprimir

---

**¡Listo! Ya puedes subir videos sin costo extra! 🎉**
