@echo off
echo === WordWise Development Server Diagnostics ===
echo.

echo 1. Checking if Node.js is installed in standard location...
if exist "C:\Program Files\nodejs\node.exe" (
    echo ✓ Found Node.js at: C:\Program Files\nodejs\
) else (
    echo ✗ Node.js NOT found at: C:\Program Files\nodejs\
)

echo.
echo 2. Checking alternative Node.js locations...
if exist "C:\Program Files (x86)\nodejs\node.exe" (
    echo ✓ Found Node.js at: C:\Program Files (x86)\nodejs\
)
if exist "%APPDATA%\npm\node.exe" (
    echo ✓ Found Node.js at: %APPDATA%\npm\
)
if exist "%USERPROFILE%\AppData\Roaming\npm\node.exe" (
    echo ✓ Found Node.js at: %USERPROFILE%\AppData\Roaming\npm\
)

echo.
echo 3. Checking current PATH...
echo Current PATH includes:
echo %PATH%

echo.
echo 4. Searching for node.exe anywhere on system...
where node 2>nul
if %errorlevel% neq 0 (
    echo ✗ node.exe not found in PATH
) else (
    echo ✓ node.exe found in PATH
)

echo.
echo 5. Searching for npm.cmd anywhere on system...
where npm 2>nul
if %errorlevel% neq 0 (
    echo ✗ npm.cmd not found in PATH
) else (
    echo ✓ npm.cmd found in PATH
)

echo.
echo 6. Checking if Node.js installer is needed...
echo If no Node.js found above, download from: https://nodejs.org/
echo Choose the LTS version (recommended)

echo.
echo Press any key to continue...
pause >nul 