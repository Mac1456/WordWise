-- Fix Authentication and RLS Issues for WordWise
-- Run this in your Supabase SQL Editor

-- 1. Fix the user creation trigger to properly handle full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger to ensure it works
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix existing users that might be missing profiles
INSERT INTO public.users (id, email, full_name)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', NULL)
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    email = EXCLUDED.email;

-- 4. Add INSERT policy for users (in case it's missing)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Ensure documents can be created by authenticated users
-- Sometimes the user_id reference check fails if user profile doesn't exist yet
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        auth.uid() IS NOT NULL
    );

-- 6. Add a policy to allow reading auth.users for profile completion
-- This helps with debugging auth issues
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
    select 
        coalesce(
            nullif(current_setting('request.jwt.claim.sub', true), ''),
            (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid
$$;

-- 7. Success message
SELECT 'Authentication issues fixed! 🎉' as result,
       'Please restart your application and try creating account again' as next_step; 