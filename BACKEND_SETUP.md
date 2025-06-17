# 🚀 WordWise AI - Complete Backend Integration Guide

This guide will help you set up the complete backend infrastructure for WordWise AI with Supabase and Edge Functions.

## 📋 **Prerequisites**

- **Supabase Account**: [Sign up at supabase.com](https://supabase.com)
- **OpenAI Account** (Optional): [Get API key at platform.openai.com](https://platform.openai.com)
- **Git**: For deployment
- **Node.js**: Already installed for your project

## 🎯 **Step 1: Create Supabase Project**

### 1.1 Create New Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose your organization
4. **Project Settings:**
   - **Name**: `wordwise-ai`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development
5. Click **"Create new project"** (takes ~2 minutes)

### 1.2 Get Project Configuration
Once your project is ready:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiI...`

## 🗄️ **Step 2: Set Up Database Schema**

### 2.1 Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from `supabase-schema.sql` in your project
4. Paste it into the SQL editor
5. Click **"Run"** 

This creates:
- ✅ **5 main tables** (users, documents, suggestions, analysis_results, analytics)
- ✅ **Row Level Security** policies for data protection
- ✅ **Automatic triggers** for timestamps and word counting
- ✅ **Database functions** for analytics and processing

### 2.2 Verify Tables Created
Go to **Database** → **Tables** and confirm you see:
- `users`
- `documents` 
- `suggestions`
- `analysis_results`
- `analytics`

## ⚡ **Step 3: Deploy Edge Functions**

### 3.1 Install Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

### 3.2 Link Your Project
```bash
# In your WordWise project directory
supabase link --project-ref your-project-id

# Initialize Supabase in your project
supabase init
```

### 3.3 Deploy Edge Functions
We've created 3 Edge Functions for you:

```bash
# Deploy all Edge Functions
supabase functions deploy analyze-text
supabase functions deploy grammar-check  
supabase functions deploy tone-analysis
```

### 3.4 Set Edge Function Secrets
```bash
# Set OpenAI API key (optional)
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here

# Verify secrets are set
supabase secrets list
```

## 🔧 **Step 4: Configure Environment Variables**

### 4.1 Create Local Environment File
```bash
# Copy the example file
cp env.example .env

# Edit .env with your values
```

### 4.2 Update .env File
```env
# Your Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-dashboard

# Optional: OpenAI for advanced AI
OPENAI_API_KEY=sk-your-openai-key-here
```

## 🚀 **Step 5: Test Backend Integration**

### 5.1 Start Development Server
```bash
# Make sure npm is working (or use start-server.bat)
npm run dev
```

### 5.2 Test User Registration
1. Go to http://localhost:5173
2. Click **"Get Started"**
3. Create a new account
4. **Expected**: Real user created in Supabase (not development mode)

### 5.3 Test Document Creation
1. Create a new document in the dashboard
2. Go to Supabase dashboard → **Database** → **Tables** → `documents`
3. **Expected**: See your document in the database

### 5.4 Test AI Analysis
1. Open a document in the editor
2. Write some text
3. Click **"Analyze All"** or any specific analysis button
4. **Expected**: See real AI suggestions (not fallback mode)

## 🌐 **Step 6: Deploy to Production**

### 6.1 Deploy Frontend (Vercel - Recommended)

**Via GitHub:**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **"New Project"**
4. Import your GitHub repository
5. **Add Environment Variables:**
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
6. Click **"Deploy"**

**Or via CLI:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 6.2 Alternative: Deploy to Netlify
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click **"New site from Git"**
4. Connect GitHub repository
5. **Build Settings:**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. **Environment Variables:**
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 6.3 Update CORS Settings
In Supabase dashboard:
1. Go to **Authentication** → **Settings**
2. Add your production domain to **Site URL**
3. Add to **Redirect URLs**:
   ```
   https://your-domain.com/**
   ```

## 🔒 **Step 7: Security Configuration**

### 7.1 Row Level Security (RLS)
✅ **Already configured** in the schema! Each user can only access their own:
- Documents
- Suggestions  
- Analysis results
- Analytics

### 7.2 API Key Security
- ✅ **Anon key** is safe to expose (limited permissions)
- ✅ **Service role key** is never used in frontend
- ✅ **OpenAI key** is stored securely in Edge Functions

## 📊 **Step 8: Monitor & Analytics**

### 8.1 Supabase Analytics
- **Database**: Monitor usage in Supabase dashboard
- **Auth**: Track user signups and activity
- **Edge Functions**: Monitor function performance

### 8.2 Application Analytics
All user interactions are automatically logged to the `analytics` table:
- Document creation/editing
- AI analysis requests
- Suggestion acceptance/dismissal
- User preferences changes

## 🔧 **Troubleshooting**

### Common Issues:

**1. "Failed to fetch" errors**
- ✅ Check environment variables are set correctly
- ✅ Verify Supabase URL and key in dashboard
- ✅ Check browser network tab for CORS errors

**2. Database permission errors**
- ✅ Ensure RLS policies were created (run schema again)
- ✅ Check user is properly authenticated

**3. Edge Functions not working**
- ✅ Verify functions were deployed: `supabase functions list`
- ✅ Check function logs: `supabase functions logs`
- ✅ Ensure secrets are set: `supabase secrets list`

**4. OpenAI integration issues**
- ✅ Verify API key is correct and has credits
- ✅ Check Edge Function logs for API errors
- ✅ Fallback analysis will work without OpenAI

## ✅ **Success Checklist**

- [ ] Supabase project created
- [ ] Database schema deployed (5 tables visible)
- [ ] Edge Functions deployed (3 functions)
- [ ] Environment variables configured
- [ ] Local testing successful
- [ ] Frontend deployed to production
- [ ] User registration working
- [ ] Document creation working
- [ ] AI analysis functional
- [ ] Real-time updates working

## 🎉 **You're Done!**

Your WordWise AI application now has:
- ✅ **Full backend integration** with Supabase
- ✅ **Real user authentication** and data persistence
- ✅ **AI-powered analysis** with OpenAI integration
- ✅ **Real-time capabilities** for collaborative features
- ✅ **Production-ready deployment** with proper security
- ✅ **Analytics and monitoring** for user insights

Your application is now ready for real users and can handle production workloads!

## 📞 **Support**

If you need help:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review Edge Function logs in Supabase dashboard
3. Test in development mode first (comment out VITE_SUPABASE_URL)
4. Verify all environment variables are set correctly 