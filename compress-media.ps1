# Script para comprimir imágenes y videos
Add-Type -AssemblyName System.Drawing

function Compress-Image {
    param(
        [string]$inputPath,
        [string]$outputPath,
        [int]$quality = 75,
        [int]$maxWidth = 1920
    )
    
    try {
        $image = [System.Drawing.Image]::FromFile($inputPath)
        
        # Calcular nuevas dimensiones manteniendo aspecto
        $ratio = $image.Width / $image.Height
        $newWidth = [Math]::Min($image.Width, $maxWidth)
        $newHeight = [int]($newWidth / $ratio)
        
        # Crear nueva imagen redimensionada
        $newImage = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($newImage)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
        
        # Configurar codec JPEG con calidad
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
        
        # Guardar imagen comprimida
        $newImage.Save($outputPath, $encoder, $encoderParams)
        
        # Liberar recursos
        $graphics.Dispose()
        $newImage.Dispose()
        $image.Dispose()
        
        $originalSize = (Get-Item $inputPath).Length / 1MB
        $compressedSize = (Get-Item $outputPath).Length / 1MB
        $reduction = [Math]::Round((1 - ($compressedSize / $originalSize)) * 100, 2)
        
        Write-Host "✓ $([System.IO.Path]::GetFileName($inputPath)): $([Math]::Round($originalSize, 2))MB → $([Math]::Round($compressedSize, 2))MB ($reduction% reducción)"
        return $true
    }
    catch {
        Write-Host "✗ Error procesando $inputPath : $_" -ForegroundColor Red
        return $false
    }
}

# Comprimir imágenes de belleza
Write-Host "`n📸 Comprimiendo imágenes de Belleza..." -ForegroundColor Cyan
$bellezaImages = Get-ChildItem "Trabajos belleza\*.jpg"
$count = 0
foreach ($img in $bellezaImages) {
    $outputPath = $img.FullName
    $tempPath = "$($img.DirectoryName)\temp_$($img.Name)"
    if (Compress-Image -inputPath $img.FullName -outputPath $tempPath -quality 80 -maxWidth 1920) {
        Remove-Item $img.FullName -Force
        Move-Item $tempPath $outputPath -Force
        $count++
    }
}
Write-Host "✓ $count imágenes de belleza comprimidas`n" -ForegroundColor Green

# Comprimir imágenes de panadería
Write-Host "📸 Comprimiendo imágenes de Panadería..." -ForegroundColor Cyan
$panaderiaImages = Get-ChildItem "Trabajos panadería\*.jpg"
$count = 0
foreach ($img in $panaderiaImages) {
    $outputPath = $img.FullName
    $tempPath = "$($img.DirectoryName)\temp_$($img.Name)"
    if (Compress-Image -inputPath $img.FullName -outputPath $tempPath -quality 80 -maxWidth 1920) {
        Remove-Item $img.FullName -Force
        Move-Item $tempPath $outputPath -Force
        $count++
    }
}
Write-Host "✓ $count imágenes de panadería comprimidas`n" -ForegroundColor Green

# Función para comprimir videos
function Compress-Video {
    param(
        [string]$inputPath,
        [string]$outputPath
    )
    
    try {
        # Comprimir video con FFmpeg: reduce tamaño manteniendo calidad aceptable
        # -crf 28: calidad (18-28 es buen rango, mayor número = menor calidad/tamaño)
        # -preset fast: velocidad de compresión
        # -vf scale=1280:-2: redimensionar a max 1280px ancho
        $ffmpegArgs = "-i `"$inputPath`" -vcodec libx264 -crf 28 -preset fast -vf scale=1280:-2 -acodec aac -b:a 128k `"$outputPath`" -y"
        
        $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0 -and (Test-Path $outputPath)) {
            $originalSize = (Get-Item $inputPath).Length / 1MB
            $compressedSize = (Get-Item $outputPath).Length / 1MB
            $reduction = [Math]::Round((1 - ($compressedSize / $originalSize)) * 100, 2)
            
            Write-Host "✓ $([System.IO.Path]::GetFileName($inputPath)): $([Math]::Round($originalSize, 2))MB → $([Math]::Round($compressedSize, 2))MB ($reduction% reducción)"
            return $true
        } else {
            Write-Host "✗ Error procesando video $inputPath" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Verificar si FFmpeg está disponible
$ffmpegAvailable = $false
try {
    $null = ffmpeg -version 2>&1
    $ffmpegAvailable = $true
    Write-Host "✓ FFmpeg encontrado`n" -ForegroundColor Green
}
catch {
    Write-Host "`n⚠ FFmpeg no encontrado." -ForegroundColor Yellow
    Write-Host "Para comprimir videos, instala FFmpeg con:" -ForegroundColor Yellow
    Write-Host "  winget install -e --id Gyan.FFmpeg`n" -ForegroundColor Cyan
}

if ($ffmpegAvailable) {
    # Comprimir videos de belleza
    Write-Host "🎬 Comprimiendo videos de Belleza..." -ForegroundColor Cyan
    $bellezaVideos = Get-ChildItem "Trabajos belleza\*.mp4"
    $count = 0
    foreach ($video in $bellezaVideos) {
        $tempPath = "$($video.DirectoryName)\temp_$($video.Name)"
        if (Compress-Video -inputPath $video.FullName -outputPath $tempPath) {
            Remove-Item $video.FullName -Force
            Move-Item $tempPath $video.FullName -Force
            $count++
        }
    }
    Write-Host "✓ $count videos de belleza comprimidos`n" -ForegroundColor Green

    # Comprimir videos de panadería
    Write-Host "🎬 Comprimiendo videos de Panadería..." -ForegroundColor Cyan
    $panaderiaVideos = Get-ChildItem "Trabajos panadería\*.mp4"
    $count = 0
    foreach ($video in $panaderiaVideos) {
        $tempPath = "$($video.DirectoryName)\temp_$($video.Name)"
        if (Compress-Video -inputPath $video.FullName -outputPath $tempPath) {
            Remove-Item $video.FullName -Force
            Move-Item $tempPath $video.FullName -Force
            $count++
        }
    }
    Write-Host "✓ $count videos de panadería comprimidos`n" -ForegroundColor Green
}

Write-Host "`n✅ Compresión completada!" -ForegroundColor Green
