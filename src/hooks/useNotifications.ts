import { useState, useEffect, useCallback, useRef } from 'react'
import { notificationService } from '@/services/notificationService'
import type { Notification } from '@/types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof notificationService.subscribeToUser> | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [data, count] = await Promise.all([
        notificationService.getByUser(userId),
        notificationService.getUnreadCount(userId),
      ])
      setNotifications(data)
      setUnreadCount(count)
    } catch (err) {
      console.error('[useNotifications] fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  // Realtime subscription — không crash app nếu bị lỗi
  useEffect(() => {
    if (!userId) return

    try {
      channelRef.current = notificationService.subscribeToUser(userId, (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev])
        setUnreadCount((c) => c + 1)
      })
    } catch (e) {
      console.warn('[useNotifications] could not subscribe realtime:', e)
    }

    return () => {
      try {
        channelRef.current?.unsubscribe()
      } catch { /* ignore cleanup errors */ }
    }
  }, [userId])

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (e) {
      console.error('[useNotifications] markRead error:', e)
    }
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    try {
      await notificationService.markAllRead(userId)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error('[useNotifications] markAllRead error:', e)
    }
  }, [userId])

  return { notifications, unreadCount, isLoading, refetch: fetch, markRead, markAllRead }
}
