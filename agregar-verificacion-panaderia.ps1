# Script para agregar verificación de programa Panadería a las páginas de recetas

$archivos = @(
    "recetas-panes-especiales.html",
    "recetas-bizcochos-galletas.html",
    "recetas-empanadas-hojaldre.html",
    "recetas-pasteleria.html",
    "recetas-especiales.html"
)

$scriptVerificacion = @"

<script>
// Verificar acceso exclusivo para estudiantes de Panadería
(function() {
    const currentUser = sessionStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Debes iniciar sesión para acceder a las recetas');
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(currentUser);
    if (user.programa !== 'Panadería') {
        alert('⚠️ Acceso Denegado\n\nEste contenido es exclusivo para estudiantes de Panadería.');
        window.location.href = 'estudiante.html';
    }
})();
</script>

</body>
</html>
"@

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        $contenido = Get-Content $archivo -Raw -Encoding UTF8
        
        # Reemplazar </body></html> con el script de verificación
        $nuevoContenido = $contenido -replace '</body>\s*</html>\s*$', $scriptVerificacion
        
        # Guardar el archivo
        $nuevoContenido | Set-Content $archivo -Encoding UTF8 -NoNewline
        
        Write-Host "✓ $archivo actualizado con verificación de Panadería" -ForegroundColor Green
    } else {
        Write-Host "✗ $archivo no encontrado" -ForegroundColor Red
    }
}

Write-Host "`n¡Todas las páginas de recetas protegidas para estudiantes de Panadería!" -ForegroundColor Cyan
