import { cn } from '@/utils/cn'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800', className)} />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}
