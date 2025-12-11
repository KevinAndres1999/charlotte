# Script de prueba para el proyecto Portal Educativo
# - Instala dependencias
# - Inicia el servidor (`npm start`)
# - Espera a que responda en http://localhost:3000
# - Prueba login admin, lista usuarios y cambia la palabra de confirmación

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Directorio del script: $root"

# Comprobar node/npm
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js no está instalado o 'node' no está en PATH. Instala Node.js (incluye npm)."
  exit 1
}
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm no está disponible. Instala Node.js (incluye npm)."
  exit 1
}

Write-Host "node $(node -v)    npm $(npm -v)"

Write-Host "Instalando dependencias..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install falló."; exit 1 }

Write-Host "Iniciando servidor (npm start)..."
$proc = Start-Process -FilePath npm -ArgumentList 'start' -WorkingDirectory $root -NoNewWindow -PassThru
Start-Sleep -Milliseconds 500

# Esperar a que el servidor responda
$max = 30
$i = 0
Write-Host "Esperando al servidor en http://localhost:3000 ..."
while ($i -lt $max) {
  try {
    Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3 | Out-Null
    break
  } catch {
    Start-Sleep -Seconds 1
    $i++
  }
}
if ($i -ge $max) {
  Write-Error "El servidor no respondió en $max segundos. Revisa logs y dependencias. PID: $($proc.Id)"
  exit 1
}
Write-Host "Servidor disponible. PID: $($proc.Id)"

# Test: Login admin
Write-Host "Probando login admin..."
$loginBody = @{ email = 'admin@admin.local'; password = 'admin123' } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/login' -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
  Write-Host "Login correcto. Usuario:"; $login.user | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Error "Login admin falló: $_"
}

if (-not $login -or -not $login.token) {
  Write-Error "No se obtuvo token de admin. Abortando pruebas.";
  exit 1
}

$headers = @{ Authorization = "Bearer $($login.token)" }

# List users
Write-Host "Obteniendo lista de usuarios..."
try {
  $users = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/users' -Headers $headers -ErrorAction Stop
  Write-Host "Usuarios:"; $users | ConvertTo-Json -Depth 4 | Write-Host
} catch {
  Write-Error "Error obteniendo usuarios: $_"
}

# Cambiar palabra de confirmación
Write-Host "Actualizando palabra de confirmación a 'PRUEBA'..."
$settingsBody = @{ confirmWord = 'PRUEBA' } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Method Patch -Uri 'http://localhost:3000/api/admin/settings' -Headers $headers -ContentType 'application/json' -Body $settingsBody -ErrorAction Stop
  Write-Host "Respuesta settings:"; $res | ConvertTo-Json -Depth 2 | Write-Host
} catch {
  Write-Error "Error actualizando settings: $_"
}

Write-Host "Pruebas completadas. Mantener servidor activo? (S/N)"
$choice = Read-Host
if ($choice -match '^[Nn]') {
  Write-Host "Deteniendo servidor (PID $($proc.Id))..."
  try { Stop-Process -Id $proc.Id -Force } catch { Write-Warning "No se pudo detener proceso npm (PID $($proc.Id))" }
  Write-Host "Servidor detenido.";
} else {
  Write-Host "Servidor seguirá en ejecución. Para detenerlo manualmente: Stop-Process -Id $($proc.Id)"
}
