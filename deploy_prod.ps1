# Despliega el repo actual a Netlify en producción
# Uso: ejecutar este script desde cualquier carpeta en PowerShell.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path $scriptDir
$siteId = '3d8abbc2-2dd1-4dc8-a635-7091114a976e'

Write-Host "Cambiando al directorio raíz del repo: $root"
Push-Location $root
try {
	Write-Host "Ejecutando: netlify deploy --prod --dir=$root --site $siteId"
	netlify deploy --prod --dir=$root --site $siteId
} finally {
	Pop-Location
}
