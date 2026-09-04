import { Bell, Sun, Moon, ChevronLeft, Menu, X, LayoutDashboard, Receipt, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/utils/cn'

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  rightSlot?: React.ReactNode
  transparent?: boolean
}

export function Header({ title, showBack, onBack, rightSlot, transparent }: HeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useUIStore()
  const { user, profile } = useAuthStore()
  const { unreadCount } = useNotifications(user?.id)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header className={cn(
      'sticky top-0 z-30 border-b transition-colors',
      transparent
        ? 'bg-transparent border-transparent'
        : 'bg-white/85 dark:bg-dark-card/85 backdrop-blur-xl border-slate-200/80 dark:border-slate-800/80'
    )}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
              aria-label="Quay lại"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {profile?.role === 'tenant' && (
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
                  aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-glow-sm">
                <span className="text-white font-black text-sm">DH</span>
              </div>
            </div>
          )}
          {title && (
            <h1 className="font-bold text-base text-slate-900 dark:text-white truncate">{title}</h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {rightSlot}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Chuyển theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate(user ? (profile?.role === 'owner' ? '/owner/profile' : '/tenant/notifications') : '/login')}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping-slow" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </>
            )}
          </button>
        </div>
      </div>
      {menuOpen && profile?.role === 'tenant' && (
        <div className="absolute left-3 top-14 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-dark-card">
          {[
            { to: '/tenant', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
            { to: '/tenant/invoices', label: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
            { to: '/tenant/profile', label: 'Tài khoản', icon: <User className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.to}
              onClick={() => { navigate(item.to); setMenuOpen(false) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
