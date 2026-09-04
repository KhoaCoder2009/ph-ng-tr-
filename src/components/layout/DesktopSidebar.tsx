import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Home, FileText, CreditCard, User, LogOut, BarChart2, Zap, Receipt } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { Sun, Moon } from 'lucide-react'

interface DesktopSidebarProps { role: 'owner' | 'tenant' }

export function DesktopSidebar({ role }: DesktopSidebarProps) {
  const { profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const navigate = useNavigate()

  const ownerItems = [
    { to: '/owner',           icon: <LayoutDashboard className="w-5 h-5" />, label: 'Trang chủ' },
    { to: '/owner/rooms',     icon: <Home className="w-5 h-5" />,            label: 'Phòng trọ' },
    { to: '/owner/tenants',   icon: <User className="w-5 h-5" />,            label: 'Người thuê' },
    { to: '/owner/electricity',icon: <Zap className="w-5 h-5" />,           label: 'Điện' },
    { to: '/owner/invoices',  icon: <FileText className="w-5 h-5" />,        label: 'Hóa đơn' },
    { to: '/owner/payments',  icon: <CreditCard className="w-5 h-5" />,      label: 'Thanh toán' },
    { to: '/owner/revenue',   icon: <BarChart2 className="w-5 h-5" />,       label: 'Doanh thu' },
    { to: '/owner/profile',   icon: <User className="w-5 h-5" />,            label: 'Tôi' },
  ]

  const tenantItems = [
    { to: '/tenant',              icon: <LayoutDashboard className="w-5 h-5" />, label: 'Trang chủ' },
    { to: '/tenant/invoices',     icon: <Receipt className="w-5 h-5" />,         label: 'Hóa đơn' },
    { to: '/tenant/notifications',icon: <Receipt className="w-5 h-5" />,         label: 'Thông báo' },
    { to: '/tenant/profile',      icon: <User className="w-5 h-5" />,            label: 'Tôi' },
  ]

  const items = role === 'owner' ? ownerItems : tenantItems

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() ?? 'DH'

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white dark:bg-dark-card border-r border-slate-200 dark:border-slate-800 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-glow-sm">
          <span className="text-white font-black text-base">DH</span>
        </div>
        <div>
          <span className="font-black text-lg text-brand-600 dark:text-brand-400">DH</span>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Quản lý phòng trọ</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{profile?.full_name ?? 'Người dùng'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.phone}</p>
          </div>
          <button onClick={toggleTheme} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>
    </aside>
  )
}
