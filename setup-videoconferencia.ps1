# ============================================
# Script de Configuración - Sistema de Videoconferencias
# ECE Charlotte
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    Sistema de Videoconferencias - ECE Charlotte" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Write-Host "   Por favor instala Node.js desde https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Verificar npm
Write-Host "🔍 Verificando npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm no está instalado" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm instalado: $npmVersion" -ForegroundColor Green
Write-Host ""

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
Write-Host ""

# Verificar JWT_SECRET
Write-Host "🔐 Verificando JWT_SECRET..." -ForegroundColor Yellow
if (-not $env:JWT_SECRET) {
    Write-Host "⚠️  JWT_SECRET no está configurado" -ForegroundColor Yellow
    Write-Host ""
    
    $respuesta = Read-Host "¿Deseas configurar JWT_SECRET ahora? (S/N)"
    if ($respuesta -eq "S" -or $respuesta -eq "s") {
        # Generar JWT_SECRET aleatorio
        $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        
        # Configurar para la sesión actual
        $env:JWT_SECRET = $jwtSecret
        Write-Host "✅ JWT_SECRET configurado para esta sesión" -ForegroundColor Green
        
        # Preguntar si desea guardarlo permanentemente
        Write-Host ""
        Write-Host "💡 Para guardar permanentemente, agrega esto a tu perfil de PowerShell:" -ForegroundColor Cyan
        Write-Host "   `$env:JWT_SECRET = '$jwtSecret'" -ForegroundColor White
        Write-Host ""
        
        $guardar = Read-Host "¿Deseas agregarlo al perfil de PowerShell ahora? (S/N)"
        if ($guardar -eq "S" -or $guardar -eq "s") {
            $profilePath = $PROFILE.CurrentUserAllHosts
            if (-not (Test-Path $profilePath)) {
                New-Item -Path $profilePath -ItemType File -Force | Out-Null
            }
            Add-Content -Path $profilePath -Value "`n# JWT Secret para Charlotte`n`$env:JWT_SECRET = '$jwtSecret'"
            Write-Host "✅ JWT_SECRET agregado al perfil de PowerShell" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  Debes configurar JWT_SECRET antes de iniciar el servidor" -ForegroundColor Yellow
        Write-Host "   Ejecuta: `$env:JWT_SECRET = 'tu-secreto-aqui'" -ForegroundColor White
    }
} else {
    Write-Host "✅ JWT_SECRET ya está configurado" -ForegroundColor Green
}
Write-Host ""

# Verificar si existe la base de datos
Write-Host "💾 Verificando base de datos..." -ForegroundColor Yellow
if (Test-Path "data.db") {
    Write-Host "✅ Base de datos encontrada" -ForegroundColor Green
} else {
    Write-Host "ℹ️  La base de datos se creará al iniciar el servidor" -ForegroundColor Cyan
}
Write-Host ""

# Resumen
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    🎉 ¡Configuración Completada!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor White
Write-Host ""
Write-Host "   1. Iniciar el servidor:" -ForegroundColor Yellow
Write-Host "      npm start" -ForegroundColor White
Write-Host ""
Write-Host "   2. Acceder al panel de administración:" -ForegroundColor Yellow
Write-Host "      http://localhost:3000/admin.html" -ForegroundColor White
Write-Host "      Usuario: admin@admin.local" -ForegroundColor Cyan
Write-Host "      Contraseña: admin123" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Crear salas de videoconferencia:" -ForegroundColor Yellow
Write-Host "      Ir a 'Videoconferencia' en el menú lateral" -ForegroundColor White
Write-Host ""
Write-Host "   4. Compartir enlaces con estudiantes:" -ForegroundColor Yellow
Write-Host "      http://localhost:3000/videoconferencia.html" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Preguntar si desea iniciar el servidor
$iniciar = Read-Host "¿Deseas iniciar el servidor ahora? (S/N)"
if ($iniciar -eq "S" -or $iniciar -eq "s") {
    Write-Host ""
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
    Write-Host ""
    npm start
} else {
    Write-Host ""
    Write-Host "👋 Para iniciar el servidor más tarde, ejecuta:" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor White
    Write-Host ""
}
