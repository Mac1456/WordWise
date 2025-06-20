@echo off
echo ===============================================
echo   WordWise AI - Feature Testing
echo ===============================================
echo.

echo [1/5] Checking Firebase Functions config...
firebase functions:config:get | findstr "openai" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: OpenAI API key not configured
    echo Run: .\setup-openai-key.bat
    pause
    exit /b 1
)

firebase functions:config:get | findstr "YOUR_ACTUAL_OPENAI_API_KEY_HERE" >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ ERROR: Placeholder API key detected
    echo Run: .\setup-openai-key.bat
    pause
    exit /b 1
)

echo ✅ OpenAI API key configured

echo.
echo [2/5] Building Firebase Functions...
cd functions
call npm run build
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to build functions
    pause
    exit /b 1
)
cd ..
echo ✅ Functions built successfully

echo.
echo [3/5] Deploying Firebase Functions...
firebase deploy --only functions
if %errorlevel% neq 0 (
    echo ❌ ERROR: Failed to deploy functions
    echo You can still test locally with emulators
    set /p CONTINUE="Continue with local testing? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

echo.
echo [4/5] Starting application...
echo.
echo The application will start in a new window.
echo Once it loads:
echo.
echo 📝 TO TEST AI FEATURES:
echo 1. Sign up or log in to the app
echo 2. Create a new document
echo 3. Type some text with grammar errors like:
echo    "This are a test sentence with mistake."
echo 4. Watch for AI suggestions to appear
echo 5. Click on highlighted text to see suggestions
echo 6. Use the tone analysis feature
echo.
echo Press any key to start the app...
pause >nul

start cmd /c "npm run dev"

echo.
echo [5/5] Checking Function Logs...
echo.
echo While you test the app, I'll monitor the function logs.
echo Look for AI analysis calls and any errors.
echo.
timeout /t 10 /nobreak >nul

firebase functions:log --limit 20

echo.
echo ===============================================
echo   🎉 AI TESTING SETUP COMPLETE!
echo ===============================================
echo.
echo Your app is now running with AI features.
echo Test the features and check this window for logs.
echo.
echo 🔍 If AI features don't work:
echo   1. Check Firebase Functions logs above
echo   2. Verify your OpenAI API key has credits
echo   3. Check browser console for errors
echo.
pause 