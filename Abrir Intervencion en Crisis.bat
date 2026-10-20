@echo off
rem Arranca el servidor escondido (sin ventana negra) y abre el programa en el navegador.
cd /d "%~dp0"
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'servidor.mjs','.','8085' -WorkingDirectory '%~dp0.' -WindowStyle Hidden"
ping -n 2 127.0.0.1 >nul
start "" http://localhost:8085
