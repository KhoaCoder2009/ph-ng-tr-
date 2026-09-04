import { cn } from '@/utils/cn'
import type { InvoiceStatus, RoomStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    info:    'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  }
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold rounded-full border', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={status === 'paid' ? 'success' : 'warning'}>
      {status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
    </Badge>
  )
}

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return (
    <Badge variant={status === 'occupied' ? 'success' : 'neutral'}>
      {status === 'occupied' ? '🟢 Đang thuê' : '⚪ Trống'}
    </Badge>
  )
}
