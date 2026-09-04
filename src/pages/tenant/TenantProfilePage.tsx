import { useState } from 'react'
import { LogOut, Lock, Phone, Calendar, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header }       from '@/components/layout/Header'
import { Card }         from '@/components/ui/Card'
import { Button }       from '@/components/ui/Button'
import { Modal }        from '@/components/ui/Modal'
import { Input }        from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { useUIStore }   from '@/store/uiStore'
import { supabase }     from '@/lib/supabase'

export function TenantProfilePage() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { addToast, theme, toggleTheme } = useUIStore()

  const [showPwd, setShowPwd]   = useState(false)
  const [oldPwd, setOldPwd]     = useState('')
  const [newPwd, setNewPwd]     = useState('')
  const [saving, setSaving]     = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleChangePwd = async () => {
    if (!newPwd || newPwd.length < 6) return addToast('Mật khẩu phải có ít nhất 6 ký tự', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      addToast('Đã đổi mật khẩu thành công', 'success')
      setShowPwd(false)
      setOldPwd(''); setNewPwd('')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể đổi mật khẩu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const initials = profile?.full_name?.split(' ').slice(-2).map(w=>w[0]).join('').toUpperCase() ?? '?'

  return (
    <div className="page-enter">
      <Header title="Tài khoản" />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Avatar */}
        <Card className="text-center py-6 space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-3d animate-float">
            {initials}
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">{profile?.full_name}</h2>
            <p className="text-sm text-slate-500">{profile?.phone}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
              Người thuê
            </span>
          </div>
        </Card>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-slate-800/60">
          <button onClick={() => setShowPwd(true)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all rounded-t-2xl">
            <span className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Lock className="w-4 h-4 text-brand-500"/> Đổi mật khẩu
            </span>
          </button>
          <button onClick={toggleTheme} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all rounded-b-2xl">
            <span className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              Chế độ {theme === 'dark' ? 'Sáng' : 'Tối'}
            </span>
          </button>
        </Card>

        <Card padding="none">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-2xl">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Đăng xuất</span>
          </button>
        </Card>
      </div>

      {/* Change password modal */}
      <Modal open={showPwd} onClose={() => setShowPwd(false)} title="Đổi mật khẩu" size="sm">
        <div className="space-y-4">
          <Input label="Mật khẩu mới" type="password" placeholder="Ít nhất 6 ký tự" value={newPwd} onChange={e=>setNewPwd(e.target.value)} leftIcon={<Lock className="w-4 h-4"/>} />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowPwd(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleChangePwd}>Lưu</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
