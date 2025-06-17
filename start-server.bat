@echo off
echo === Starting WordWise Development Server ===
echo.

REM Add Node.js to PATH for this session
set PATH=%PATH%;C:\Program Files\nodejs

REM Check if Node.js is accessible
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found in PATH. Using full path...
    "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
) else (
    echo Node.js found! Starting server...
    npm run dev
)

echo.
echo If the server started successfully, open: http://localhost:5173
echo.
pause 