@echo off
echo 🚀 Iniciando deploy a Netlify...
echo 📁 Directorio: %CD%
echo ⏰ Fecha: %DATE% %TIME%
echo.

cd /d "%~dp0"

echo 📦 Ejecutando deploy...
netlify deploy --prod --dir . --message "Deploy automático - %DATE% %TIME%"

echo.
echo ✅ Deploy completado
echo 🌐 URL: https://cursoscharlotte.com
echo.

pause