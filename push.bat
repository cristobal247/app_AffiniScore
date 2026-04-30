@echo off
chcp 65001 >nul
cd /d "C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project"

echo === VERIFICANDO STATUS ===
git status

echo.
echo === HACIENDO PUSH ===
git push -u origin featunifrepo_nacver

echo.
echo === VERIFICANDO RAMAS ===
git branch -v -a

echo.
echo === LISTO ===
timeout /t 5
