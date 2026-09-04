-- XOA TOAN BO SCHEMA
-- Chay file nay TRUOC KHI chay migration.sql

-- Drop triggers
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

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_room_status_on_tenant_change() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS generate_share_token() CASCADE;
DROP FUNCTION IF EXISTS update_invoice_on_payment() CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS invoice_number_seq CASCADE;

-- Drop tables (tu duoi len tren de tranh conflict foreign key)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.electricity_readings CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.bank_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
