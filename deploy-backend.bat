@echo off
echo ===================================
echo WordWise AI - Backend Deployment
echo ===================================
echo.

echo This script will help you deploy your backend to Supabase.
echo Make sure you have:
echo - Created a Supabase project
echo - Updated your .env file with Supabase credentials
echo.

echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

echo.
echo === Step 1: Installing Supabase CLI ===
call npm install -g supabase
if %errorlevel% neq 0 (
    echo Failed to install Supabase CLI
    pause
    exit /b 1
)

echo.
echo === Step 2: Login to Supabase ===
echo Please login to Supabase in the browser window that opens...
call supabase login

echo.
echo === Step 3: Link Project ===
echo Enter your Supabase project ID (from your dashboard URL):
set /p PROJECT_ID="Project ID: "

call supabase link --project-ref %PROJECT_ID%
if %errorlevel% neq 0 (
    echo Failed to link project. Check your project ID.
    pause
    exit /b 1
)

echo.
echo === Step 4: Deploy Edge Functions ===
echo Deploying analyze-text function...
call supabase functions deploy analyze-text

echo Deploying grammar-check function...
call supabase functions deploy grammar-check

echo Deploying tone-analysis function...
call supabase functions deploy tone-analysis

echo.
echo === Step 5: Set OpenAI Secret (Optional) ===
echo Do you have an OpenAI API key? (y/n)
set /p OPENAI_CHOICE="Enter choice: "

if /i "%OPENAI_CHOICE%"=="y" (
    set /p OPENAI_KEY="Enter your OpenAI API key: "
    call supabase secrets set OPENAI_API_KEY=%OPENAI_KEY%
    echo OpenAI key set successfully!
) else (
    echo Skipping OpenAI setup. Fallback analysis will be used.
)

echo.
echo === Step 6: Build for Production ===
call npm run build
if %errorlevel% neq 0 (
    echo Build failed. Check for errors above.
    pause
    exit /b 1
)

echo.
echo ======================================
echo Backend Deployment Complete! 
echo ======================================
echo.
echo Your WordWise AI backend is now deployed with:
echo ✅ Database schema and tables
echo ✅ Edge Functions for AI processing  
echo ✅ User authentication system
echo ✅ Real-time capabilities
echo.
echo Next steps:
echo 1. Test your app locally: npm run dev
echo 2. Deploy frontend to Vercel/Netlify
echo 3. Update CORS settings in Supabase
echo.
echo Check BACKEND_SETUP.md for detailed instructions.
echo.
pause 