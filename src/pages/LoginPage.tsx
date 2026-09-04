import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Phone, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUIStore } from '@/store/uiStore'

export function LoginPage() {
  const { signIn, isLoading, error, clearError, user, role } = useAuthStore()
  const { theme, toggleTheme } = useUIStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // Redirect nếu đã đăng nhập
  if (user && role) {
    return <Navigate to={role === 'owner' ? '/owner' : '/tenant'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    if (!phone.trim() || !password.trim()) return
    await signIn(phone.trim(), password)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FB] dark:bg-dark-bg relative overflow-hidden px-4">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-4">
          {/* 3D Logo */}
          <div className="relative w-24 h-24 mx-auto">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-3d animate-float"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 20px 40px rgba(79,70,229,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
                transform: 'perspective(200px) rotateX(8deg)',
              }}
            >
              DH
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <div className="absolute -top-1 -left-1 w-20 h-10 bg-white/20 rotate-12 blur-sm" />
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Chào mừng trở lại
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Đăng nhập để quản lý phòng trọ
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-3xl shadow-glass p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Số điện thoại hoặc email"
              type="text"
              placeholder="0912 345 678 hoặc email"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              inputMode="text"
              autoComplete="username"
              required
            />

            <Input
              label="Mật khẩu"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium animate-scale-in">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={isLoading} className="mt-2 shadow-3d">
              Đăng nhập
            </Button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <p className="text-center text-xs text-slate-400">
              Tài khoản được cấp bởi chủ trọ
            </p>
            <p className="text-center text-xs text-slate-400 mt-0.5">
              Mật khẩu mặc định:{' '}
              <span className="font-bold text-slate-600 dark:text-slate-300">123456</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          DH v1.0 — Quản lý phòng trọ thông minh
        </p>
      </div>
    </div>
  )
}
