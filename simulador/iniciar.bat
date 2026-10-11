@echo off
title Simulador HCM - Guaxene

echo.
echo  =============================================
echo   Simulador de Comunicacao Resiliente
echo   HCM Guaxene - 5,8 GHz - 3,69 km
echo  =============================================
echo.

:: Verificar se a instalacao ja foi feita (instalar.bat)
if not exist "%~dp0backend\venv\Scripts\python.exe" goto :falta_instalar
if not exist "%~dp0frontend\node_modules" goto :falta_instalar

:: Backend
echo  [1/2] A iniciar Backend (porta 8000)...
start "Backend - FastAPI :8000" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python -m uvicorn app.main:app --reload && pause"

:: Aguardar 3 segundos para o backend arrancar
timeout /t 3 /nobreak >nul

:: Frontend
echo  [2/2] A iniciar Frontend (porta 3000)...
start "Frontend - Next.js :3000" cmd /k "cd /d "%~dp0frontend" && npm run dev && pause"

echo.
echo  Aguardar alguns segundos e abrir:
echo  http://localhost:3000
echo.
timeout /t 8 /nobreak >nul

:: Abrir browser automaticamente
start "" "http://localhost:3000"

goto :eof

:falta_instalar
echo.
echo  O simulador ainda nao esta instalado neste computador.
echo  Fazer duplo clique em instalar.bat e depois voltar a abrir este ficheiro.
echo.
pause
exit /b 1
