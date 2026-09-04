-- XOA TAT CA USERS
-- Chay trong Supabase SQL Editor

-- Xoa tat ca user trong auth.users
-- Do co ON DELETE CASCADE nen profiles cung se tu dong xoa
DELETE FROM auth.users;

-- Hoac xoa tung user cu the (thay USER_ID bang id that)
-- DELETE FROM auth.users WHERE id = 'USER_ID_O_DAY';

-- Xoa user theo email
-- DELETE FROM auth.users WHERE email = 'owner@hotel.local';
