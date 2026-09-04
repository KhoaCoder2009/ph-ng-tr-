import { supabase } from '@/lib/supabase'
import type { ElectricityReading } from '@/types'

function mapReading(row: Record<string, unknown>): ElectricityReading {
  const readingDate = String(row.reading_date ?? '')
  const [periodYear, periodMonth] = readingDate.split('-').map(Number)
  return {
    ...row,
    period_month: Number(row.period_month ?? periodMonth ?? 0),
    period_year: Number(row.period_year ?? periodYear ?? 0),
    old_reading: Number(row.old_reading ?? row.previous_reading ?? 0),
    new_reading: Number(row.new_reading ?? row.current_reading ?? 0),
    unit_price: Number(row.unit_price ?? row.price_per_unit ?? 0),
    consumption: Number(row.consumption ?? 0),
    total_amount: Number(row.total_amount ?? row.total_cost ?? 0),
  } as ElectricityReading
}

function dedupeReadings(readings: ElectricityReading[]): ElectricityReading[] {
  const byPeriod = new Map<string, ElectricityReading>()
  for (const reading of readings) {
    const key = `${reading.room_id}-${reading.period_year}-${reading.period_month}`
    if (!byPeriod.has(key)) byPeriod.set(key, reading)
  }
  return [...byPeriod.values()]
}

export const electricityService = {
  /** Lấy lịch sử điện theo phòng */
  async getByRoom(roomId: string, limit = 12): Promise<ElectricityReading[]> {
    const { data, error } = await supabase
      .from('electricity_readings')
      .select('*')
      .eq('room_id', roomId)
      .order('reading_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return dedupeReadings((data ?? []).map((row) => mapReading(row as Record<string, unknown>)))
  },

  /** Lấy lịch sử điện trong một năm của phòng */
  async getByRoomAndYear(roomId: string, year: number): Promise<ElectricityReading[]> {
    const { data, error } = await supabase
      .from('electricity_readings')
      .select('*')
      .eq('room_id', roomId)
      .gte('reading_date', `${year}-01-01`)
      .lt('reading_date', `${year + 1}-01-01`)
      .order('reading_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return dedupeReadings((data ?? []).map((row) => mapReading(row as Record<string, unknown>)))
  },

  /** Lấy chỉ số điện mới nhất của phòng */
  async getLatest(roomId: string): Promise<ElectricityReading | null> {
    const { data, error } = await supabase
      .from('electricity_readings')
      .select('*')
      .eq('room_id', roomId)
      .order('reading_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapReading(data as Record<string, unknown>) : null
  },

  /** Lấy chỉ số điện theo kỳ cụ thể */
  async getByPeriod(roomId: string, month: number, year: number): Promise<ElectricityReading | null> {
    const { data, error } = await supabase
      .from('electricity_readings')
      .select('*')
      .eq('room_id', roomId)
      .gte('reading_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('reading_date', `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
      .order('reading_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapReading(data as Record<string, unknown>) : null
  },

  /** Nhập chỉ số điện mới */
  async create(reading: {
    room_id: string
    period_month: number
    period_year: number
    old_reading: number
    new_reading: number
    unit_price: number
  }): Promise<ElectricityReading> {
    // Validate: chỉ số mới phải >= chỉ số cũ
    if (reading.new_reading < reading.old_reading) {
      throw new Error('Chỉ số mới không được nhỏ hơn chỉ số cũ')
    }

    const existing = await this.getByPeriod(reading.room_id, reading.period_month, reading.period_year)
    if (existing) {
      return this.update(existing.id, reading)
    }

    const { data, error } = await supabase
      .from('electricity_readings')
      .insert({
        room_id: reading.room_id,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        reading_date: `${reading.period_year}-${String(reading.period_month).padStart(2, '0')}-01`,
        previous_reading: reading.old_reading,
        current_reading: reading.new_reading,
        price_per_unit: reading.unit_price,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapReading(data as Record<string, unknown>)
  },

  /** Cập nhật chỉ số điện */
  async update(id: string, updates: Partial<ElectricityReading>): Promise<ElectricityReading> {
    const payload: Record<string, unknown> = {}
    if (updates.room_id !== undefined) payload.room_id = updates.room_id
    if (updates.period_month !== undefined && updates.period_year !== undefined) {
      payload.reading_date = `${updates.period_year}-${String(updates.period_month).padStart(2, '0')}-01`
    }
    if (updates.old_reading !== undefined) payload.previous_reading = updates.old_reading
    if (updates.new_reading !== undefined) payload.current_reading = updates.new_reading
    if (updates.unit_price !== undefined) payload.price_per_unit = updates.unit_price
    if (updates.old_reading !== undefined && updates.new_reading !== undefined) {
      if (updates.new_reading < updates.old_reading) {
        throw new Error('Chỉ số mới không được nhỏ hơn chỉ số cũ')
      }
    }
    const { data, error } = await supabase
      .from('electricity_readings')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapReading(data as Record<string, unknown>)
  },

  /** Lấy tất cả chỉ số theo kỳ (cho chủ trọ xem tổng) */
  async getAllByPeriod(month: number, year: number): Promise<ElectricityReading[]> {
    const { data, error } = await supabase
      .from('electricity_readings')
      .select('*, room:rooms(room_code)')
      .gte('reading_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lt('reading_date', `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return dedupeReadings((data ?? []).map((row) => mapReading(row as Record<string, unknown>)))
  },
}
