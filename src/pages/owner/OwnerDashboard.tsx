import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Home, FileText, CreditCard, Plus,
  Zap, BarChart2, ArrowRight, RefreshCw
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { useAuthStore }  from '@/store/authStore'
import { useUIStore }    from '@/store/uiStore'
import { useDashboard }  from '@/hooks/useDashboard'
import { Header }        from '@/components/layout/Header'
import { Card }          from '@/components/ui/Card'
import { Button }        from '@/components/ui/Button'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { CardSkeleton }  from '@/components/ui/Skeleton'
import { EmptyState }    from '@/components/ui/EmptyState'
import { formatMoney, formatMoneyShort, formatPeriod, getCurrentPeriod } from '@/utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export function OwnerDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { theme } = useUIStore()
  const { stats, monthlyRevenue, isLoading, error, refetch } = useDashboard()
  const { month, year } = getCurrentPeriod()

  const isDark = theme === 'dark'
  const firstName = profile?.full_name?.split(' ').pop() ?? 'Chủ trọ'

  // Chart data
  const chartData = {
    labels: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'],
    datasets: [{
      label: 'Doanh thu',
      data: monthlyRevenue.map(m => m.revenue),
      backgroundColor: monthlyRevenue.map((m, i) =>
        i === month - 1
          ? 'rgba(79,70,229,0.9)'
          : 'rgba(79,70,229,0.25)'
      ),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      callbacks: { label: (ctx: { parsed: { y: number } }) => formatMoney(ctx.parsed.y) }
    }},
    scales: {
      x: { grid: { display: false }, ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } } },
      y: { grid: { color: isDark ? '#1e293b' : '#f1f5f9' }, ticks: {
        color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 },
        callback: (v: number | string) => formatMoneyShort(Number(v))
      }},
    },
  }

  return (
    <div className="page-enter">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Xin chào,</p>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {firstName} 👋
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
              {formatPeriod(month, year)}
            </span>
            <button onClick={refetch} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 active:scale-95 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="danger" onClick={refetch}>Thử lại</Button>
          </div>
        )}

        {/* Hero Revenue Card */}
        {isLoading ? <CardSkeleton /> : (
          <div className="card-3d relative overflow-hidden rounded-3xl p-6 hero-gradient text-white shadow-3d">
            {/* Blobs */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Tổng doanh thu
                  </p>
                  <p className="text-3xl font-black mt-1 tracking-tight">
                    {formatMoney(stats?.monthRevenue ?? 0)}
                  </p>
                  <p className="text-xs text-brand-200 mt-0.5">Tháng {formatPeriod(month, year)}</p>
                </div>
                <button
                  onClick={() => navigate('/owner/revenue')}
                  className="text-xs bg-white/15 hover:bg-white/25 active:scale-95 px-3 py-2 rounded-full backdrop-blur-md transition-all font-semibold flex items-center gap-1 border border-white/20"
                >
                  Chi tiết <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
                <div>
                  <p className="text-[10px] text-brand-200 font-medium">Năm {year}</p>
                  <p className="text-lg font-bold mt-0.5">{formatMoneyShort(stats?.yearRevenue ?? 0)}</p>
                </div>
                <div className="border-l border-white/15 pl-3">
                  <p className="text-[10px] text-brand-200 font-medium">Lợi nhuận</p>
                  <p className="text-lg font-bold mt-0.5 text-emerald-300">{formatMoneyShort(stats?.monthProfit ?? 0)}</p>
                </div>
                <div className="border-l border-white/15 pl-3">
                  <p className="text-[10px] text-brand-200 font-medium">Chưa thu</p>
                  <p className="text-lg font-bold mt-0.5 text-amber-300">{formatMoneyShort(stats?.uncollected ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <CardSkeleton /><CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card hover onClick={() => navigate('/owner/rooms')} className="card-3d">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                  Quản lý <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stats?.totalRooms ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tổng số phòng</p>
              <div className="flex gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {stats?.occupiedRooms ?? 0} thuê
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  {stats?.vacantRooms ?? 0} trống
                </span>
              </div>
            </Card>

            <Card hover onClick={() => navigate('/owner/invoices')} className="card-3d">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">+ Mới</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Tạo hóa đơn</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Lập & gửi cho người thuê</p>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  Xem tất cả <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Plus className="w-4 h-4" />, label: 'Thêm phòng',   to: '/owner/rooms',       color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
            { icon: <Zap  className="w-4 h-4" />, label: 'Nhập điện',    to: '/owner/electricity', color: 'bg-amber-500/10  text-amber-600  dark:text-amber-400'  },
            { icon: <CreditCard className="w-4 h-4" />, label: 'Thu tiền', to: '/owner/payments',  color: 'bg-brand-500/10  text-brand-600  dark:text-brand-400'  },
          ].map(item => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/85 dark:bg-dark-card/85 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-glass hover:shadow-3d hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <div className={`p-2 rounded-xl ${item.color}`}>{item.icon}</div>
              <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Revenue chart */}
        {!isLoading && monthlyRevenue.length > 0 && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Doanh thu {year}</span>
              </div>
            </div>
            <div className="h-36">
              <Bar data={chartData} options={chartOptions as never} />
            </div>
          </Card>
        )}

        {/* Recent invoices */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" /> Hóa đơn gần đây
            </h3>
            <button onClick={() => navigate('/owner/invoices')} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2"><CardSkeleton /><CardSkeleton /></div>
          ) : stats?.recentInvoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="Chưa có hóa đơn"
              description="Tạo hóa đơn đầu tiên cho người thuê"
              action={<Button size="sm" onClick={() => navigate('/owner/invoices')} leftIcon={<Plus className="w-4 h-4" />}>Tạo hóa đơn</Button>}
            />
          ) : (
            <div className="space-y-2.5">
              {stats?.recentInvoices.map((inv) => {
                const room = inv.room as unknown as { room_code: string }
                const tenant = inv.tenant as unknown as { full_name: string }
                return (
                  <Card key={inv.id} hover onClick={() => navigate('/owner/invoices')} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs">
                        {room?.room_code ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{tenant?.full_name ?? 'Khách thuê'}</p>
                        <p className="text-[10px] text-slate-400">Tháng {formatPeriod(inv.period_month, inv.period_year)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{formatMoney(inv.total_amount)}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
