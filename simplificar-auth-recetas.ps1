# Script para simplificar la verificación de Panadería en todas las páginas de recetas

$archivos = @(
    "recetas-panes-especiales.html",
    "recetas-bizcochos-galletas.html",
    "recetas-empanadas-hojaldre.html",
    "recetas-pasteleria.html",
    "recetas-especiales.html"
)

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        $contenido = Get-Content $archivo -Raw -Encoding UTF8
        
        # Buscar el script actual (con regex flexible)
        $pattern = '<script>[\s\S]*?Verificar acceso exclusivo[\s\S]*?</script>'
        
        $nuevoScript = @"
<script>
// Verificación simple de acceso para Panadería
(function() {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) { window.location.replace('login.html'); return; }
    
    try {
        const user = JSON.parse(userStr);
        if (!user.programa) { 
            alert('⚠️ No tienes programa asignado.');
            window.location.replace('estudiante.html');
            return;
        }
        const programa = user.programa.toLowerCase().replace(/[áàäâ]/, 'a').replace(/[éèëê]/, 'e').replace(/[íìïî]/, 'i');
        if (!programa.includes('panaderia')) {
            alert('⚠️ Contenido exclusivo para estudiantes de Panadería.');
            window.location.replace('estudiante.html');
        }
    } catch (e) { window.location.replace('login.html'); }
})();
</script>
"@
        
        # Reemplazar el script
        $nuevoContenido = $contenido -replace $pattern, $nuevoScript
        
        # Guardar
        $nuevoContenido | Set-Content $archivo -Encoding UTF8 -NoNewline
        
        Write-Host "✓ $archivo - Verificación simplificada" -ForegroundColor Green
    } else {
        Write-Host "✗ $archivo no encontrado" -ForegroundColor Red
    }
}

Write-Host "`n¡Verificación simplificada en todas las páginas!" -ForegroundColor Cyan
Write-Host "Ahora los usuarios de Panadería ya logueados tienen acceso directo." -ForegroundColor Cyan
