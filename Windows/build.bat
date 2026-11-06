@echo off
setlocal
cd /d "%~dp0\.."
py -m pip install -r Windows\requirements.txt
if errorlevel 1 exit /b 1
py -m PyInstaller --noconfirm --clean --onefile --windowed --name StudyPilot --add-data "index.html;web" --add-data "styles.css;web" --add-data "app.js;web" --add-data "manifest.webmanifest;web" --add-data "service-worker.js;web" --add-data "assets;web/assets" --add-data "core;web/core" --add-data "storage;web/storage" --add-data "security;web/security" --add-data "privacy.html;web" --add-data "terms.html;web" Windows\launcher.py
if errorlevel 1 exit /b 1
echo.
echo Build complete: dist\StudyPilot.exe
endlocal
