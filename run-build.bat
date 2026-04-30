@echo off
echo ========================================
echo COMPILANDO FRONTEND - AFFINI SCORE
echo ========================================
echo.

cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend

echo [1/2] Instalando dependencias...
call npm install

echo.
echo [2/2] Compilando...
call npm run build

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo COMPILACION EXITOSA!
    echo ========================================
    echo.
    echo Ahora podes ejecutar:
    echo   npm start
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR EN COMPILACION
    echo ========================================
    echo Revisa los errores arriba
    echo.
)

pause
