import { LayoutDashboard, Home, FileText, CreditCard, User, Bell, Receipt } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  badgeCount?: number
}

export function OwnerBottomNav() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotifications(user?.id)

  const items: NavItem[] = [
    { to: '/owner',          icon: <LayoutDashboard className="w-5 h-5" />, label: 'Trang chủ' },
    { to: '/owner/rooms',    icon: <Home className="w-5 h-5" />,            label: 'Phòng' },
    { to: '/owner/invoices', icon: <FileText className="w-5 h-5" />,        label: 'Hóa đơn' },
    { to: '/owner/payments', icon: <CreditCard className="w-5 h-5" />,      label: 'Thanh toán' },
    { to: '/owner/profile',  icon: <User className="w-5 h-5" />,            label: 'Tôi', badgeCount: unreadCount },
  ]

  return <BottomNav items={items} />
}

export function TenantBottomNav() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotifications(user?.id)

  const items: NavItem[] = [
    { to: '/tenant',              icon: <LayoutDashboard className="w-5 h-5" />, label: 'Trang chủ' },
    { to: '/tenant/invoices',     icon: <Receipt className="w-5 h-5" />,         label: 'Hóa đơn' },
    { to: '/tenant/notifications',icon: <Bell className="w-5 h-5" />,            label: 'Thông báo', badgeCount: unreadCount },
    { to: '/tenant/profile',      icon: <User className="w-5 h-5" />,            label: 'Tôi' },
  ]

  return <BottomNav items={items} />
}

function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
      {/* Glass background */}
      <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="flex h-16 max-w-lg mx-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200',
                  'text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400',
                  isActive && 'text-brand-600 dark:text-brand-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-600 rounded-b-full" />
                  )}
                  <span className={cn('relative transition-transform duration-200', isActive && 'scale-110')}>
                    {item.icon}
                    {item.badgeCount != null && item.badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
