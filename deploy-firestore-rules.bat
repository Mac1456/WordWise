@echo off
echo ========================================
echo    WordWise - Deploy Firestore Rules
echo ========================================
echo.

echo Checking Firebase CLI...
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found!
    echo Please install it with: npm install -g firebase-tools
    echo Then run: firebase login
    pause
    exit /b 1
)

echo.
echo Checking authentication...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged in to Firebase!
    echo Please run: firebase login
    pause
    exit /b 1
)

echo.
echo Deploying Firestore rules...
firebase deploy --only firestore:rules
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to deploy Firestore rules!
    echo Please check your firebase.json and firestore.rules files.
    pause
    exit /b 1
)

echo.
echo Deploying Firestore indexes...
firebase deploy --only firestore:indexes
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Failed to deploy Firestore indexes!
    echo This is usually not critical for basic functionality.
)

echo.
echo ========================================
echo   Firestore Rules Deployed Successfully!
echo ========================================
echo.
echo Your WordWise app should now have proper
echo database security rules in place.
echo.
pause 