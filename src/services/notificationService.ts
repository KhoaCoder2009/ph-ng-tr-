import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    ...row,
    body: String(row.body ?? row.message ?? ''),
    is_read: Boolean(row.is_read ?? row.read ?? false),
    related_id: row.related_id ?? row.link,
  } as Notification
}

export const notificationService = {
  async getByUser(userId: string, limit = 30): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('[Notifications] getByUser error:', error.message)
      return []
    }
    return (data ?? []).map((row) => mapNotification(row as Record<string, unknown>))
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) return 0
    return count ?? 0
  },

  async markRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  },

  async markAllRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  },

  /**
   * Subscribe realtime — bọc try/catch để không crash app
   * nếu Supabase Realtime chưa được bật cho table notifications
   */
  subscribeToUser(userId: string, callback: (notification: Notification) => void) {
    try {
      const channel = supabase
        .channel(`notifications:user:${userId}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              callback(mapNotification(payload.new as Record<string, unknown>))
            } catch (e) {
              console.error('[Notifications] realtime callback error:', e)
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('[Notifications] realtime subscribe error (non-critical):', err.message)
          }
        })
      return channel
    } catch (e) {
      console.warn('[Notifications] realtime not available:', e)
      // Trả về object giả để cleanup không bị lỗi
      return { unsubscribe: () => {} } as ReturnType<typeof supabase.channel>
    }
  },
}
