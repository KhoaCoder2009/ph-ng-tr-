import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseCategory } from '@/types'

export const expenseService = {
  /** Lấy chi phí theo tháng */
  async getByPeriod(month: number, year: number): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('expense_date', `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
      .order('expense_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({ ...row, name: row.name ?? row.description, notes: row.notes ?? null })) as Expense[]
  },

  /** Lấy chi phí theo năm */
  async getByYear(year: number): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', `${year}-01-01`)
      .lt('expense_date', `${year + 1}-01-01`)
      .order('expense_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({ ...row, name: row.name ?? row.description, notes: row.notes ?? null })) as Expense[]
  },

  /** Thêm chi phí */
  async create(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    const expenseWithRoom = expense as Omit<Expense, 'id' | 'created_at'> & { room_id?: string }
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        room_id: expenseWithRoom.room_id ?? null,
        category: expense.category,
        amount: expense.amount,
        description: expense.name,
        expense_date: expense.expense_date,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { ...data, name: data.name ?? data.description, notes: data.notes ?? null } as Expense
  },

  /** Xóa chi phí */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  /** Tổng chi phí theo tháng */
  async getTotalByPeriod(month: number, year: number): Promise<number> {
    const { data } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('expense_date', `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
    return (data ?? []).reduce((s, e) => s + e.amount, 0)
  },
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  repair: 'Sửa chữa',
  maintenance: 'Bảo trì',
  internet: 'Internet',
  electricity: 'Điện',
  water: 'Nước',
  other: 'Khác',
}
