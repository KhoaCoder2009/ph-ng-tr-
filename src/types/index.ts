// ─── Auth & Profiles ─────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'tenant'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export type RoomStatus = 'occupied' | 'vacant' | 'maintenance'

export interface Room {
  id: string
  room_code: string        // chủ trọ tự đặt: "101", "A01"…
  price: number            // tiền phòng/tháng
  status: RoomStatus
  internet_fee: number     // phí internet/tháng
  garbage_fee: number      // phí rác/tháng
  elec_unit_price: number  // đơn giá điện (đ/kWh)
  notes?: string
  created_at: string
  updated_at: string
  tenant?: Pick<Tenant, 'id' | 'full_name' | 'phone'>
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  user_id: string          // FK -> auth.users (Supabase auth account)
  room_id: string
  full_name: string
  phone: string
  deposit: number          // tiền cọc
  start_date: string       // ngày bắt đầu thuê
  is_active: boolean
  created_at: string
  updated_at: string
  room?: Room              // joined
}

// ─── Electricity ──────────────────────────────────────────────────────────────

export interface ElectricityReading {
  id: string
  room_id: string
  period_month: number     // 1-12
  period_year: number
  old_reading: number      // chỉ số cũ
  new_reading: number      // chỉ số mới
  unit_price: number       // đơn giá tại thời điểm ghi
  consumption: number      // generated: new - old
  total_amount: number     // generated: consumption * unit_price
  created_at: string
  room?: Room
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'unpaid' | 'paid'

export interface InvoiceItem {
  id: string
  invoice_id: string
  name: string
  amount: number
  quantity: number
  note?: string
}

export interface Invoice {
  id: string
  invoice_code: string
  room_id: string
  tenant_id: string       // public.tenants.id
  tenant_user_id: string  // auth.users.id
  period_month: number
  period_year: number
  rent_amount: number
  elec_amount: number
  internet_amount: number
  garbage_amount: number
  other_amount: number
  total_amount: number
  status: InvoiceStatus
  share_token?: string
  created_at: string
  updated_at: string
  room?: Room
  tenant?: Tenant
  items?: InvoiceItem[]
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'qr_vcb' | 'transfer'

export interface Payment {
  id: string
  invoice_id: string
  tenant_id: string       // public.tenants.id
  tenant_user_id: string  // auth.users.id
  amount: number
  method: PaymentMethod
  transaction_ref?: string
  confirmed_by?: string
  confirmed_at?: string
  created_at: string
  invoice?: Invoice
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'repair' | 'maintenance' | 'internet' | 'electricity' | 'water' | 'other'

export interface Expense {
  id: string
  category: ExpenseCategory
  name: string
  amount: number
  expense_date: string
  period_month: number
  period_year: number
  notes?: string
  created_at: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_invoice'
  | 'payment_confirmed'
  | 'payment_reminder'
  | 'new_electricity'
  | 'general'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  related_id?: string      // invoice_id, payment_id v.v.
  created_at: string
}

// ─── Bank Settings ────────────────────────────────────────────────────────────

export interface BankSettings {
  id: string
  owner_id?: string
  bank_name: string        // "Vietcombank"
  account_number: string
  account_name: string
  branch?: string
  qr_template?: string     // VietQR template string
  created_at: string
  updated_at: string
}

// ─── Dashboard / Analytics ────────────────────────────────────────────────────

export interface MonthlyRevenue {
  month: number
  year: number
  revenue: number
  collected: number
  uncollected: number
}

export interface DashboardStats {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  monthRevenue: number
  yearRevenue: number
  monthProfit: number
  uncollected: number
  recentInvoices: Invoice[]
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export type Theme = 'light' | 'dark'
