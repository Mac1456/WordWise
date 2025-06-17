Write-Host "=== Starting WordWise Development Server ===" -ForegroundColor Green
Write-Host ""

# Add Node.js to PATH for this session
$env:PATH += ";C:\Program Files\nodejs"

# Check if Node.js is accessible
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
    Write-Host "Starting development server..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start the development server
    npm run dev
} catch {
    Write-Host "Node.js not found via PATH. Trying direct path..." -ForegroundColor Yellow
    try {
        & "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
    } catch {
        Write-Host "Error: Could not start the development server." -ForegroundColor Red
        Write-Host "Please make sure Node.js is installed at C:\Program Files\nodejs\" -ForegroundColor Red
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "If the server started successfully, open: http://localhost:5173" -ForegroundColor Cyan
Write-Host "" 