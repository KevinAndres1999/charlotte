Add-Type -AssemblyName System.Drawing

function Compress-VideoWeb {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$MaxWidth = 720,
        [int]$Quality = 28
    )
    
    # Usar HandBrakeCLI si está disponible, sino usar un método alternativo
    $handbrakePath = "C:\Program Files\HandBrake\HandBrakeCLI.exe"
    
    if (Test-Path $handbrakePath) {
        & $handbrakePath -i $InputPath -o $OutputPath --preset="Very Fast 720p30" -q $Quality 2>&1
    } else {
        # Si no hay HandBrake, copiar y reducir bitrate con ffmpeg alternativo
        Write-Host "Buscando ffmpeg..."
        $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
        if ($ffmpeg) {
            & ffmpeg -i $InputPath -vf "scale='min($MaxWidth,iw)':-2" -c:v libx264 -crf $Quality -preset fast -c:a aac -b:a 96k $OutputPath -y 2>&1
        } else {
            Write-Host "No se encontró compresor de video. Instalando FFmpeg..."
            winget install --id=Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
            Write-Host "FFmpeg instalado. Por favor, reinicia PowerShell y ejecuta el script nuevamente."
        }
    }
}

# Crear carpeta de respaldo
$backupFolder = "C:\workspace\Trabajos panadería - original"
if (-not (Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder -Force
}

# Comprimir videos
$videos = Get-ChildItem "C:\workspace\Trabajos panadería" -Filter "*.mp4"
$total = $videos.Count
$current = 0

foreach ($video in $videos) {
    $current++
    Write-Host "[$current/$total] Comprimiendo $($video.Name)..."
    
    # Hacer backup
    if (-not (Test-Path "$backupFolder\$($video.Name)")) {
        Copy-Item $video.FullName "$backupFolder\$($video.Name)"
    }
    
    $tempOutput = "$($video.DirectoryName)\temp_$($video.Name)"
    Compress-VideoWeb -InputPath $video.FullName -OutputPath $tempOutput -MaxWidth 720 -Quality 30
    
    if (Test-Path $tempOutput) {
        $originalSize = $video.Length / 1MB
        $newSize = (Get-Item $tempOutput).Length / 1MB
        $reduction = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 1)
        
        Write-Host "  Original: $([math]::Round($originalSize,2)) MB -> Comprimido: $([math]::Round($newSize,2)) MB (Reducción: $reduction%)"
        
        Remove-Item $video.FullName
        Rename-Item $tempOutput $video.Name
    }
}

Write-Host "`nCompresión completada!"
