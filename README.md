# DH — Quản lý Phòng Trọ

# phongtro

# ph-ng-tr-

Hệ thống quản lý phòng trọ thông minh dành cho chủ trọ và người thuê tại Việt Nam.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Glassmorphism, 3D effects)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Android**: Capacitor 6
- **State**: Zustand
- **Charts**: Chart.js + react-chartjs-2
- **PDF**: jsPDF

---

## 1. Thiết lập Supabase

### 1.1 Tạo project
1. Truy cập https://supabase.com → **New Project**
2. Chọn region gần nhất (Singapore cho Việt Nam)
3. Lưu lại **Project URL** và **anon key**

### 1.2 Chạy SQL
1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy toàn bộ nội dung file `supabase/migration.sql`
3. Paste vào SQL Editor → **Run**

### 1.3 Tạo tài khoản chủ trọ
Sau khi chạy migration, tạo tài khoản chủ trọ bằng cách uncomment và sửa đoạn SEED ở cuối file `migration.sql`:

```sql
-- Thay thế các giá trị trước khi chạy
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES (
  gen_random_uuid(),
  '0901234567@dh.local',        -- SĐT chủ trọ
  crypt('matkhau_manh', gen_salt('bf')),
  NOW(),
  '{"full_name":"Tên Chủ Trọ","phone":"0901234567"}',
  NOW(), NOW(), 'authenticated', 'authenticated'
);

-- Tạo profile chủ trọ
INSERT INTO public.profiles (user_id, role, full_name, phone)
SELECT id, 'owner', 'Tên Chủ Trọ', '0901234567'
FROM auth.users WHERE email = '0901234567@dh.local';
```

### 1.4 Tạo tài khoản người thuê

Luồng owner tạo người thuê sử dụng Edge Function `create-tenant-account`. Deploy function sau khi đăng nhập Supabase CLI:

```bash
npx supabase functions deploy create-tenant-account
```

Function dùng `SUPABASE_SERVICE_ROLE_KEY` ở server-side để gọi Auth Admin API; không đưa key này vào `.env` frontend hoặc bundle. RPC `create_tenant_account` cũ không còn được frontend sử dụng.

### 1.5 Cấu hình Realtime
Trong Supabase Dashboard → **Database** → **Replication**:
- Bật replication cho tables: `notifications`, `invoices`, `payments`

---

## 2. Cài đặt & Chạy Website

```bash
# Copy file env
cp .env.example .env

# Điền thông tin Supabase vào .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Cài dependencies
npm install

# Chạy development
npm run dev

# Build production
npm run build
```

---

## 3. Build Android App

```bash
# Build web trước
npm run build

# Khởi tạo Capacitor (lần đầu)
npx cap add android

# Sync code vào Android
npx cap sync android

# Mở Android Studio
npx cap open android
```

Trong Android Studio:
- **Build** → **Generate Signed Bundle/APK**
- Chọn **APK** → tạo keystore → Build

---

## 4. Cấu trúc thư mục

```
src/
├── components/
│   ├── layout/         # Header, BottomNav, Sidebar, Layouts
│   └── ui/             # Button, Card, Modal, Input, Badge, ...
├── hooks/              # useRooms, useDashboard, useNotifications
├── lib/
│   └── supabase.ts     # Supabase client
├── pages/
│   ├── owner/          # Dashboard, Rooms, Tenants, Electricity, Invoices, ...
│   ├── tenant/         # Dashboard, Invoices, Notifications, Profile
│   ├── LoginPage.tsx
│   ├── SplashScreen.tsx
│   └── SharedInvoicePage.tsx
├── services/           # roomService, tenantService, invoiceService, ...
├── store/              # authStore, uiStore (Zustand)
├── types/              # TypeScript interfaces
└── utils/              # format.ts, pdf.ts, cn.ts
supabase/
└── migration.sql       # Toàn bộ SQL schema + RLS + RPC functions
```

---

## 5. Luồng sử dụng

### Chủ trọ
1. Đăng nhập bằng SĐT + mật khẩu
2. Thêm phòng trọ (Phòng > Thêm phòng)
3. Thêm người thuê + tạo tài khoản (Người thuê > Thêm)
4. Nhập chỉ số điện hàng tháng (Điện)
5. Tạo hóa đơn → gửi thông báo realtime cho người thuê
6. Chia sẻ link hóa đơn qua Zalo
7. Xác nhận thanh toán khi người thuê đã trả

### Người thuê
1. Đăng nhập bằng SĐT + mật khẩu mặc định (123456)
2. Xem hóa đơn tháng hiện tại
3. Quét QR VCB để thanh toán
4. Nhận thông báo realtime khi chủ trọ xác nhận

---

## 6. Bảo mật

- Tất cả dữ liệu được bảo vệ bởi Supabase RLS
- Người thuê chỉ có thể xem dữ liệu của phòng mình
- Frontend chỉ dùng `anon key` (không bao giờ dùng `service_role` ở client)
- Mật khẩu được hash bởi bcrypt trong Supabase Auth
- Link hóa đơn dùng UUID token ngẫu nhiên (share_token)

---

## 7. Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

> ⚠️ **Không bao giờ** commit file `.env` vào git. File `.env` đã được thêm vào `.gitignore`.
