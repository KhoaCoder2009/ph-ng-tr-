import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4 animate-float">
          {icon}
        </div>
      )}
      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-400 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
