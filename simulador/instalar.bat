@echo off
setlocal
title Instalar - Simulador HCM - Guaxene
cd /d "%~dp0"

echo.
echo  =============================================
echo   Simulador de Comunicacao Resiliente
echo   Instalacao (fazer uma vez, depois de clonar)
echo  =============================================
echo.

:: ---------------------------------------------------------------
:: 1) Verificar Node.js (>= 18.17)
:: ---------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo  [ERRO] Node.js nao encontrado. Instalar a versao LTS de https://nodejs.org
  goto :erro
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>18||(a===18&&b>=17)?0:1)"
if errorlevel 1 (
  echo  [ERRO] Node.js demasiado antigo. E preciso 18.17 ou superior. Versao actual:
  node --version
  goto :erro
)
for /f %%v in ('node --version') do echo  Node.js %%v ... OK

:: ---------------------------------------------------------------
:: 2) Encontrar Python (>= 3.11)
:: ---------------------------------------------------------------
set "PY="
for %%c in ("py -3.12" "py -3.11" "py -3" "python") do (
  if not defined PY (
    %%~c -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>&1 && set "PY=%%~c"
  )
)
if not defined PY (
  echo  [ERRO] Python 3.11 ou superior nao encontrado. Instalar de https://www.python.org
  echo         ^(marcar "Add python.exe to PATH" durante a instalacao^)
  goto :erro
)
for /f "delims=" %%v in ('%PY% --version') do echo  %%v ... OK

:: ---------------------------------------------------------------
:: 3) Backend: ambiente virtual + dependencias
:: ---------------------------------------------------------------
echo.
echo  [1/3] Backend (Python)...
if not exist "backend\venv\Scripts\python.exe" (
  %PY% -m venv backend\venv
  if errorlevel 1 goto :erro
)
backend\venv\Scripts\python -m pip install --upgrade pip --quiet
backend\venv\Scripts\python -m pip install -r backend\requirements.txt --quiet
if errorlevel 1 goto :erro

:: ---------------------------------------------------------------
:: 4) Frontend (Next.js) - o postinstall copia o Cesium para public\cesium
:: ---------------------------------------------------------------
echo.
echo  [2/3] Frontend (Node.js) - pode demorar alguns minutos...
pushd frontend
call npm ci --no-audit --no-fund || call npm install --no-audit --no-fund
if errorlevel 1 ( popd & goto :erro )
popd

:: ---------------------------------------------------------------
:: 5) Raiz (concurrently, para arrancar tudo com um comando)
:: ---------------------------------------------------------------
echo.
echo  [3/3] Scripts de arranque...
call npm ci --no-audit --no-fund || call npm install --no-audit --no-fund
if errorlevel 1 goto :erro

:: ---------------------------------------------------------------
:: Verificacao: testes do backend
:: ---------------------------------------------------------------
echo.
echo  A verificar com os testes do backend...
pushd backend
venv\Scripts\python -m pytest tests -q
if errorlevel 1 ( popd & goto :erro )
popd

echo.
echo  =============================================
echo   Instalacao concluida.
echo.
echo   Apresentacao / defesa:  iniciar_apresentacao.bat
echo   Desenvolvimento:        iniciar.bat   (ou: npm run dev)
echo  =============================================
echo.
pause
exit /b 0

:erro
echo.
echo  A instalacao falhou. Ver a mensagem acima.
pause
exit /b 1
