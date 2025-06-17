# WordWise AI - Setup Guide

Complete setup guide for the WordWise AI writing assistant with Supabase backend.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))
- An OpenAI API key (for AI features)

### 1. Environment Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables in `.env`:**
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # OpenAI Configuration (for Edge Functions)
   OPENAI_API_KEY=your-openai-api-key-here

   # Application Settings
   VITE_APP_NAME=WordWise AI
   VITE_APP_DESCRIPTION=AI-powered writing assistant for high school students
   VITE_APP_VERSION=1.0.0
   VITE_ANALYTICS_ENABLED=true
   VITE_DEBUG=false
   ```

### 2. Supabase Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Go to Settings → API to get your project URL and anon key

#### Database Setup

1. **Copy the schema:** Open `supabase-schema.sql` in this project
2. **Run in Supabase SQL Editor:** 
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Create a new query
   - Paste the entire schema and run it

#### Authentication Setup

1. **Go to Authentication → Settings**
2. **Configure Auth settings:**
   - Enable email confirmation (recommended)
   - Set up redirect URLs for your domain
   - Configure password requirements

3. **Email templates (optional):**
   - Customize signup/login email templates
   - Add your branding

#### Row Level Security (RLS)

The schema automatically sets up RLS policies. Verify they're active:
- Go to Database → Tables
- Check that RLS is enabled on all tables
- Review policies for each table

### 3. Edge Functions Setup (AI Features)

#### Install Supabase CLI

```bash
npm install -g supabase
```

#### Create Edge Functions

1. **Initialize Supabase locally:**
   ```bash
   supabase init
   ```

2. **Create AI analysis function:**
   ```bash
   supabase functions new analyze-text
   ```

3. **Add the following Edge Functions:**

   **`supabase/functions/analyze-text/index.ts`:**
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
   import OpenAI from 'https://esm.sh/openai@4'

   const openai = new OpenAI({
     apiKey: Deno.env.get('OPENAI_API_KEY')!,
   })

   serve(async (req) => {
     try {
       const { content, writingGoal, documentId } = await req.json()
       
       const completion = await openai.chat.completions.create({
         model: "gpt-4",
         messages: [
           {
             role: "system",
             content: `You are a writing assistant for high school students. Analyze the following text for a ${writingGoal} and provide specific suggestions for improvement in categories: grammar, style, vocabulary, tone, conciseness, and goal alignment.`
           },
           {
             role: "user",
             content: content
           }
         ],
         temperature: 0.3,
       })

       // Process the AI response and return structured data
       const suggestions = [] // Parse AI response into suggestions
       const analysisResults = [] // Parse AI response into analysis results
       
       return new Response(
         JSON.stringify({
           suggestions,
           analysisResults,
           overallScore: 85,
           insights: ["Sample insight from AI analysis"]
         }),
         { headers: { "Content-Type": "application/json" } }
       )
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         { status: 500, headers: { "Content-Type": "application/json" } }
       )
     }
   })
   ```

4. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy analyze-text --project-ref your-project-ref
   ```

5. **Set Edge Function secrets:**
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-api-key --project-ref your-project-ref
   ```

### 4. Real-time Features

The application automatically subscribes to real-time updates for:
- Document changes
- New suggestions
- Analysis results

No additional setup required - handled by the stores.

### 5. Development

```bash
npm run dev
```

Your app will be available at `http://localhost:5173`

### 6. Production Deployment

#### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Add environment variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Other environment variables from your `.env`

3. **Deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

#### Netlify

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy dist folder to Netlify:**
   - Drag and drop `dist` folder to Netlify
   - Or connect your Git repository

3. **Configure environment variables in Netlify dashboard**

## 📊 Architecture Overview

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for responsive design
- **Zustand** for lightweight state management
- **Supabase** for real-time features

### Backend Architecture
- **Supabase PostgreSQL** database
- **Supabase Auth** for user authentication
- **Supabase Real-time** for live updates
- **Edge Functions** for AI processing
- **Row Level Security** for data protection

### Data Models

#### User Profiles
- User preferences and settings
- Writing goals and progress tracking
- Achievement system
- Usage analytics

#### Documents
- Rich text content with metadata
- Version history and collaboration
- Word count and readability metrics
- Status tracking (draft, reviewing, complete)

#### Suggestions
- AI-generated writing improvements
- Type categorization (grammar, style, etc.)
- Confidence scoring
- User feedback collection

#### Analytics
- Usage patterns and engagement metrics
- Suggestion acceptance rates
- Learning progress tracking
- Performance insights

## 🔧 Troubleshooting

### Common Issues

1. **Supabase connection errors:**
   - Verify environment variables are set correctly
   - Check Supabase project is active
   - Ensure RLS policies allow your operations

2. **Authentication issues:**
   - Check redirect URLs in Supabase Auth settings
   - Verify email confirmation settings
   - Test with different browsers/incognito mode

3. **Real-time not working:**
   - Check browser console for WebSocket errors
   - Verify RLS policies allow realtime subscriptions
   - Test network connectivity

4. **Edge Functions failing:**
   - Check function logs in Supabase dashboard
   - Verify OpenAI API key is set correctly
   - Test functions individually in Supabase

### Performance Optimization

1. **Database optimization:**
   - Use indexes for frequently queried fields
   - Implement proper pagination
   - Cache frequently accessed data

2. **Frontend optimization:**
   - Lazy load components
   - Optimize bundle size
   - Use React.memo for expensive components

3. **Real-time optimization:**
   - Limit subscription scope
   - Debounce frequent updates
   - Implement connection pooling

## 🚀 Advanced Features

### Custom AI Models

To use custom AI models instead of OpenAI:

1. Update Edge Functions to call your AI service
2. Modify the `AIService` class fallback methods
3. Update environment variables accordingly

### Multi-language Support

1. Add i18n library (react-i18next)
2. Create language files
3. Update components with translation keys

### Collaboration Features

1. Enable document sharing in database schema
2. Add real-time cursor tracking
3. Implement comment system

### Mobile App

Consider using React Native or Capacitor to create mobile versions:

1. Install Capacitor: `npm install @capacitor/core @capacitor/cli`
2. Add platforms: `npx cap add ios android`
3. Build and sync: `npm run build && npx cap sync`

## 📈 Monitoring & Analytics

### Application Monitoring

1. **Error tracking:** Integrate Sentry or similar
2. **Performance monitoring:** Use Web Vitals
3. **User analytics:** Implement custom events

### Database Monitoring

1. **Query performance:** Monitor slow queries in Supabase
2. **Usage metrics:** Track table sizes and growth
3. **Connection monitoring:** Watch connection pool usage

## 🔐 Security Considerations

1. **Row Level Security:** Always verify RLS policies are correct
2. **API Keys:** Never expose secret keys in frontend code
3. **Input validation:** Sanitize all user inputs
4. **Rate limiting:** Implement for AI function calls
5. **Content filtering:** Add inappropriate content detection

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React + TypeScript Guide](https://react.dev/learn/typescript)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 