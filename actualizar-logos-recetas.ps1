$archivos = @(
    'recetas-panes-especiales.html',
    'recetas-bizcochos-galletas.html',
    'recetas-empanadas-hojaldre.html',
    'recetas-pasteleria.html',
    'recetas-especiales.html'
)

$oldStylePattern = '(?s)\.logo \{ width: 60px; height: 60px;.*?font-size: 1\.5rem; \}'
$newStyle = '.logo { height: 80px; width: auto; background: white; padding: 10px; border-radius: 10px; }
        .header-text h1 { font-size: 1.8rem; margin: 0; }
        .header-text p { opacity: 0.9; font-size: 0.9rem; margin: 0; }'

$oldHeaderPattern = '(?s)<div class="logo">C</div>\s*<div>\s*<h1>CHARLOTTE</h1>\s*<p>Centro Educativo - Recetario de Panadería</p>\s*</div>'
$newHeader = '<img src="fotos/logo.png" alt="Charlotte Logo" class="logo" onerror="this.style.display=''none''">
            <div class="header-text">
                <h1>CHARLOTTE</h1>
                <p>Centro Educativo - Recetario de Panadería</p>
            </div>'

foreach ($archivo in $archivos) {
    Write-Host "Actualizando $archivo..." -ForegroundColor Cyan
    
    $content = Get-Content $archivo -Raw -Encoding UTF8
    
    # Actualizar estilos del logo
    $content = $content -replace $oldStylePattern, $newStyle
    
    # Actualizar header HTML
    $content = $content -replace $oldHeaderPattern, $newHeader
    
    $content | Set-Content $archivo -Encoding UTF8 -NoNewline
    
    Write-Host "✓ $archivo actualizado" -ForegroundColor Green
}

Write-Host "`n¡Todos los logos actualizados!" -ForegroundColor Green
