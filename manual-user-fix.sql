-- Manual User Profile Fix
-- Run this AFTER disabling email confirmation

-- 1. Check what users exist
SELECT 'Current auth users:' as info;
SELECT id, email, email_confirmed_at, raw_user_meta_data 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check what user profiles exist  
SELECT 'Current user profiles:' as info;
SELECT id, email, full_name 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Create missing profiles for confirmed users
INSERT INTO public.users (id, email, full_name, preferences, writing_goals, improvement_tracking)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
    '{
        "theme": "light",
        "notifications": true,
        "autoSave": true,
        "suggestionFrequency": "medium"
    }'::jsonb,
    ARRAY['personal-statement'],
    '{
        "grammarScore": 0,
        "styleScore": 0,
        "vocabularyScore": 0,
        "overallProgress": 0,
        "weeklyGoals": [],
        "achievements": []
    }'::jsonb
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    email = EXCLUDED.email,
    updated_at = NOW();

-- 4. Verify the fix
SELECT 'After fix - user profiles:' as info;
SELECT u.id, u.email, u.full_name, au.email_confirmed_at
FROM public.users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC; 