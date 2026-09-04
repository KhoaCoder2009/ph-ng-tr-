import { useState, useEffect } from 'react'
import { LogOut, CreditCard, Bell, User, ChevronRight, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header }        from '@/components/layout/Header'
import { Card }          from '@/components/ui/Card'
import { Button }        from '@/components/ui/Button'
import { Modal }         from '@/components/ui/Modal'
import { Input }         from '@/components/ui/Input'
import { useAuthStore }  from '@/store/authStore'
import { useUIStore }    from '@/store/uiStore'
import { bankSettingsService } from '@/services/bankSettingsService'
import { useNotifications }    from '@/hooks/useNotifications'
import type { BankSettings, Notification } from '@/types'

export function OwnerProfilePage() {
  const navigate = useNavigate()
  const { profile, signOut, user } = useAuthStore()
  const { addToast, theme, toggleTheme } = useUIStore()
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications(user?.id)

  const [showBank, setShowBank]     = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [bankForm, setBankForm]     = useState({ bank_name:'Vietcombank', account_number:'', account_name:'', branch:'' })
  const [savingBank, setSavingBank] = useState(false)

  useEffect(() => {
    bankSettingsService.get().then(b => {
      if (b) setBankForm({ bank_name: b.bank_name, account_number: b.account_number, account_name: b.account_name, branch: b.branch ?? '' })
    })
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSaveBank = async () => {
    setSavingBank(true)
    try {
      await bankSettingsService.upsert(bankForm)
      addToast('Đã lưu thông tin ngân hàng', 'success')
      setShowBank(false)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể lưu', 'error')
    } finally {
      setSavingBank(false)
    }
  }

  const initials = profile?.full_name?.split(' ').slice(-2).map(w=>w[0]).join('').toUpperCase() ?? 'DH'

  return (
    <div className="page-enter">
      <Header title="Tài khoản" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Profile card */}
        <Card className="text-center py-6 space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-3d animate-float">
            {initials}
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">{profile?.full_name ?? 'Chủ trọ'}</h2>
            <p className="text-sm text-slate-500">{profile?.phone}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold border border-brand-100 dark:border-brand-500/20">
              Chủ trọ
            </span>
          </div>
        </Card>

        {/* Menu items */}
        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800/60">
          <MenuItem icon={<CreditCard className="w-4 h-4 text-brand-500"/>} label="Cài đặt ngân hàng (QR VCB)" onClick={() => setShowBank(true)} />
          <MenuItem icon={<Bell className="w-4 h-4 text-amber-500"/>} label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`} onClick={() => setShowNotifs(true)} badge={unreadCount} />
          <MenuItem icon={<User className="w-4 h-4 text-slate-500"/>} label={`Chế độ ${theme === 'dark' ? 'Tối 🌙' : 'Sáng ☀️'}`} onClick={toggleTheme} />
        </Card>

        <Card padding="none">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-2xl">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Đăng xuất</span>
          </button>
        </Card>

        <p className="text-center text-xs text-slate-400">DH v1.0 — Quản lý phòng trọ thông minh</p>
      </div>

      {/* Bank settings modal */}
      <Modal open={showBank} onClose={() => setShowBank(false)} title="Cài đặt ngân hàng">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-xs text-brand-700 dark:text-brand-300">
            💳 Thông tin này dùng để tạo QR VietQR cho người thuê thanh toán.
          </div>
          <Input label="Tên ngân hàng" value={bankForm.bank_name} onChange={e=>setBankForm(s=>({...s,bank_name:e.target.value}))} placeholder="Vietcombank" />
          <Input label="Số tài khoản" value={bankForm.account_number} onChange={e=>setBankForm(s=>({...s,account_number:e.target.value}))} placeholder="1234567890" />
          <Input label="Tên chủ tài khoản" value={bankForm.account_name} onChange={e=>setBankForm(s=>({...s,account_name:e.target.value}))} placeholder="NGUYEN VAN A" />
          <Input label="Chi nhánh (tuỳ chọn)" value={bankForm.branch} onChange={e=>setBankForm(s=>({...s,branch:e.target.value}))} placeholder="HCM" />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowBank(false)}>Hủy</Button>
            <Button fullWidth loading={savingBank} onClick={handleSaveBank} leftIcon={<Save className="w-4 h-4"/>}>Lưu</Button>
          </div>
        </div>
      </Modal>

      {/* Notifications modal */}
      <Modal open={showNotifs} onClose={() => setShowNotifs(false)} title="Thông báo" size="lg">
        <div className="space-y-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Không có thông báo nào</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {notifications.map(n => (
                <NotifItem key={n.id} notif={n} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function MenuItem({ icon, label, onClick, badge }: { icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all first:rounded-t-2xl last:rounded-b-2xl">
      <span className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {icon} {label}
      </span>
      <div className="flex items-center gap-2">
        {badge != null && badge > 0 && (
          <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{badge}</span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400"/>
      </div>
    </button>
  )
}

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const icons: Record<string, string> = { new_invoice:'🧾', payment_confirmed:'✅', payment_reminder:'⏰', new_electricity:'⚡', general:'📢' }
  return (
    <button onClick={() => onRead(notif.id)} className={`w-full text-left p-3 rounded-xl transition-all ${notif.is_read?'bg-slate-50 dark:bg-slate-800/40':'bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20'}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{icons[notif.type] ?? '📢'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white">{notif.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.body}</p>
        </div>
        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1"/>}
      </div>
    </button>
  )
}
