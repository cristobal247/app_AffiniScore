@echo off
REM start_local.bat
REM Arranca el backend (FastAPI) y frontend (Ionic/Angular) en ventanas separadas.
REM Úsalo desde la raíz del proyecto (doble clic o desde PowerShell/CMD).

SET "ROOT=%~dp0"

echo Iniciando backend (FastAPI) en nueva ventana...
start "Backend" cmd /k "cd /d "%ROOT%producto\app_AffiniScore\backend" && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Iniciando frontend (Ionic/Angular) en nueva ventana...
REM Credenciales reales de Supabase añadidas al script
set "SUPABASE_URL=https://fojvwsegibjssttbzghe.supabase.co"
set "SUPABASE_KEY=sb_publishable_pZmJy4l92Un1FusZit823w_vossgdgt"
set "GEMINI_API_KEY=TU_API_KEY_DE_GEMINI_AQUI"

echo Respaldando environment.ts...
if exist "%ROOT%producto\app_AffiniScore\frontend\src\environments\environment.ts" (
	copy /Y "%ROOT%producto\app_AffiniScore\frontend\src\environments\environment.ts" "%ROOT%producto\app_AffiniScore\frontend\src\environments\environment.ts.bak" >nul
)
echo Escribiendo credenciales reales en environment.ts...
powershell -Command " $path = '%ROOT%producto\app_AffiniScore\frontend\src\environments\environment.ts'; $text = Get-Content -Path $path -Raw; $text = [regex]::Replace($text, 'supabaseUrl:\s*''[^'']*''', 'supabaseUrl: ''' + '%SUPABASE_URL%' + ''''); $text = [regex]::Replace($text, 'supabaseKey:\s*''[^'']*''', 'supabaseKey: ''' + '%SUPABASE_KEY%' + ''''); $text = [regex]::Replace($text, 'apiKeyGemini:\s*''[^'']*''', 'apiKeyGemini: ''' + '%GEMINI_API_KEY%' + ''''); if ($text -notmatch 'supabaseKey:') { $text = $text -replace '(production:\s*false,?)', 'production: false,`n  supabaseUrl: ''%SUPABASE_URL%'',`n  supabaseKey: ''%SUPABASE_KEY%'',`n  apiKeyGemini: ''%GEMINI_API_KEY%'',`n  devAuth: false,' } ; if ($text -notmatch 'devAuth:') { $text = $text -replace '(apiKeyGemini:\s*''[^'']*''|supabaseKey:\s*''[^'']*'')', '$&`n  devAuth: false' } ; Set-Content -Path $path -Value $text -Encoding UTF8"

start "Frontend" cmd /k "cd /d "%ROOT%producto\app_AffiniScore\frontend" && npm install --no-audit --no-fund && npm run start -- --no-open --port 4201"

echo Servidores arrancados en ventanas separadas.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:4201
echo Si necesitas detenerlos, cierra las ventanas o mata los procesos.

pause

