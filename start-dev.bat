@echo off
echo Starting WordWise Development Server...
echo.

REM Add Node.js to PATH for this session
set "PATH=C:\Program Files\nodejs;%PATH%"

REM Check if npm is now available
echo Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm still not found. Please check Node.js installation.
    echo Try installing Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Starting development server...
echo Open your browser to: http://localhost:5173
echo.

npm run dev

pause 