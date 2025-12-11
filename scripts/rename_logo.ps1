<#
Renombra y optimiza el logo si existe en la raíz del proyecto.
Uso: Ejecutar desde la carpeta del proyecto en PowerShell: `.	emplates\scripts\rename_logo.ps1` o `.
ename_logo.ps1`.
#>
Set-StrictMode -Version Latest
Try{
  $srcNames = @("Mesa de trabajo 3.png","Mesa de trabajo 3.PNG","mesa de trabajo 3.png")
  $found = $null
  foreach($n in $srcNames){ if(Test-Path $n){ $found = $n; break } }
  if(-not $found){ Write-Output "No se encontró logo con nombre esperado en la raíz. Busca archivos PNG manualmente."; exit 0 }

  $logosDir = Join-Path -Path (Get-Location) -ChildPath "logos"
  if(-not (Test-Path $logosDir)){ New-Item -ItemType Directory -Path $logosDir | Out-Null }
  $dest = Join-Path $logosDir "intro-logo.png"
  Move-Item -Path $found -Destination $dest -Force
  Write-Output "Logo movido a: $dest"

  # Si ImageMagick está instalado, crear versiones optimizadas
  $magick = Get-Command magick -ErrorAction SilentlyContinue
  if($magick){
    Write-Output "ImageMagick detectado. Generando versiones optimizadas..."
    & magick $dest -resize 1200x -quality 85 "$logosDir\intro-logo@1x.png"
    & magick $dest -resize 600x -quality 80 "$logosDir\intro-logo@2x.png"
    & magick "$logosDir\intro-logo@1x.png" -quality 80 "$logosDir\intro-logo.webp"
    Write-Output "Versiones generadas en $logosDir"
  } else {
    Write-Output "ImageMagick no detectado. Omite generación de WebP.";
  }
} Catch {
  Write-Error "Error renombrando logo: $_"
}
