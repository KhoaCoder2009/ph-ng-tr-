import { supabase } from '@/lib/supabase'
import type { Payment, PaymentMethod } from '@/types'

export const paymentService = {
  async getAll(filters?: { tenant_id?: string }): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*, invoice:invoices(invoice_number, period_month, period_year, room:rooms(room_code))')
      .order('created_at', { ascending: false })
    if (filters?.tenant_id) query = query.eq('tenant_id', filters.tenant_id)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data as Payment[]
  },

  async getByTenant(tenantId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, invoice:invoices(invoice_number, period_month, period_year, room:rooms(room_code))')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data as Payment[]
  },

  async confirm(params: {
    invoiceId: string
    tenantId: string       // tenants.id
    tenantUserId: string   // auth.users.id
    amount: number
    method: PaymentMethod
    transactionRef?: string
    confirmedBy: string
  }): Promise<Payment> {
    const { invoiceId, tenantId, tenantUserId, amount, method, transactionRef, confirmedBy } = params

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoiceId,
        tenant_id: tenantId,           // tenants.id
        tenant_user_id: tenantUserId,  // auth.users.id
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        amount, payment_method: method === 'qr_vcb' ? 'bank_transfer' : method,
        transaction_ref: transactionRef,
        payment_date: new Date().toISOString().slice(0, 10),
        notes: `Đã xác nhận bởi ${confirmedBy}`,
      })
      .select()
      .single()

    if (payError) throw new Error(payError.message)

    await supabase
      .from('invoices')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    // Notification dùng tenantUserId (auth.users.id)
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: tenantUserId,
      type: 'payment_confirmed',
      title: 'Thanh toán thành công',
      message: `Chủ trọ đã xác nhận thanh toán ${amount.toLocaleString('vi-VN')}đ`,
      read: false,
      link: `/tenant/invoices/${invoiceId}`,
    })
    if (notifErr) console.warn('[paymentService] notif warning:', notifErr.message)

    return payment as Payment
  },

  async getSummary(month: number, year: number): Promise<{ collected: number; uncollected: number }> {
    const [{ data: paid }, { data: unpaid }] = await Promise.all([
      supabase.from('invoices').select('total_amount').eq('period_month', month).eq('period_year', year).eq('status', 'paid'),
      supabase.from('invoices').select('total_amount').eq('period_month', month).eq('period_year', year).eq('status', 'pending'),
    ])
    return {
      collected:   (paid   ?? []).reduce((s, i) => s + (i.total_amount ?? 0), 0),
      uncollected: (unpaid ?? []).reduce((s, i) => s + (i.total_amount ?? 0), 0),
    }
  },
}
