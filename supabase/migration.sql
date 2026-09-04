-- MIGRATION SQL - SCHEMA KHOP VOI CODE (UPDATED)
-- Chay trong Supabase SQL Editor
-- Sau do tao user qua insert_owner.sql

-- TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL DEFAULT 'Vietcombank',
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    qr_template TEXT DEFAULT 'vietqr',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id)
);

CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    internet_fee DECIMAL(10,2) NOT NULL DEFAULT 100000,
    garbage_fee DECIMAL(10,2) NOT NULL DEFAULT 20000,
    elec_unit_price DECIMAL(10,2) NOT NULL DEFAULT 3500,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, room_code)
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    id_number TEXT,
    move_in_date DATE NOT NULL,
    move_out_date DATE,
    deposit_amount DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.electricity_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    previous_reading DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_reading DECIMAL(10,2) NOT NULL,
    consumption DECIMAL(10,2) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
    price_per_unit DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS ((current_reading - previous_reading) * price_per_unit) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL,
    room_price DECIMAL(15,2) NOT NULL,
    electricity_usage DECIMAL(10,2) NOT NULL DEFAULT 0,
    electricity_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    water_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    other_fees DECIMAL(15,2) DEFAULT 0,
    other_fees_description TEXT,
    total_amount DECIMAL(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    share_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    note TEXT
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tenant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash', 'bank_transfer', 'momo', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_ref TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('new_invoice', 'payment_confirmed', 'payment_reminder', 'new_electricity', 'general', 'info', 'warning', 'success', 'error')),
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_tenants_room ON public.tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON public.tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_active_user_created ON public.tenants(user_id, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_active_room_created ON public.tenants(room_id, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_electricity_room ON public.electricity_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_electricity_owner ON public.electricity_readings(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_room ON public.invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_user ON public.invoices(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices(share_token);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "bank_all" ON public.bank_settings;
DROP POLICY IF EXISTS "bank_tenant_select" ON public.bank_settings;
DROP POLICY IF EXISTS "rooms_owner" ON public.rooms;
DROP POLICY IF EXISTS "rooms_tenant" ON public.rooms;
DROP POLICY IF EXISTS "tenants_owner" ON public.tenants;
DROP POLICY IF EXISTS "tenants_self" ON public.tenants;
DROP POLICY IF EXISTS "elec_owner" ON public.electricity_readings;
DROP POLICY IF EXISTS "elec_tenant" ON public.electricity_readings;
DROP POLICY IF EXISTS "inv_owner" ON public.invoices;
DROP POLICY IF EXISTS "inv_tenant" ON public.invoices;
DROP POLICY IF EXISTS "inv_shared" ON public.invoices;
DROP POLICY IF EXISTS "invoice_items_owner" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant" ON public.invoice_items;
DROP POLICY IF EXISTS "pay_owner" ON public.payments;
DROP POLICY IF EXISTS "pay_tenant" ON public.payments;
DROP POLICY IF EXISTS "exp_owner" ON public.expenses;
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_owner" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "bank_all" ON public.bank_settings FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "bank_tenant_select" ON public.bank_settings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.tenants
        WHERE tenants.owner_id = bank_settings.owner_id
          AND tenants.user_id = auth.uid()
          AND tenants.is_active = TRUE
    )
);
CREATE POLICY "rooms_owner" ON public.rooms FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "rooms_tenant" ON public.rooms FOR SELECT USING (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.room_id = rooms.id AND tenants.user_id = auth.uid() AND tenants.is_active = TRUE));
CREATE POLICY "tenants_owner" ON public.tenants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "tenants_self" ON public.tenants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "elec_owner" ON public.electricity_readings FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "elec_tenant" ON public.electricity_readings FOR SELECT USING (EXISTS (SELECT 1 FROM public.tenants WHERE tenants.room_id = electricity_readings.room_id AND tenants.user_id = auth.uid() AND tenants.is_active = TRUE));
CREATE POLICY "inv_owner" ON public.invoices FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "inv_tenant" ON public.invoices FOR SELECT USING (auth.uid() = tenant_user_id);
CREATE POLICY "inv_shared" ON public.invoices FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "invoice_items_owner" ON public.invoice_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.owner_id = auth.uid())
);
CREATE POLICY "invoice_items_tenant" ON public.invoice_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_user_id = auth.uid())
);
CREATE POLICY "pay_owner" ON public.payments FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "pay_tenant" ON public.payments FOR SELECT USING (auth.uid() = tenant_user_id);
CREATE POLICY "exp_owner" ON public.expenses FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_owner" ON public.notifications FOR INSERT WITH CHECK (
        EXISTS (
                SELECT 1 FROM public.invoices
                WHERE invoices.tenant_user_id = notifications.user_id
                    AND invoices.owner_id = auth.uid()
                    AND invoices.id = NULLIF(split_part(COALESCE(notifications.link, ''), '/', 4), '')::UUID
        )
        OR EXISTS (
                SELECT 1 FROM public.tenants
                WHERE tenants.user_id = notifications.user_id
                    AND tenants.owner_id = auth.uid()
        )
);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_room_status_on_tenant_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
        UPDATE public.rooms SET status = 'occupied' WHERE id = NEW.room_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        UPDATE public.rooms SET status = 'vacant' WHERE id = NEW.room_id;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active = TRUE THEN
        UPDATE public.rooms SET status = 'vacant' WHERE id = OLD.room_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_token IS NULL THEN
        NEW.share_token := encode(gen_random_bytes(16), 'hex');
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(15,2);
    total_paid DECIMAL(15,2);
BEGIN
    SELECT total_amount INTO invoice_total FROM public.invoices WHERE id = NEW.invoice_id;
    SELECT COALESCE(SUM(amount), 0) INTO total_paid FROM public.payments WHERE invoice_id = NEW.invoice_id;
    IF total_paid >= invoice_total THEN
        UPDATE public.invoices SET status = 'paid', paid_date = NEW.payment_date WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'));
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_bank_updated_at ON public.bank_settings;
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS tenant_status_change ON public.tenants;
DROP TRIGGER IF EXISTS update_elec_updated_at ON public.electricity_readings;
DROP TRIGGER IF EXISTS update_inv_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS set_invoice_number ON public.invoices;
DROP TRIGGER IF EXISTS set_share_token ON public.invoices;
DROP TRIGGER IF EXISTS update_pay_updated_at ON public.payments;
DROP TRIGGER IF EXISTS payment_received ON public.payments;
DROP TRIGGER IF EXISTS update_exp_updated_at ON public.expenses;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_updated_at BEFORE UPDATE ON public.bank_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tenant_status_change AFTER INSERT OR UPDATE OR DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_room_status_on_tenant_change();
CREATE TRIGGER update_elec_updated_at BEFORE UPDATE ON public.electricity_readings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inv_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
CREATE TRIGGER set_share_token BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION generate_share_token();
CREATE TRIGGER update_pay_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER payment_received AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();
CREATE TRIGGER update_exp_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
