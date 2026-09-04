import { useState, useEffect, useCallback } from 'react'
import { dashboardService } from '@/services/dashboardService'
import type { DashboardStats, MonthlyRevenue } from '@/types'
import { getCurrentPeriod } from '@/utils/format'

export function useDashboard() {
  const { month, year } = getCurrentPeriod()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [s, rev] = await Promise.all([
        dashboardService.getStats(month, year),
        dashboardService.getMonthlyRevenue(year),
      ])
      setStats(s)
      setMonthlyRevenue(rev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => { fetch() }, [fetch])

  return { stats, monthlyRevenue, isLoading, error, refetch: fetch }
}
