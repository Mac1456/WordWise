# 🚀 WordWise Supabase Setup Checklist

## ✅ **Step-by-Step Integration Guide**

### **1. Create Supabase Project**
- [ ] Go to [https://app.supabase.com](https://app.supabase.com)
- [ ] Sign up/login
- [ ] Create new project named "wordwise-ai"
- [ ] Choose region and set database password
- [ ] Wait for project setup completion (2-3 minutes)

### **2. Get Project Credentials**
- [ ] Go to Settings → API in dashboard
- [ ] Copy Project URL (https://your-id.supabase.co)
- [ ] Copy anon public key (long string)

### **3. Configure Environment**
- [ ] Open `.env` file (already created)
- [ ] Replace `VITE_SUPABASE_URL` with your project URL
- [ ] Replace `VITE_SUPABASE_ANON_KEY` with your anon key
- [ ] Save the file

### **4. Set Up Database Schema**
- [ ] Go to Supabase dashboard → SQL Editor
- [ ] Click "New query"
- [ ] Copy contents of `supabase-schema.sql` (already copied to clipboard)
- [ ] Paste into SQL editor
- [ ] Click "Run" and verify success

### **5. Test Basic Connection**
- [ ] Your dev server should be running at http://localhost:5173
- [ ] Try creating an account - it should work with real auth now!
- [ ] Check if documents save to database (not just localStorage)

### **6. Deploy Functions (Optional - Advanced)**
- [ ] Install Supabase CLI later: `npm install -g @supabase/supabase-js`
- [ ] Or manually create functions in dashboard
- [ ] Functions to deploy:
  - `analyze-text` - Main AI analysis
  - `grammar-check` - Grammar checking
  - `tone-analysis` - Tone analysis

## 🎯 **Quick Test Checklist**

After completing steps 1-5:

- [ ] Can create account with real email
- [ ] Can create documents 
- [ ] Documents persist after refresh
- [ ] No more "Development Mode" warnings
- [ ] Check Network tab - should see Supabase API calls

## 🆘 **Troubleshooting**

### **Connection Issues:**
- Verify `.env` file has correct URL and key
- Restart dev server after changing `.env`
- Check Supabase dashboard for project status

### **Database Issues:**
- Re-run the SQL schema if tables missing
- Check RLS policies are enabled
- Verify user authentication is working

### **Auth Issues:**
- Confirm email confirmation is disabled for testing
- Check authentication settings in Supabase dashboard

## 📞 **Need Help?**

- Supabase Documentation: https://supabase.com/docs
- Your schema file: `supabase-schema.sql`
- Your functions: `supabase/functions/` directory

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ No development mode warnings
- ✅ Real authentication with email/password
- ✅ Documents saved to cloud database
- ✅ Network requests to your Supabase URL
- ✅ Ability to access documents from different browsers 