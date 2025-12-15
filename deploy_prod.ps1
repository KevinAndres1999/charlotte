# Script para desplegar desde la raíz del repo a Netlify (force deploy)
$root = (Resolve-Path .).Path
Write-Output "Directorio raíz: $root"
Write-Output "Ejecutando: netlify deploy --prod --dir=$root --site 3d8abbc2-2dd1-4dc8-a635-7091114a976e"
netlify deploy --prod --dir="$root" --site 3d8abbc2-2dd1-4dc8-a635-7091114a976e
