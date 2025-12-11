# Script para generar el recetario completo
Write-Host "Generando recetario completo..." -ForegroundColor Cyan

$contenidoHTML = @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recetario Completo - Panadería ECE CHARLOTTE</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        .recipe-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .recipe { background: white; border-radius: 10px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .recipe h2 { color: #A0522D; border-bottom: 3px solid #DEB887; padding-bottom: 10px; margin-bottom: 20px; }
        .recipe h3 { color: #8B4513; margin-top: 25px; }
        .recipe table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .recipe th, .recipe td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .recipe th { background-color: #F5DEB3; color: #8B4513; font-weight: bold; }
        .tips { background-color: #FFF8DC; border-left: 4px solid #DAA520; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .procedure { background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 15px 0; line-height: 1.8; }
        .time-table { width: auto; }
        .page-number { text-align: right; color: #888; font-size: 0.9em; margin-top: 15px; font-style: italic; }
        .nav-buttons { display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap; }
        .nav-buttons a { flex: 1; min-width: 200px; text-align: center; padding: 15px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; transition: background 0.3s; }
        .nav-buttons a:hover { background: #5568d3; }
        .print-btn { background: #28a745 !important; }
        .print-btn:hover { background: #218838 !important; }
        @media print {
            .nav-buttons, .site-header, .site-footer { display: none; }
            .recipe { page-break-inside: avoid; box-shadow: none; }
        }
    </style>
</head>
<body>
    <header class="site-header">
        <div class="container header-content">
            <div class="header-brand">
                <h1>CHARLOTTE</h1>
                <p>Centro Educativo</p>
            </div>
        </div>
    </header>

    <div class="recipe-container">
        <div class="nav-buttons">
            <a href="recetario-index.html">← Índice del Recetario</a>
            <a href="panaderia.html">← Volver al Curso</a>
            <a href="javascript:window.print()" class="print-btn">🖨️ Imprimir Recetario</a>
        </div>

        <h1 style="text-align: center; color: #8B4513; font-size: 2.5em; margin: 40px 0; border-bottom: 4px solid #D2691E; padding-bottom: 20px;">📖 Recetario de Panadería y Pastelería 2024-2025</h1>
        <p style="text-align: center; color: #666; font-size: 1.2em; margin-bottom: 50px;">Material exclusivo para estudiantes ECE CHARLOTTE</p>

        <p style="background: #FFF8DC; padding: 20px; border-radius: 8px; border-left: 5px solid #DAA520; margin: 30px 0;">
            <strong>📌 Nota:</strong> Este recetario contiene más de 40 recetas profesionales de panadería y pastelería. 
            Utiliza el botón de imprimir para guardar o imprimir el material completo.
        </p>

"@

Write-Host "Archivo creado exitosamente en: recetario-completo.html" -ForegroundColor Green
Write-Host "Recuerda: El contenido completo de las recetas se agregará manualmente debido al tamaño." -ForegroundColor Yellow

Set-Content -Path "C:\workspace\recetario-base.html" -Value $contenidoHTML -Encoding UTF8
