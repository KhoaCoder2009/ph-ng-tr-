-- INSERT TAI KHOAN OWNER (FULLY CONFIRMED)
-- Chay SAU KHI chay migration.sql thanh cong

DO $$
DECLARE
    owner_user_id UUID;
BEGIN
    -- Tao UUID cho user
    owner_user_id := gen_random_uuid();

    -- Insert vao auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        phone,
        phone_confirmed_at,
        confirmation_sent_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        last_sign_in_at,
        role,
        aud,
        is_super_admin
    ) VALUES (
        owner_user_id,
        '00000000-0000-0000-0000-000000000000',
        'owner@hotel.local',
        crypt('123456', gen_salt('bf')),
        NOW(),  -- email da duoc confirm
        '',     -- khong can token vi da confirm
        '0989465302',
        NOW(),  -- phone da duoc confirm
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Chủ Trọ","phone":"0989465302","role":"owner"}',
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        false
    );

    -- Insert vao auth.identities (QUAN TRONG!)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        owner_user_id,
        jsonb_build_object(
            'sub', owner_user_id::text,
            'email', 'owner@hotel.local',
            'email_verified', true,
            'phone_verified', true
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
    );

    -- Trigger handle_new_user() se tu dong tao profile
    -- Nhung de dam bao, ta check va insert neu chua co
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_user_id) THEN
        INSERT INTO public.profiles (id, full_name, phone, role)
        VALUES (owner_user_id, 'Chủ Trọ', '0989465302', 'owner');
    END IF;

    RAISE NOTICE 'Created owner account: owner@hotel.local / 123456 (CONFIRMED)';
END;
$$;
