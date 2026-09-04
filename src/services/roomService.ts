import { supabase } from '@/lib/supabase'
import type { Room } from '@/types'

export const roomService = {
  /** Lấy toàn bộ danh sách phòng */
  async getAll(): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_code', { ascending: true })
    if (error) throw new Error(error.message)
    return data as Room[]
  },

  /** Lấy chi tiết 1 phòng */
  async getById(id: string): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data as Room
  },

  /** Thêm phòng mới */
  async create(room: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Phiên đăng nhập đã hết hạn')
    const { data, error } = await supabase
      .from('rooms')
      .insert({ ...room, owner_id: user.id })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Room
  },

  /** Cập nhật phòng */
  async update(id: string, updates: Partial<Room>): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Room
  },

  /** Xóa phòng - chỉ được xóa khi không có tenant active */
  async delete(id: string): Promise<void> {
    // Kiểm tra xem phòng có tenant đang ở không
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('room_id', id)
      .eq('is_active', true)
      .limit(1)

    if (tenants && tenants.length > 0) {
      throw new Error('Không thể xóa phòng đang có người thuê')
    }

    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
