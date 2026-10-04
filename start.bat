@echo off
echo ==============================================
echo       Starting ResumeLens Dev Server
echo ==============================================
echo.

echo Checking for node_modules...
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies found.
)

echo.
echo Starting Vite dev server...
npm run dev

pause
