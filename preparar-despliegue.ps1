# ============================================
# Script de Preparación para Despliegue
# ECE Charlotte - Sistema de Videoconferencias
# ============================================

param(
    [string]$BackendURL = "",
    [switch]$Help
)

if ($Help) {
    Write-Host @"

Uso: .\preparar-despliegue.ps1 [-BackendURL <url>]

Ejemplos:
  .\preparar-despliegue.ps1
  .\preparar-despliegue.ps1 -BackendURL https://mi-servidor.onrender.com

Descripción:
  Prepara el proyecto para despliegue en producción.
  Actualiza la configuración con la URL del backend.

"@ -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    Preparación para Despliegue en Producción" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos críticos
Write-Host "🔍 Verificando archivos..." -ForegroundColor Yellow
$archivos = @(
    "server.js",
    "package.json",
    "render.yaml",
    "js/config.js",
    "js/webrtc-client.js",
    "videoconferencia.html",
    "admin.html"
)

$faltantes = @()
foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        Write-Host "   ✓ $archivo" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $archivo (faltante)" -ForegroundColor Red
        $faltantes += $archivo
    }
}

if ($faltantes.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Faltan archivos críticos:" -ForegroundColor Red
    $faltantes | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    exit 1
}

Write-Host ""

# Solicitar URL del backend si no se proporcionó
if (-not $BackendURL) {
    Write-Host "📝 Configuración del Backend" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "¿Ya desplegaste el backend en Render.com?" -ForegroundColor White
    Write-Host "1. Sí, tengo la URL" -ForegroundColor Cyan
    Write-Host "2. No, aún no lo he desplegado" -ForegroundColor Cyan
    Write-Host ""
    
    $opcion = Read-Host "Selecciona una opción (1/2)"
    
    if ($opcion -eq "1") {
        Write-Host ""
        Write-Host "Ingresa la URL de tu backend (ejemplo: https://charlotte-video.onrender.com):" -ForegroundColor Yellow
        $BackendURL = Read-Host "URL"
        
        # Validar formato de URL
        if (-not ($BackendURL -match "^https?://")) {
            Write-Host ""
            Write-Host "⚠️  La URL debe comenzar con http:// o https://" -ForegroundColor Yellow
            Write-Host "   Agregando https:// automáticamente..." -ForegroundColor Gray
            $BackendURL = "https://$BackendURL"
        }
        
        # Remover trailing slash
        $BackendURL = $BackendURL.TrimEnd('/')
        
    } else {
        Write-Host ""
        Write-Host "ℹ️  Primero debes desplegar el backend:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   1. Ve a https://render.com" -ForegroundColor Gray
        Write-Host "   2. Crea una cuenta con GitHub" -ForegroundColor Gray
        Write-Host "   3. Click 'New +' → 'Web Service'" -ForegroundColor Gray
        Write-Host "   4. Conecta este repositorio" -ForegroundColor Gray
        Write-Host "   5. Render detectará automáticamente la configuración" -ForegroundColor Gray
        Write-Host "   6. Agrega variable JWT_SECRET" -ForegroundColor Gray
        Write-Host "   7. Click 'Create Web Service'" -ForegroundColor Gray
        Write-Host "   8. Copia la URL que te dan" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Ver guía completa: DEPLOYMENT-QUICKSTART.md" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
}

Write-Host ""
Write-Host "🔧 Actualizando configuración..." -ForegroundColor Yellow

# Actualizar js/config.js
$configFile = "js/config.js"
$content = Get-Content $configFile -Raw

$oldPattern = ": 'https://charlotte-video-server\.onrender\.com'"
$newValue = ": '$BackendURL'"

if ($content -match $oldPattern) {
    $content = $content -replace $oldPattern, $newValue
    Set-Content $configFile -Value $content -NoNewline
    Write-Host "   ✓ Actualizado js/config.js" -ForegroundColor Green
    Write-Host "     Backend URL: $BackendURL" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  No se pudo actualizar automáticamente" -ForegroundColor Yellow
    Write-Host "     Edita manualmente js/config.js y cambia la URL del backend" -ForegroundColor Gray
}

Write-Host ""

# Verificar Git
Write-Host "📦 Preparando Git..." -ForegroundColor Yellow

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "   ⚠️  Git no está instalado o no está en el PATH" -ForegroundColor Yellow
    Write-Host "     Salta este paso o instala Git desde https://git-scm.com/" -ForegroundColor Gray
} else {
    # Verificar cambios
    $status = git status --porcelain
    if ($status) {
        Write-Host "   Archivos modificados detectados:" -ForegroundColor Gray
        Write-Host ""
        
        $commit = Read-Host "¿Deseas hacer commit de los cambios? (S/N)"
        if ($commit -eq "S" -or $commit -eq "s") {
            git add .
            git commit -m "Configurar backend para producción: $BackendURL"
            Write-Host "   ✓ Commit realizado" -ForegroundColor Green
            Write-Host ""
            
            $push = Read-Host "¿Deseas hacer push a GitHub ahora? (S/N)"
            if ($push -eq "S" -or $push -eq "s") {
                git push
                Write-Host "   ✓ Cambios enviados a GitHub" -ForegroundColor Green
            } else {
                Write-Host "   ℹ️  Recuerda hacer push más tarde:" -ForegroundColor Cyan
                Write-Host "      git push" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   ✓ No hay cambios pendientes" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    ✅ Preparación Completada" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor White
Write-Host ""
Write-Host "   1. Verifica que el backend esté corriendo:" -ForegroundColor Yellow
Write-Host "      $BackendURL" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Si usas Netlify, el frontend se actualizará automáticamente" -ForegroundColor Yellow
Write-Host "      O manualmente: Netlify Dashboard → Trigger Deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Prueba el sistema:" -ForegroundColor Yellow
Write-Host "      - Abre tu sitio web" -ForegroundColor Gray
Write-Host "      - Ve a /admin.html" -ForegroundColor Gray
Write-Host "      - Crea una sala de videoconferencia" -ForegroundColor Gray
Write-Host "      - Prueba la conexión" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentación útil:" -ForegroundColor White
Write-Host "   • DEPLOYMENT-QUICKSTART.md - Guía rápida de despliegue" -ForegroundColor Gray
Write-Host "   • DESPLIEGUE-PRODUCCION.md - Guía completa" -ForegroundColor Gray
Write-Host "   • VIDEOCONFERENCIAS.md - Documentación técnica" -ForegroundColor Gray
Write-Host ""
