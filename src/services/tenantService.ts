import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/types'

// phone@dh.local format cho Supabase Auth
function phoneToEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@hotel.local`
}

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    ...row,
    user_id: String(row.user_id ?? ''),
    deposit: Number(row.deposit ?? row.deposit_amount ?? 0),
    start_date: String(row.start_date ?? row.move_in_date ?? ''),
  } as Tenant
}

export const tenantService = {
  /** Lấy tất cả tenant (có join room) */
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, room:rooms(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => mapTenant(row as Record<string, unknown>))
  },

  /** Lấy tenant theo room_id */
  async getByRoom(roomId: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, room:rooms(*)')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapTenant(data as Record<string, unknown>) : null
  },

  /** Lấy tenant theo user_id (dùng cho người thuê đăng nhập) */
  async getByUserId(userId: string): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, room:rooms(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapTenant(data as Record<string, unknown>) : null
  },

  /**
   * Tạo tài khoản người thuê mới
   * - Tạo auth user với phone@dh.local + password mặc định
   * - Tạo profile
   * - Tạo tenant record
   * - Cập nhật room status -> occupied
   */
  async createWithAccount(params: {
    phone: string
    fullName: string
    roomId: string
    deposit: number
    startDate: string
    password?: string
  }): Promise<Tenant> {
    const { phone, fullName, roomId, deposit, startDate, password = '123456' } = params
    const email = phoneToEmail(phone)

    // Auth admin operations must run in the server-side Edge Function.
    const { data: rpcData, error: rpcError } = await supabase.functions.invoke('create-tenant-account', {
      body: { email, password, fullName, phone, roomId, deposit, startDate },
    })

    if (rpcError) throw new Error(rpcError.message)
    if (!rpcData?.success) throw new Error(rpcData?.error ?? 'Không thể tạo tài khoản')

    // Fetch tenant vừa tạo
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('*, room:rooms(*)')
      .eq('id', rpcData.tenant_id)
      .single()

    if (fetchError) throw new Error(fetchError.message)
    return mapTenant(tenant as Record<string, unknown>)
  },

  /** Cập nhật thông tin tenant */
  async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, room:rooms(*)')
      .single()
    if (error) throw new Error(error.message)
    return mapTenant(data as Record<string, unknown>)
  },

  /** Kết thúc thuê (deactivate, cập nhật phòng -> vacant) */
  async deactivate(id: string, roomId: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)

    await supabase.from('rooms').update({ status: 'vacant', updated_at: new Date().toISOString() }).eq('id', roomId)
  },

  /** Đổi mật khẩu người thuê (chủ trọ dùng) */
  async resetPassword(tenantId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.rpc('reset_tenant_password', {
      p_tenant_id: tenantId,
      p_new_password: newPassword,
    })
    if (error) throw new Error(error.message)
  },

  async deleteWithAccount(tenantId: string): Promise<void> {
    const { data, error } = await supabase.rpc('delete_tenant_account', {
      p_tenant_id: tenantId,
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.error ?? 'Không thể xóa người thuê')
  },
}
