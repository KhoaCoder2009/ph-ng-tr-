import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus } from '@/types'
import { generateInvoiceCode } from '@/utils/format'

export interface CreateInvoiceParams {
  room_id: string
  tenant_id: string       // tenants.id (public.tenants PK)
  tenant_user_id: string  // auth.users.id (để notification + RLS)
  room_code: string
  period_month: number
  period_year: number
  rent_amount: number
  elec_amount: number
  internet_amount: number
  garbage_amount: number
  other_amount: number
  other_items?: Array<{ name: string; amount: number }>
}

// Select string dùng chung — join tenant qua FK tenants.id
const INVOICE_SELECT = `
  *,
  room:rooms(room_code, price),
  tenant:tenants(full_name, phone)
` as const

function mapInvoice(row: Record<string, any>): Invoice {
  return {
    ...row,
    invoice_code: row.invoice_code ?? row.invoice_number,
    rent_amount: Number(row.rent_amount ?? row.room_price ?? 0),
    elec_amount: Number(row.elec_amount ?? row.electricity_cost ?? 0),
    internet_amount: Number(row.internet_amount ?? 0),
    garbage_amount: Number(row.garbage_amount ?? 0),
    other_amount: Number(row.other_amount ?? row.other_fees ?? 0),
    status: row.status === 'paid' ? 'paid' : 'unpaid',
  } as Invoice
}

export const invoiceService = {
  async getAll(filters?: {
    month?: number
    year?: number
    room_id?: string
    status?: InvoiceStatus
    search?: string
  }): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .order('created_at', { ascending: false })

    if (filters?.month)   query = query.eq('period_month', filters.month)
    if (filters?.year)    query = query.eq('period_year',  filters.year)
    if (filters?.room_id) query = query.eq('room_id',      filters.room_id)
    if (filters?.status)  query = query.eq('status', filters.status === 'unpaid' ? 'pending' : filters.status)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    let results = (data ?? []).map((row) => mapInvoice(row as Record<string, any>))

    if (filters?.search) {
      const s = filters.search.toLowerCase()
      results = results.filter((inv) => {
        const room   = inv.room   as unknown as { room_code?: string } | null
        const tenant = inv.tenant as unknown as { full_name?: string } | null
        return (
          room?.room_code?.toLowerCase().includes(s) ||
          tenant?.full_name?.toLowerCase().includes(s)
        )
      })
    }
    return results
  },

  async getByTenant(tenantUserId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('tenant_user_id', tenantUserId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapInvoice(row as Record<string, any>))
  },

  async getById(id: string): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`${INVOICE_SELECT}, items:invoice_items(*)`)
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return mapInvoice(data as Record<string, any>)
  },

  async getByShareToken(token: string): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`${INVOICE_SELECT}, items:invoice_items(*)`)
      .eq('share_token', token)
      .single()
    if (error) throw new Error('Hóa đơn không tồn tại hoặc link đã hết hạn')
    return mapInvoice(data as Record<string, any>)
  },

  async create(params: CreateInvoiceParams): Promise<Invoice> {
    const {
      room_id, tenant_id, tenant_user_id, room_code,
      period_month, period_year,
      rent_amount, elec_amount, internet_amount, garbage_amount, other_amount,
      other_items,
    } = params

    const total_amount = rent_amount + elec_amount + internet_amount + garbage_amount + other_amount
    const invoice_number = generateInvoiceCode(room_code, period_month, period_year)
    const share_token  = crypto.randomUUID()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number, room_id,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        tenant_id,        // tenants.id
        tenant_user_id,   // auth.users.id
        period_month, period_year,
        room_price: rent_amount,
        electricity_usage: elec_amount,
        electricity_cost: elec_amount,
        water_cost: 0,
        other_fees: other_amount,
        other_fees_description: other_items?.map((item) => item.name).join(', ') || null,
        total_amount, status: 'pending', share_token,
        due_date: `${period_year}-${String(period_month).padStart(2, '0')}-28`,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    if (other_items && other_items.length > 0) {
      await supabase.from('invoice_items').insert(
        other_items.map((item) => ({
          invoice_id: (invoice as Invoice).id,
          name: item.name, amount: item.amount, quantity: 1,
        }))
      )
    }

    // Notification dùng tenant_user_id (auth.users.id)
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: tenant_user_id,
      type: 'new_invoice',
      title: 'Hóa đơn mới',
      message: `Bạn có hóa đơn tháng ${period_month}/${period_year}. Tổng: ${total_amount.toLocaleString('vi-VN')}đ`,
      read: false,
      link: `/tenant/invoices/${(invoice as Invoice).id}`,
    })
    if (notifErr) console.warn('[invoiceService] notif warning:', notifErr.message)

    return mapInvoice(invoice as Record<string, any>)
  },

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: status === 'unpaid' ? 'pending' : status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapInvoice(data as Record<string, any>)
  },

  async delete(id: string): Promise<void> {
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async getByRoomAndPeriod(roomId: string, month: number, year: number): Promise<Invoice | null> {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('room_id', roomId)
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle()
    return data ? mapInvoice(data as Record<string, any>) : null
  },
}
