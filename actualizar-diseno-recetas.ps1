$newStyles = @"
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; }
        .header { background: linear-gradient(135deg, #e63971, #0b3460); color: white; padding: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
        .logo { width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #e63971; font-size: 1.5rem; }
        .header h1 { font-size: 1.8rem; }
        .header p { opacity: 0.9; font-size: 0.9rem; }
        .recipe-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .recipe { background: white; border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 4px solid #e63971; }
        .recipe h2 { color: #e63971; border-bottom: 3px solid #0b3460; padding-bottom: 10px; margin-bottom: 20px; }
        .recipe h3 { color: #0b3460; margin-top: 25px; }
        .recipe table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .recipe th, .recipe td { border: 1px solid #e8f0fe; padding: 12px; text-align: left; }
        .recipe th { background: linear-gradient(135deg, #fef5f9, #fce7f3); color: #e63971; font-weight: bold; }
        .tips { background: linear-gradient(135deg, #fef5f9, #fce7f3); border-left: 4px solid #e63971; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .procedure { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; line-height: 1.8; border-left: 3px solid #0b3460; }
        .time-table { width: auto; }
        .page-number { text-align: right; color: #888; font-size: 0.9em; margin-top: 15px; font-style: italic; }
        .nav-buttons { display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap; }
        .nav-buttons a { flex: 1; min-width: 200px; text-align: center; padding: 15px; background: linear-gradient(135deg, #e63971, #0b3460); color: white; text-decoration: none; border-radius: 10px; font-weight: bold; transition: all 0.3s; }
        .nav-buttons a:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(230,57,113,0.4); }
        .footer { background: #0b3460; color: white; text-align: center; padding: 2rem; margin-top: 3rem; }
        @media print { .nav-buttons, .header, .footer { display: none; } .recipe { page-break-inside: avoid; } }
    </style>
"@

$newHeader = @"
    <header class="header">
        <div class="header-content">
            <div class="logo">C</div>
            <div>
                <h1>CHARLOTTE</h1>
                <p>Centro Educativo - Recetario de Panadería</p>
            </div>
        </div>
    </header>
"@

$newFooter = @"
    <footer class="footer">
        <p>© 2025 CHARLOTTE Centro Educativo · Todos los derechos reservados</p>
    </footer>
"@

$archivos = @(
    'recetas-panes-especiales.html',
    'recetas-bizcochos-galletas.html',
    'recetas-empanadas-hojaldre.html',
    'recetas-pasteleria.html',
    'recetas-especiales.html'
)

foreach ($archivo in $archivos) {
    Write-Host "Actualizando $archivo..." -ForegroundColor Cyan
    
    $content = Get-Content $archivo -Raw
    
    # Reemplazar estilos
    $content = $content -replace '(?s)<link rel="stylesheet" href="styles.css">.*?</style>', $newStyles
    
    # Reemplazar header
    $content = $content -replace '(?s)<header class="site-header">.*?</header>', $newHeader
    
    # Reemplazar footer
    $content = $content -replace '(?s)<footer class="site-footer">.*?</footer>', $newFooter
    
    # Actualizar colores en h1
    $content = $content -replace 'color: #8B4513;', 'color: #e63971;'
    
    $content | Set-Content $archivo -Encoding UTF8
    
    Write-Host "✓ $archivo actualizado" -ForegroundColor Green
}

Write-Host "`n¡Todos los archivos actualizados con diseño Charlotte!" -ForegroundColor Green
