@echo off
echo ===============================================
echo   WordWise AI - OpenAI API Key Setup
echo ===============================================
echo.
echo To test AI features, you need to set your OpenAI API key.
echo.
echo 1. Go to: https://platform.openai.com/api-keys
echo 2. Sign in and create a new secret key
echo 3. Copy the key (starts with sk-)
echo.
set /p OPENAI_KEY="Enter your OpenAI API key: "

if "%OPENAI_KEY%"=="" (
    echo ERROR: No API key provided
    pause
    exit /b 1
)

if not "%OPENAI_KEY:~0,3%"=="sk-" (
    echo WARNING: OpenAI keys usually start with 'sk-'
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

echo.
echo Setting Firebase Functions config...
firebase functions:config:set openai.key="%OPENAI_KEY%"

if %errorlevel% equ 0 (
    echo.
    echo ✅ SUCCESS: OpenAI API key configured!
    echo.
    echo Your key is now safely stored in Firebase Functions.
    echo It will never be exposed to browsers or users.
    echo.
    echo Next steps:
    echo 1. Deploy functions: firebase deploy --only functions
    echo 2. Test AI features: npm run dev
    echo.
) else (
    echo ❌ ERROR: Failed to set API key
    echo Make sure you're logged into Firebase: firebase login
)

pause 