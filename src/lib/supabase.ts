import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Vui lòng tạo file .env với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type Database = {
  public: {
    Tables: {
      profiles: { Row: import('@/types').Profile; Insert: Omit<import('@/types').Profile, 'created_at' | 'updated_at'>; Update: Partial<import('@/types').Profile> }
      rooms: { Row: import('@/types').Room; Insert: Omit<import('@/types').Room, 'id' | 'created_at' | 'updated_at'>; Update: Partial<import('@/types').Room> }
      tenants: { Row: import('@/types').Tenant; Insert: Omit<import('@/types').Tenant, 'id' | 'created_at' | 'updated_at'>; Update: Partial<import('@/types').Tenant> }
      electricity_readings: { Row: import('@/types').ElectricityReading; Insert: Omit<import('@/types').ElectricityReading, 'id' | 'created_at'>; Update: Partial<import('@/types').ElectricityReading> }
      invoices: { Row: import('@/types').Invoice; Insert: Omit<import('@/types').Invoice, 'id' | 'created_at' | 'updated_at'>; Update: Partial<import('@/types').Invoice> }
      invoice_items: { Row: import('@/types').InvoiceItem; Insert: Omit<import('@/types').InvoiceItem, 'id'>; Update: Partial<import('@/types').InvoiceItem> }
      payments: { Row: import('@/types').Payment; Insert: Omit<import('@/types').Payment, 'id' | 'created_at'>; Update: Partial<import('@/types').Payment> }
      expenses: { Row: import('@/types').Expense; Insert: Omit<import('@/types').Expense, 'id' | 'created_at'>; Update: Partial<import('@/types').Expense> }
      notifications: { Row: import('@/types').Notification; Insert: Omit<import('@/types').Notification, 'id' | 'created_at'>; Update: Partial<import('@/types').Notification> }
      bank_settings: { Row: import('@/types').BankSettings; Insert: Omit<import('@/types').BankSettings, 'id' | 'created_at' | 'updated_at'>; Update: Partial<import('@/types').BankSettings> }
    }
  }
}
