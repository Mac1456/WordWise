-- Simplified Authentication Fix for WordWise (Public Schema Only)
-- Run this in your Supabase SQL Editor

-- 1. Fix the user creation trigger (without touching auth schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, preferences, writing_goals, improvement_tracking)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
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
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix existing users that might be missing profiles
INSERT INTO public.users (id, email, full_name, preferences, writing_goals, improvement_tracking)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
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

-- 4. Ensure proper RLS policies exist
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Ensure documents can be created properly
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Success message
SELECT 'Simplified authentication fix applied! 🎉' as result,
       'User profiles should now be created properly' as status; 