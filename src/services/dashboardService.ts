import { supabase } from '@/lib/supabase'
import type { DashboardStats, MonthlyRevenue } from '@/types'

export const dashboardService = {
  /** Lấy thống kê dashboard */
  async getStats(month: number, year: number): Promise<DashboardStats> {
    const [roomsRes, invoicesRes, recentRes] = await Promise.all([
      supabase.from('rooms').select('id, status'),
      supabase.from('invoices').select('total_amount, status').eq('period_month', month).eq('period_year', year),
      supabase
        .from('invoices')
        .select('*, room:rooms(room_code), tenant:tenants(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (roomsRes.error) throw new Error(roomsRes.error.message)

    const rooms = roomsRes.data ?? []
    const invoices = invoicesRes.data ?? []
    const recent = recentRes.data ?? []

    const totalRooms = rooms.length
    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length
    const vacantRooms = totalRooms - occupiedRooms

    const monthRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
    const uncollected = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total_amount, 0)

    // Năm revenue
    const { data: yearInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('period_year', year)
      .eq('status', 'paid')
    const yearRevenue = (yearInvoices ?? []).reduce((s, i) => s + i.total_amount, 0)

    // Chi phí tháng
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('expense_date', `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
    const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
    const monthProfit = monthRevenue - totalExpenses

    return {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      monthRevenue,
      yearRevenue,
      monthProfit,
      uncollected,
      recentInvoices: recent as never[],
    }
  },

  /** Lấy doanh thu theo tháng trong năm (cho biểu đồ) */
  async getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('period_month, period_year, total_amount, status')
      .eq('period_year', year)

    if (error) throw new Error(error.message)

    const result: MonthlyRevenue[] = []
    for (let m = 1; m <= 12; m++) {
      const monthData = (data ?? []).filter((i) => i.period_month === m)
      const revenue = monthData.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
      const collected = revenue
      const uncollected = monthData.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total_amount, 0)
      result.push({ month: m, year, revenue, collected, uncollected })
    }
    return result
  },

  /** Lấy doanh thu từng năm (cho biểu đồ năm) */
  async getYearlyRevenue(count = 3): Promise<Array<{ year: number; revenue: number }>> {
    const currentYear = new Date().getFullYear()
    const results = []
    for (let i = 0; i < count; i++) {
      const y = currentYear - i
      const { data } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('period_year', y)
        .eq('status', 'paid')
      results.push({ year: y, revenue: (data ?? []).reduce((s, i) => s + i.total_amount, 0) })
    }
    return results.reverse()
  },
}
