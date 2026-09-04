import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  glass?: boolean
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, glass = true, hover = false, onClick, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' }
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-all duration-200',
        glass
          ? 'bg-white/85 dark:bg-dark-card/85 backdrop-blur-md border-white/60 dark:border-slate-800/60 shadow-glass'
          : 'bg-white dark:bg-dark-card border-slate-200 dark:border-slate-800',
        hover && 'cursor-pointer hover:-translate-y-1 hover:shadow-3d active:scale-95 hover:border-brand-300 dark:hover:border-brand-700',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}
