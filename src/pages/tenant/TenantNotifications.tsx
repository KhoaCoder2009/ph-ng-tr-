import { Bell } from 'lucide-react'
import { Header }        from '@/components/layout/Header'
import { EmptyState }    from '@/components/ui/EmptyState'
import { CardSkeleton }  from '@/components/ui/Skeleton'
import { useAuthStore }  from '@/store/authStore'
import { useNotifications } from '@/hooks/useNotifications'

export function TenantNotifications() {
  const { user } = useAuthStore()
  const { notifications, isLoading, markRead, markAllRead, unreadCount } = useNotifications(user?.id)

  const icons: Record<string, string> = {
    new_invoice: '🧾', payment_confirmed: '✅',
    payment_reminder: '⏰', new_electricity: '⚡', general: '📢',
  }

  return (
    <div className="page-enter">
      <Header title="Thông báo" />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            Đánh dấu tất cả đã đọc ({unreadCount})
          </button>
        )}

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i)=><CardSkeleton key={i}/>)}</div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="w-6 h-6"/>} title="Không có thông báo" description="Thông báo mới sẽ xuất hiện ở đây" />
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-95 ${
                n.is_read
                  ? 'bg-white dark:bg-dark-card border-slate-100 dark:border-slate-800'
                  : 'bg-brand-50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{icons[n.type] ?? '📢'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${n.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 mt-1" />}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
