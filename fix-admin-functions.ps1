# Script para arreglar las funciones en admin.html

$archivo = "admin.html"
$contenido = Get-Content $archivo -Raw -Encoding UTF8

# Cambiar window.saveVideo = function a function saveVideo
$contenido = $contenido -replace 'window\.saveVideo = function', 'function saveVideo'
$contenido = $contenido -replace 'window\.saveClase = function', 'function saveClase'
$contenido = $contenido -replace 'window\.saveActividad = function', 'function saveActividad'
$contenido = $contenido -replace 'window\.saveCuestionario = function', 'function saveCuestionario'
$contenido = $contenido -replace 'window\.saveMaterial = function', 'function saveMaterial'
$contenido = $contenido -replace 'window\.savePDF = function', 'function savePDF'
$contenido = $contenido -replace 'window\.deleteMaterial = async function', 'async function deleteMaterial'
$contenido = $contenido -replace 'window\.deleteItem = function', 'function deleteItem'
$contenido = $contenido -replace 'window\.logout = function', 'function logout'
$contenido = $contenido -replace 'window\.toggleMobileMenu = function', 'function toggleMobileMenu'
$contenido = $contenido -replace 'window\.agregarPregunta = function', 'function agregarPregunta'
$contenido = $contenido -replace 'window\.eliminarPregunta = function', 'function eliminarPregunta'
$contenido = $contenido -replace 'window\.toggleTipoPregunta = function', 'function toggleTipoPregunta'
$contenido = $contenido -replace 'window\.verCuestionario = function', 'function verCuestionario'
$contenido = $contenido -replace 'window\.deleteCuestionario = function', 'function deleteCuestionario'

# Guardar
$contenido | Set-Content $archivo -Encoding UTF8 -NoNewline

Write-Host "✓ Funciones arregladas en admin.html" -ForegroundColor Green
