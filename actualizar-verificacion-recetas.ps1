# Script para actualizar la verificación de autenticación en páginas de recetas

$archivos = @(
    "recetas-panes-especiales.html",
    "recetas-bizcochos-galletas.html",
    "recetas-empanadas-hojaldre.html",
    "recetas-pasteleria.html",
    "recetas-especiales.html"
)

$scriptAntiguo = @"
<script>
// Verificar acceso exclusivo para estudiantes de Panadería
\(function\(\) \{
    const currentUser = sessionStorage\.getItem\('currentUser'\);
    if \(!currentUser\) \{
        alert\('Debes iniciar sesión para acceder a las recetas'\);
        window\.location\.href = 'login\.html';
        return;
    \}
    const user = JSON\.parse\(currentUser\);
    if \(user\.programa !== 'Panadería'\) \{
        alert\('⚠️ Acceso Denegado\\n\\nEste contenido es exclusivo para estudiantes de Panadería\.'\);
        window\.location\.href = 'estudiante\.html';
    \}
\}\)\(\);
</script>
"@

$scriptNuevo = @"
<script>
// Verificar acceso exclusivo para estudiantes de Panadería
(function() {
    try {
        const currentUserStr = sessionStorage.getItem('currentUser');
        if (!currentUserStr) {
            alert('Debes iniciar sesión para acceder a las recetas');
            window.location.href = 'login.html';
            return;
        }
        const user = JSON.parse(currentUserStr);
        if (!user.programa) {
            alert('⚠️ Error: No tienes un programa asignado.');
            window.location.href = 'estudiante.html';
            return;
        }
        const programaNormalizado = user.programa.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (programaNormalizado !== 'panaderia') {
            alert('⚠️ Acceso Denegado\n\nEste contenido es exclusivo para estudiantes de Panadería.');
            window.location.href = 'estudiante.html';
        }
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'login.html';
    }
})();
</script>
"@

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        $contenido = Get-Content $archivo -Raw -Encoding UTF8
        
        # Reemplazar el script antiguo con el nuevo
        $nuevoContenido = $contenido -replace $scriptAntiguo, $scriptNuevo
        
        # Guardar el archivo
        $nuevoContenido | Set-Content $archivo -Encoding UTF8 -NoNewline
        
        Write-Host "✓ $archivo actualizado" -ForegroundColor Green
    } else {
        Write-Host "✗ $archivo no encontrado" -ForegroundColor Red
    }
}

Write-Host "`n¡Verificación mejorada en todas las páginas de recetas!" -ForegroundColor Cyan
