<#
Script para ejecutar tareas de preparación en Windows:
- Ejecuta el script Node que inserta includes en los HTML
- Renombra y optimiza el logo

Uso: abrir PowerShell en la carpeta del proyecto y ejecutar:
  .\scripts\run_all.ps1
#>
Set-StrictMode -Version Latest
Write-Output "Ejecutando add_includes.js (Node.js debe estar instalado)..."
if(Get-Command node -ErrorAction SilentlyContinue){
  node scripts/add_includes.js
} else {
  Write-Warning "Node.js no encontrado en PATH. Salta la inserción automática de includes.";
}

Write-Output "Renombrando y optimizando logo (si existe)..."
.
\scripts\rename_logo.ps1

Write-Output "Tareas completadas. Revisa el README.md para instrucciones de previsualización."
