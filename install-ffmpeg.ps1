# Script de instalación de FFmpeg para Windows
# Ejecutar como administrador: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Write-Host "🎬 Instalador de FFmpeg para compresión de videos" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Verificar si FFmpeg ya está instalado
try {
    $ffmpegVersion = ffmpeg -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ FFmpeg ya está instalado:" -ForegroundColor Green
        Write-Host $ffmpegVersion.Split([Environment]::NewLine)[0]
        exit 0
    }
} catch {
    Write-Host "🔍 FFmpeg no encontrado, procediendo con la instalación..." -ForegroundColor Yellow
}

# Método 1: Winget (Windows 10/11)
Write-Host "`n📦 Método 1: Instalación via Winget" -ForegroundColor Cyan
Write-Host "----------------------------------------"

try {
    $wingetVersion = winget --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Winget encontrado: $wingetVersion" -ForegroundColor Green
        Write-Host "📥 Instalando FFmpeg via Winget..." -ForegroundColor Yellow
        
        winget install --id=Gyan.FFmpeg --exact --accept-package-agreements --accept-source-agreements
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ FFmpeg instalado exitosamente via Winget" -ForegroundColor Green
            Write-Host "🔄 Actualizando PATH..." -ForegroundColor Yellow
            
            # Actualizar PATH para la sesión actual
            $env:PATH += ";$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-full_bin"
            
            Write-Host "✅ Instalación completada" -ForegroundColor Green
            exit 0
        }
    }
} catch {
    Write-Host "❌ Error con Winget, probando método alternativo..." -ForegroundColor Red
}

# Método 2: Descarga manual
Write-Host "`n📦 Método 2: Descarga manual" -ForegroundColor Cyan
Write-Host "----------------------------"

$ffmpegUrl = "https://ffmpeg.org/releases/ffmpeg-release-full.7z"
$downloadPath = "$env:TEMP\ffmpeg-release-full.7z"
$extractPath = "$env:LOCALAPPDATA\ffmpeg"

Write-Host "📥 Descargando FFmpeg..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $ffmpegUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "✅ Descargado: $downloadPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Error descargando FFmpeg" -ForegroundColor Red
    Write-Host "📖 Descarga manualmente desde: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Verificar si 7-Zip está disponible
$sevenZip = Get-Command "7z" -ErrorAction SilentlyContinue
if (-not $sevenZip) {
    Write-Host "📦 Instalando 7-Zip..." -ForegroundColor Yellow
    winget install --id=7zip.7zip --exact --accept-package-agreements --accept-source-agreements
}

Write-Host "📂 Extrayendo FFmpeg..." -ForegroundColor Yellow
try {
    if (Test-Path $extractPath) {
        Remove-Item $extractPath -Recurse -Force
    }
    
    & 7z x $downloadPath -o"$env:TEMP" -y
    $extractedFolder = Get-ChildItem "$env:TEMP\ffmpeg*" -Directory | Select-Object -First 1
    
    Move-Item $extractedFolder.FullName $extractPath
    Write-Host "✅ Extraído en: $extractPath" -ForegroundColor Green
} catch {
    Write-Host "❌ Error extrayendo FFmpeg" -ForegroundColor Red
    exit 1
}

# Agregar al PATH
Write-Host "🔄 Configurando PATH..." -ForegroundColor Yellow
$ffmpegPath = "$extractPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

if ($currentPath -notlike "*$ffmpegPath*") {
    $newPath = $currentPath + ";$ffmpegPath"
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "✅ FFmpeg agregado al PATH del usuario" -ForegroundColor Green
} else {
    Write-Host "ℹ️  FFmpeg ya está en el PATH" -ForegroundColor Yellow
}

# Actualizar PATH para la sesión actual
$env:PATH += ";$ffmpegPath"

# Limpiar archivos temporales
Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue

# Verificar instalación
Write-Host "`n🔍 Verificando instalación..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ FFmpeg instalado exitosamente:" -ForegroundColor Green
        Write-Host $ffmpegVersion.Split([Environment]::NewLine)[0]
        
        Write-Host "`n🚀 Ahora puedes ejecutar:" -ForegroundColor Cyan
        Write-Host "   node compress-videos.js" -ForegroundColor White
        Write-Host "   node compress-videos.js --replace" -ForegroundColor White
        
    } else {
        Write-Host "❌ Error verificando FFmpeg" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error al ejecutar FFmpeg" -ForegroundColor Red
    Write-Host "🔄 Reinicia PowerShell y vuelve a intentar" -ForegroundColor Yellow
}

Write-Host "`n✅ Instalación completada" -ForegroundColor Green
