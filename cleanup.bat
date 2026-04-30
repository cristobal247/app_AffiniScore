@echo off
REM Codificación UTF-8
chcp 65001 >nul

cd /d "C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project"

echo.
echo ════════════════════════════════════════════════════════════════════
echo  LIMPIEZA DE ARCHIVOS REDUNDANTES
echo ════════════════════════════════════════════════════════════════════
echo.

echo [1/3] Identificando archivos a eliminar...
echo.

echo ARCHIVOS QUE SE ELIMINARÁN (REDUNDANTES):
echo.
echo Documentación antigua/duplicada:
echo   - GUIA_CONTINUAR.md
echo   - GUIA_TESTING.md (reemplazado por TESTING_AND_DEFENSE_GUIDE.md)
echo   - PRESENTACION_DEFENSA.md
echo   - README_DOCUMENTACION.md
echo   - RESUMEN_FINAL.md
echo   - SCRIPT_DEFENSA.md
echo   - TESTING_QUICK_START.md (reemplazado por QUICK_REFERENCE.txt)
echo   - TAREA_3_2_BINGO_RESUMEN.md
echo   - TAREA_3_3_MAPBOX_RESUMEN.md
echo   - Reporte_Integracion_AffiniScore.ipynb (Jupyter notebook)
echo.

echo Scripts antiguos/duplicados:
echo   - build-bingo.bat (reemplazado por run-build.bat)
echo   - build-test.bat
echo   - commit-bingo.sh
echo   - create_branch.bat
echo   - push_branch.py
echo   - verify-setup.sh
echo.

echo ARCHIVOS QUE SE MANTIENEN:
echo   ✓ TESTING_AND_DEFENSE_GUIDE.md (guía principal)
echo   ✓ QUICK_REFERENCE.txt (referencia rápida)
echo   ✓ DOWNLOAD_AND_TEST_OTHER_PC.md (instrucciones descarga)
echo   ✓ FINAL_STATUS.txt (resumen estado)
echo   ✓ PUSH_NOW.txt (instrucciones push)
echo   ✓ TAREAS_COMPLETADAS_RESUMEN.md (resumen técnico)
echo   ✓ push-all.bat (script de push)
echo   ✓ push.bat (script de push alternativo)
echo   ✓ run-build.bat
echo   ✓ run-dev.bat
echo   ✓ commit-fixes.bat
echo.

echo [2/3] Eliminando archivos redundantes...
echo.

del "GUIA_CONTINUAR.md" 2>nul && echo   ✓ Eliminado: GUIA_CONTINUAR.md
del "GUIA_TESTING.md" 2>nul && echo   ✓ Eliminado: GUIA_TESTING.md
del "PRESENTACION_DEFENSA.md" 2>nul && echo   ✓ Eliminado: PRESENTACION_DEFENSA.md
del "README_DOCUMENTACION.md" 2>nul && echo   ✓ Eliminado: README_DOCUMENTACION.md
del "RESUMEN_FINAL.md" 2>nul && echo   ✓ Eliminado: RESUMEN_FINAL.md
del "SCRIPT_DEFENSA.md" 2>nul && echo   ✓ Eliminado: SCRIPT_DEFENSA.md
del "TESTING_QUICK_START.md" 2>nul && echo   ✓ Eliminado: TESTING_QUICK_START.md
del "TAREA_3_2_BINGO_RESUMEN.md" 2>nul && echo   ✓ Eliminado: TAREA_3_2_BINGO_RESUMEN.md
del "TAREA_3_3_MAPBOX_RESUMEN.md" 2>nul && echo   ✓ Eliminado: TAREA_3_3_MAPBOX_RESUMEN.md
del "Reporte_Integracion_AffiniScore.ipynb" 2>nul && echo   ✓ Eliminado: Reporte_Integracion_AffiniScore.ipynb
del "build-bingo.bat" 2>nul && echo   ✓ Eliminado: build-bingo.bat
del "build-test.bat" 2>nul && echo   ✓ Eliminado: build-test.bat
del "commit-bingo.sh" 2>nul && echo   ✓ Eliminado: commit-bingo.sh
del "create_branch.bat" 2>nul && echo   ✓ Eliminado: create_branch.bat
del "push_branch.py" 2>nul && echo   ✓ Eliminado: push_branch.py
del "verify-setup.sh" 2>nul && echo   ✓ Eliminado: verify-setup.sh

echo.
echo [3/3] Listando archivos restantes en ROOT...
echo.
dir /b /a:-d
echo.

echo ════════════════════════════════════════════════════════════════════
echo  ✅ LIMPIEZA COMPLETADA
echo ════════════════════════════════════════════════════════════════════
echo.
echo Archivos restantes (solo los esenciales):
echo   - Documentación: 5 archivos
echo   - Scripts: 4 archivos
echo   - Carpetas: frontend, backend
echo   - Git: .git, .gitignore
echo.
timeout /t 3
