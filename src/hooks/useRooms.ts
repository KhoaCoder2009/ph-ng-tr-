import { useState, useEffect, useCallback } from 'react'
import { roomService } from '@/services/roomService'
import { tenantService } from '@/services/tenantService'
import type { Room } from '@/types'

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [data, tenants] = await Promise.all([
        roomService.getAll(),
        tenantService.getAll(),
      ])
      const tenantsByRoom = new Map(tenants.map((tenant) => [tenant.room_id, tenant]))
      setRooms(data.map((room) => ({ ...room, tenant: tenantsByRoom.get(room.id) })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách phòng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { rooms, isLoading, error, refetch: fetch, setRooms }
}
