@echo off
cd /d "%~dp0"
echo Installing dependencies...
C:\Users\nacho\.local\bin\python3.14.exe -m pip install -r requirements_minimal.txt --upgrade
echo.
echo Starting backend server on http://0.0.0.0:8000
echo.
C:\Users\nacho\.local\bin\python3.14.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
