import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, BarChart2 } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { Header }         from '@/components/layout/Header'
import { Card }           from '@/components/ui/Card'
import { Button }         from '@/components/ui/Button'
import { Modal }          from '@/components/ui/Modal'
import { Input }          from '@/components/ui/Input'
import { Select }         from '@/components/ui/Select'
import { EmptyState }     from '@/components/ui/EmptyState'
import { CardSkeleton }   from '@/components/ui/Skeleton'
import { dashboardService } from '@/services/dashboardService'
import { expenseService, EXPENSE_CATEGORY_LABELS } from '@/services/expenseService'
import { invoiceService } from '@/services/invoiceService'
import { useUIStore }     from '@/store/uiStore'
import { formatMoney, formatMoneyShort, formatPeriod, getCurrentPeriod } from '@/utils/format'
import type { Expense, MonthlyRevenue, ExpenseCategory } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export function RevenuePage() {
  const { addToast, theme } = useUIStore()
  const { month, year } = getCurrentPeriod()
  const isDark = theme === 'dark'

  const [monthlyData, setMonthlyData]     = useState<MonthlyRevenue[]>([])
  const [expenses, setExpenses]           = useState<Expense[]>([])
  const [totalRevenue, setTotalRevenue]   = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [isLoading, setIsLoading]         = useState(true)
  const [showAddExp, setShowAddExp]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [viewMode, setViewMode]           = useState<'month' | 'year'>('month')

  const [expForm, setExpForm] = useState({
    category: 'other' as ExpenseCategory,
    name: '', amount: '', expense_date: new Date().toISOString().slice(0,10), notes: '',
  })

  const load = async () => {
    setIsLoading(true)
    try {
      const [rev, exps, yearRevData] = await Promise.all([
        invoiceService.getAll({ month, year, status: 'paid' }),
        expenseService.getByPeriod(month, year),
        dashboardService.getMonthlyRevenue(year),
      ])
      const totalRev = rev.reduce((s, i) => s + i.total_amount, 0)
      const totalExp = exps.reduce((s, e) => s + e.amount, 0)
      setTotalRevenue(totalRev)
      setTotalExpenses(totalExp)
      setExpenses(exps)
      setMonthlyData(yearRevData)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const profit = totalRevenue - totalExpenses

  const chartData = {
    labels: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'],
    datasets: [
      {
        label: 'Thu',
        data: monthlyData.map(m => m.revenue),
        backgroundColor: 'rgba(79,70,229,0.8)',
        borderRadius: 6,
      },
    ],
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => formatMoney(ctx.parsed.y) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: isDark?'#64748b':'#94a3b8', font:{size:10} } },
      y: { grid: { color: isDark?'#1e293b':'#f1f5f9' }, ticks: { color: isDark?'#64748b':'#94a3b8', font:{size:10}, callback: (v: number|string) => formatMoneyShort(Number(v)) } },
    },
  }

  const handleAddExpense = async () => {
    if (!expForm.name || !expForm.amount) return addToast('Nhập đầy đủ thông tin', 'error')
    setSaving(true)
    try {
      await expenseService.create({
        ...expForm, amount: Number(expForm.amount),
        period_month: month, period_year: year,
      })
      addToast('Đã thêm chi phí', 'success')
      setShowAddExp(false)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể lưu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await expenseService.delete(id)
      addToast('Đã xóa chi phí', 'success')
      load()
    } catch { addToast('Không thể xóa', 'error') }
  }

  return (
    <div className="page-enter">
      <Header title="Doanh thu" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Period header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Tháng <span className="font-bold text-slate-700 dark:text-slate-300">{formatPeriod(month, year)}</span></p>
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(['month','year'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${viewMode===v?'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm':'text-slate-500'}`}>
                {v==='month'?'Tháng':'Năm'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3"><CardSkeleton/><CardSkeleton/></div>
        ) : (
          <>
            {/* Revenue summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mx-auto mb-2">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Doanh thu</p>
                <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{formatMoneyShort(totalRevenue)}</p>
              </Card>
              <Card className="text-center">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 w-fit mx-auto mb-2">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Chi phí</p>
                <p className="font-extrabold text-sm text-red-600 dark:text-red-400 mt-0.5">{formatMoneyShort(totalExpenses)}</p>
              </Card>
              <Card className="text-center">
                <div className={`p-2 rounded-xl ${profit >= 0 ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'bg-red-500/10 text-red-600'} w-fit mx-auto mb-2`}>
                  <BarChart2 className="w-4 h-4" />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Lợi nhuận</p>
                <p className={`font-extrabold text-sm mt-0.5 ${profit>=0?'text-brand-600 dark:text-brand-400':'text-red-600'}`}>{formatMoneyShort(profit)}</p>
              </Card>
            </div>

            {/* Bar chart */}
            <Card>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Biểu đồ doanh thu {year}</p>
              <div className="h-40">
                <Bar data={chartData} options={chartOptions as never} />
              </div>
            </Card>

            {/* Expenses */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Chi phí tháng {formatPeriod(month, year)}
                </h3>
                <Button size="sm" onClick={() => setShowAddExp(true)} leftIcon={<Plus className="w-4 h-4"/>}>Thêm</Button>
              </div>

              {expenses.length === 0 ? (
                <EmptyState icon={<TrendingDown className="w-5 h-5"/>} title="Chưa có chi phí" description="Thêm chi phí để tính lợi nhuận chính xác" />
              ) : (
                <div className="space-y-2">
                  {expenses.map(exp => (
                    <Card key={exp.id} className="flex justify-between items-center py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{exp.name}</p>
                        <p className="text-[10px] text-slate-400">{EXPENSE_CATEGORY_LABELS[exp.category]} • {exp.expense_date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-extrabold text-sm text-red-600 dark:text-red-400">{formatMoney(exp.amount)}</p>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add expense modal */}
      <Modal open={showAddExp} onClose={() => setShowAddExp(false)} title="Thêm chi phí" size="sm">
        <div className="space-y-4">
          <Select label="Loại chi phí" value={expForm.category} onChange={e=>setExpForm(s=>({...s,category:e.target.value as ExpenseCategory}))}
            options={Object.entries(EXPENSE_CATEGORY_LABELS).map(([v,l])=>({value:v,label:l}))} />
          <Input label="Tên chi phí" placeholder="Sửa vòi nước phòng 101" value={expForm.name} onChange={e=>setExpForm(s=>({...s,name:e.target.value}))} />
          <Input label="Số tiền (đ)" type="number" value={expForm.amount} onChange={e=>setExpForm(s=>({...s,amount:e.target.value}))} />
          <Input label="Ngày" type="date" value={expForm.expense_date} onChange={e=>setExpForm(s=>({...s,expense_date:e.target.value}))} />
          <Input label="Ghi chú" value={expForm.notes} onChange={e=>setExpForm(s=>({...s,notes:e.target.value}))} />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowAddExp(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleAddExpense}>Lưu chi phí</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
