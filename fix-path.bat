@echo off
echo === Fixing Node.js PATH Issue ===
echo.

echo This will add Node.js to your system PATH permanently.
echo After running this, you can use 'npm' from any location.
echo.
echo Press Ctrl+C to cancel, or any other key to continue...
pause >nul

echo.
echo Adding C:\Program Files\nodejs to PATH...

REM Add to system PATH (requires admin privileges)
setx PATH "%PATH%;C:\Program Files\nodejs" /M 2>nul
if %errorlevel% equ 0 (
    echo ✓ Successfully added to system PATH (admin mode)
    echo Please restart your PowerShell/Command Prompt
) else (
    echo Admin privileges not available, adding to user PATH instead...
    setx PATH "%PATH%;C:\Program Files\nodejs"
    if %errorlevel% equ 0 (
        echo ✓ Successfully added to user PATH
        echo Please restart your PowerShell/Command Prompt
    ) else (
        echo ✗ Failed to update PATH
        echo You may need to add it manually through System Properties
    )
)

echo.
echo After restarting PowerShell, you should be able to use:
echo   npm --version
echo   npm run dev
echo.
pause 