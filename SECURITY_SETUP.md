# 🔒 Security Setup Guide - Securing Your OpenAI API Key

## ⚠️ CRITICAL SECURITY ISSUE

Your current setup has your OpenAI API key **exposed to the browser**. Anyone can view your website's source code and steal your API key, leading to:
- Unlimited usage charges on your OpenAI account
- Potential account suspension
- Security breach

## 🛡️ SECURE SOLUTIONS

### Option 1: Serverless Functions (RECOMMENDED)

This is the most secure approach - your API key stays on the server.

#### Step 1: Update Environment Variables

**REMOVE** the current `.env` file content and replace with:

```env
# ❌ REMOVE this line (it exposes the key to the browser):
# VITE_OPENAI_API_KEY=your-api-key-here

# ✅ ADD this for serverless functions (server-side only):
OPENAI_API_KEY=your-openai-api-key-here
```

#### Step 2: Deploy Serverless Function

**For Vercel (Recommended):**

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in your project directory
3. Add environment variable in Vercel dashboard:
   - Go to your project settings
   - Add `OPENAI_API_KEY` with your actual key
4. The `api/analyze-text.js` file will be deployed automatically

**For Netlify:**

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Create `netlify/functions/analyze-text.js` (move from `api/`)
3. Deploy with: `netlify deploy --prod`
4. Add environment variable in Netlify dashboard

#### Step 3: Update Your Frontend Service

Replace the `openaiService` import in `textAnalysisService.ts`:

```typescript
// Replace this:
import { openaiService } from './openaiService';

// With this:
import { secureAIService } from './secureAIService';

// Then update the calls:
const aiAnalysis = await secureAIService.analyzeGrammarAndClarity(text);
const aiToneAnalysis = await secureAIService.analyzeTone(text);
```

### Option 2: API Key Restrictions (Temporary Security)

If you must keep the current setup temporarily:

1. **Restrict your API key** in OpenAI dashboard:
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Edit your key
   - Add website restrictions (allow only your domain)
   - Set usage limits

2. **Set spending limits**:
   - Go to [Usage Limits](https://platform.openai.com/account/limits)
   - Set a low monthly limit (e.g., $10)

**⚠️ This is NOT fully secure** - your key is still visible in the browser.

### Option 3: Development-Only Setup

For development and testing only:

```env
# Development only - DO NOT deploy with this
VITE_OPENAI_API_KEY=your-api-key-here
VITE_ENV=development
```

Add this check in your code:

```typescript
// In openaiService.ts
private isConfigured(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasViteKey = !!import.meta.env.VITE_OPENAI_API_KEY;
  
  if (isProduction && hasViteKey) {
    console.error('🚨 SECURITY RISK: OpenAI key exposed in production!');
    return false;
  }
  
  return hasViteKey && import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here';
}
```

## 🔒 Additional Security Measures

### 1. Rate Limiting

Add rate limiting to your serverless function:

```javascript
// In your serverless function
const rateLimiter = new Map();

export default async function handler(req, res) {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  if (rateLimiter.has(clientIp)) {
    const requests = rateLimiter.get(clientIp);
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    recentRequests.push(now);
    rateLimiter.set(clientIp, recentRequests);
  } else {
    rateLimiter.set(clientIp, [now]);
  }

  // ... rest of your function
}
```

### 2. Input Validation

```javascript
// Validate input in serverless function
if (!text || typeof text !== 'string') {
  return res.status(400).json({ error: 'Invalid text input' });
}

if (text.length > 5000) {
  return res.status(400).json({ error: 'Text too long' });
}

// Sanitize input
const sanitizedText = text.replace(/[<>]/g, '');
```

### 3. Authentication (Optional)

For production apps, consider adding user authentication:

```javascript
// In serverless function
const authenticateUser = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Validate JWT token or API key here
  return isValidToken(token);
};

export default async function handler(req, res) {
  if (!authenticateUser(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ... rest of function
}
```

## 🚀 Deployment Checklist

- [ ] Remove `VITE_OPENAI_API_KEY` from `.env`
- [ ] Add `OPENAI_API_KEY` to serverless platform (Vercel/Netlify)
- [ ] Deploy serverless function
- [ ] Update frontend to use secure service
- [ ] Test that API key is not visible in browser
- [ ] Set OpenAI usage limits
- [ ] Add rate limiting
- [ ] Test error handling

## 🧪 Testing Security

### 1. Check if API key is exposed:

```bash
# Build your app
npm run build

# Search for your API key in the build output
grep -r "sk-" dist/
```

If this returns any results, your key is exposed!

### 2. Browser Network Tab Test:

1. Open browser dev tools
2. Go to Network tab
3. Use your app's AI features
4. Check that requests go to your serverless function, not directly to OpenAI

### 3. Source Code Test:

1. View page source in browser
2. Search for "sk-" or "openai"
3. Your API key should NOT appear anywhere

## 🆘 If Your Key Was Exposed

1. **Immediately revoke** the exposed key in OpenAI dashboard
2. **Create a new key**
3. **Check your usage** for unauthorized charges
4. **Implement secure solution** before redeploying

## 📞 Need Help?

If you need help implementing this, consider:
- Using the provided serverless function template
- Starting with Vercel (easiest deployment)
- Testing locally first with a development API key
- Setting low usage limits while testing

Remember: **Security first, features second!** 🛡️ 