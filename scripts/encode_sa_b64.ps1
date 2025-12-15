# Codifica el service account JSON en Base64 y lo copia al portapapeles
param(
  [string]$Path = "C:\secrets\charlotte-sa.json"
)
if(-not (Test-Path $Path)){
  Write-Error "Archivo no encontrado: $Path"
  exit 1
}
$raw = Get-Content -Raw -Path $Path
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($raw))
$b64 | Set-Clipboard
Write-Output "Base64 copiado al portapapeles. Pégalo en GitHub Secrets -> FIREBASE_SERVICE_ACCOUNT_B64"
