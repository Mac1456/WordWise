@echo off
echo ===============================================
echo   WordWise AI - Secure Deployment Script
echo ===============================================
echo.

echo [1/4] Checking Firebase CLI...
firebase --version
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not installed or not in PATH
    echo Please install: npm install -g firebase-tools
    exit /b 1
)

echo [2/4] Checking Firebase login status...
firebase auth:whoami
if %errorlevel% neq 0 (
    echo ERROR: Not logged in to Firebase
    echo Please run: firebase login
    exit /b 1
)

echo [3/4] Building and deploying Firebase Functions...
cd functions
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build functions
    exit /b 1
)
cd ..

echo [4/4] Deploying to Firebase (Functions + Hosting)...
firebase deploy --only functions,hosting
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    exit /b 1
)

echo.
echo ===============================================
echo   ✅ SECURE DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ===============================================
echo.
echo Your OpenAI API key is safely stored in Firebase Functions
echo and is never exposed to the browser or client-side code.
echo.
echo Next steps:
echo 1. Test AI features at your deployed URL
echo 2. Monitor function usage in Firebase Console
echo 3. Check logs: firebase functions:log
echo.
pause 