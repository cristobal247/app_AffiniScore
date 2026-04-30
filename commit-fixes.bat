@echo off
chcp 65001 >nul
cd /d "C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project"

echo === AGREGANDO CAMBIOS ===
git add -A

echo.
echo === COMMITEANDO FIXES ===
git commit -m "fix: Correct ionicons imports (checkmarkCircle to checkmarkCircleOutline)

- Fixed mapa.page.ts: checkmarkCircle icon doesn't exist in ionicons v7.4.0
- Updated to checkmarkCircleOutline variant
- Fixed mapa.page.html: Updated icon name to checkmark-circle-outline
- Fixed actions.page.ts: Same ionicons import correction
- All icons now use correct naming conventions

Also added comprehensive TESTING_AND_DEFENSE_GUIDE.md for presentation prep.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo.
echo === VERIFICANDO STATUS ===
git status

echo.
echo === LISTO PARA HACER PUSH ===
echo Ejecuta: push.bat
timeout /t 5
