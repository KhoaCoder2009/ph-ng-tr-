import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none'

    const variants = {
      primary:   'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25 focus:ring-brand-500 disabled:bg-brand-400',
      secondary: 'bg-accent-600 hover:bg-accent-700 text-white shadow-md shadow-accent-600/25 focus:ring-accent-500',
      ghost:     'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-400',
      danger:    'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 focus:ring-red-500',
      success:   'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 focus:ring-emerald-500',
      outline:   'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-400',
    }

    const sizes = {
      sm: 'text-xs px-3 py-2 min-h-[34px]',
      md: 'text-sm px-4 py-2.5 min-h-[42px]',
      lg: 'text-base px-6 py-3.5 min-h-[52px]',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', (disabled || loading) && 'opacity-60 cursor-not-allowed', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)
Button.displayName = 'Button'
