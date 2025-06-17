@echo off
echo === WordWise Development Server (Direct Method) ===
echo.

REM Try different possible Node.js installation paths
set "NODEJS_PATHS=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%APPDATA%\npm;%USERPROFILE%\AppData\Roaming\npm"

echo Searching for Node.js installation...

for %%p in (%NODEJS_PATHS%) do (
    if exist "%%p\npm.cmd" (
        echo Found npm at: %%p
        echo Starting development server...
        echo.
        cd /d "%~dp0"
        "%%p\npm.cmd" run dev
        goto :found
    )
    if exist "%%p\npm" (
        echo Found npm at: %%p
        echo Starting development server...
        echo.
        cd /d "%~dp0"
        "%%p\npm" run dev
        goto :found
    )
)

echo.
echo ✗ Could not find npm in any standard location.
echo.
echo Please install Node.js:
echo 1. Go to: https://nodejs.org/
echo 2. Download the LTS version
echo 3. Run the installer
echo 4. Restart your computer
echo 5. Try this script again
echo.
goto :end

:found
echo.
echo Server should be running. Open: http://localhost:5173
echo.

:end
pause 