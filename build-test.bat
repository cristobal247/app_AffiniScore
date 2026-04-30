@echo off
cd /d "C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend"

echo ========================================
echo Compilando Frontend - Checking Syntax
echo ========================================
echo.

REM Intentamos hacer un build para ver si hay errores de compilación
REM Nota: Este es un test, no se genera output final
call npm run build 2>&1 | findstr /C:"error" /C:"ERROR" /C:"Error" /C:"failed"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Compilación completada (revisar salida arriba)
) else (
    echo.
    echo ⚠ Verifique los errores arriba
)

pause
