-- KIEM TRA DATABASE
-- Chay de xem co gi sai

-- 1. Kiem tra bang profiles co ton tai khong
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Kiem tra RLS co bat khong
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. Kiem tra policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. Kiem tra co user nao trong auth.users khong
SELECT id, email, phone, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Kiem tra co profile nao khong
SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
