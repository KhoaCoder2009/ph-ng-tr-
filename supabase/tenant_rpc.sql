-- Deploy this file after the existing schema is present.
-- It creates the RPCs used by src/services/tenantService.ts.

CREATE OR REPLACE FUNCTION public.create_tenant_account(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_room_id UUID,
    p_deposit DECIMAL,
    p_start_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    new_tenant_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Chỉ chủ trọ mới có thể tạo tài khoản người thuê';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.rooms
        WHERE id = p_room_id AND owner_id = auth.uid() AND status = 'vacant'
    ) THEN
        RAISE EXCEPTION 'Phòng không tồn tại hoặc không còn trống';
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email đăng nhập đã tồn tại';
    END IF;

    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, phone_change, phone_change_token,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        role, aud, is_super_admin
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        extensions.crypt(p_password, extensions.gen_salt('bf')),
        NOW(),
        '', '', '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', p_full_name, 'phone', p_phone, 'role', 'tenant'),
        NOW(), NOW(), 'authenticated', 'authenticated', false
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
    VALUES (
        gen_random_uuid(), new_user_id, new_user_id::text,
        jsonb_build_object('sub', new_user_id::text, 'email', p_email),
        'email', NOW(), NOW()
    );

    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (new_user_id, p_full_name, p_phone, 'tenant')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = 'tenant';

    INSERT INTO public.tenants (
        room_id, user_id, owner_id, full_name, phone, move_in_date, deposit_amount, is_active
    ) VALUES (
        p_room_id, new_user_id, auth.uid(), p_full_name, p_phone, p_start_date, COALESCE(p_deposit, 0), TRUE
    ) RETURNING id INTO new_tenant_id;

    UPDATE public.rooms SET status = 'occupied' WHERE id = p_room_id;

    RETURN jsonb_build_object('success', TRUE, 'tenant_id', new_tenant_id, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_tenant_password(
    p_tenant_id UUID,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    tenant_user_id UUID;
BEGIN
    SELECT user_id INTO tenant_user_id
    FROM public.tenants
    WHERE id = p_tenant_id AND owner_id = auth.uid();

    IF tenant_user_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy người thuê thuộc chủ trọ này';
    END IF;

    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = NOW()
    WHERE id = tenant_user_id;

    RETURN jsonb_build_object('success', TRUE);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_tenant_account(TEXT, TEXT, TEXT, TEXT, UUID, DECIMAL, DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_tenant_password(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_tenant_account(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    tenant_user_id UUID;
    tenant_room_id UUID;
BEGIN
    SELECT user_id, room_id INTO tenant_user_id, tenant_room_id
    FROM public.tenants
    WHERE id = p_tenant_id AND owner_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy người thuê thuộc chủ trọ này';
    END IF;

    DELETE FROM public.tenants WHERE id = p_tenant_id;

    IF tenant_user_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = tenant_user_id;
    END IF;

    UPDATE public.rooms SET status = 'vacant' WHERE id = tenant_room_id AND owner_id = auth.uid();
    RETURN jsonb_build_object('success', TRUE);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_tenant_account(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
