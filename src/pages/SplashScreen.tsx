import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'out'>('logo')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 400)
    const t2 = setTimeout(() => setPhase('out'), 1800)
    const t3 = setTimeout(() => onComplete(), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div
      className={`
        fixed inset-0 z-[200] flex flex-col items-center justify-center
        bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600
        transition-opacity duration-500
        ${phase === 'out' ? 'opacity-0' : 'opacity-100'}
      `}
    >
      {/* Background blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />

      {/* Logo 3D */}
      <div
        className={`
          relative w-24 h-24 rounded-3xl
          bg-white/20 backdrop-blur-xl border border-white/30
          flex items-center justify-center
          shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_40px_rgba(255,255,255,0.1)]
          transition-all duration-700
          ${phase === 'logo' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${phase === 'out' ? 'scale-110' : ''}
        `}
        style={{ transform: phase !== 'logo' ? 'scale(1) perspective(400px) rotateX(5deg)' : 'scale(0)' }}
      >
        {/* Inner glow */}
        <div className="absolute inset-1 rounded-2xl bg-white/10" />
        <span className="relative text-white font-black text-4xl tracking-tight z-10">DH</span>
        {/* Shine */}
        <div className="absolute top-2 left-3 w-16 h-4 bg-white/20 rounded-full blur-sm rotate-12" />
      </div>

      {/* Text */}
      <div
        className={`
          mt-6 text-center
          transition-all duration-500 delay-200
          ${phase === 'logo' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
        `}
      >
        <p className="text-white/90 text-sm font-semibold tracking-widest uppercase">
          Quản lý phòng trọ thông minh
        </p>
      </div>

      {/* Loading dots */}
      <div
        className={`
          mt-12 flex gap-2
          transition-all duration-500 delay-300
          ${phase === 'logo' ? 'opacity-0' : 'opacity-100'}
        `}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
