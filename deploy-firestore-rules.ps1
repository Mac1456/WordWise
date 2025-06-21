Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   WordWise - Deploy Firestore Rules" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Firebase CLI not found"
    }
    Write-Host "✓ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    Write-Host "Then run: firebase login" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Checking authentication..." -ForegroundColor Yellow
try {
    $projects = firebase projects:list 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not authenticated"
    }
    Write-Host "✓ Authentication verified" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Not logged in to Firebase!" -ForegroundColor Red
    Write-Host "Please run: firebase login" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Deploying Firestore rules..." -ForegroundColor Yellow
try {
    firebase deploy --only firestore:rules
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host "✓ Firestore rules deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to deploy Firestore rules!" -ForegroundColor Red
    Write-Host "Please check your firebase.json and firestore.rules files." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Deploying Firestore indexes..." -ForegroundColor Yellow
try {
    firebase deploy --only firestore:indexes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Failed to deploy Firestore indexes!" -ForegroundColor Yellow
        Write-Host "This is usually not critical for basic functionality." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Firestore indexes deployed successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Failed to deploy Firestore indexes!" -ForegroundColor Yellow
    Write-Host "This is usually not critical for basic functionality." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Firestore Rules Deployed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your WordWise app should now have proper" -ForegroundColor White
Write-Host "database security rules in place." -ForegroundColor White
Write-Host ""
Write-Host "Users will now need to be properly authenticated" -ForegroundColor White
Write-Host "to create, read, update, or delete documents." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue" 