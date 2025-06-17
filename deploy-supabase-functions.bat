@echo off
echo 🚀 WordWise Supabase Functions Deployment Guide
echo.
echo ⚠️  IMPORTANT: You'll need to deploy these functions manually first.
echo     Once your Supabase project is set up, you can use the CLI.
echo.
echo 📁 Your functions are located in:
echo     - supabase/functions/analyze-text/
echo     - supabase/functions/grammar-check/
echo     - supabase/functions/tone-analysis/
echo.
echo 🔧 To deploy functions:
echo     1. Install Supabase CLI: https://supabase.com/docs/guides/cli
echo     2. Login: supabase login
echo     3. Link project: supabase link --project-ref YOUR_PROJECT_ID
echo     4. Deploy: supabase functions deploy
echo.
echo 📋 Manual deployment option:
echo     - Go to your Supabase dashboard
echo     - Navigate to Functions (Edge Functions)
echo     - Create new functions and copy the code manually
echo.
pause 