@echo off
title Simulador HCM - Guaxene (apresentacao)
cd /d "%~dp0"

echo.
echo  =============================================
echo   Simulador de Comunicacao Resiliente
echo   Modo de APRESENTACAO (producao, mais leve)
echo  =============================================
echo.

:: Verificar se a instalacao ja foi feita (instalar.bat)
if not exist "%~dp0backend\venv\Scripts\python.exe" goto :falta_instalar
if not exist "%~dp0frontend\node_modules" goto :falta_instalar

:: 1) Compilar o frontend (optimizado e minificado)
echo  [1/2] A compilar o frontend...
call npm run build
if errorlevel 1 (
  echo.
  echo  Erro na compilacao do frontend.
  pause
  exit /b 1
)

:: 2) Abrir o browser daqui a alguns segundos e arrancar backend + frontend
echo  [2/2] A iniciar backend (8000) e frontend (3000)...
start "" cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000/apresentacao"
call npm run start

goto :eof

:falta_instalar
echo.
echo  O simulador ainda nao esta instalado neste computador.
echo  Fazer duplo clique em instalar.bat e depois voltar a abrir este ficheiro.
echo.
pause
exit /b 1
