import { createClient } from '@supabase/supabase-js'

type TenantRequest = {
  email: string
  password: string
  fullName: string
  phone: string
  roomId: string
  deposit: number
  startDate: string
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: 'Thiếu biến môi trường Supabase trên Vercel' })
  }

  const authorization = req.headers.authorization
  if (!authorization) return res.status(401).json({ error: 'Chưa đăng nhập' })

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' })

  const { data: profile, error: profileError } = await userClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profileError || profile?.role !== 'owner') {
    return res.status(403).json({ error: 'Chỉ chủ trọ mới có thể tạo tài khoản người thuê' })
  }

  const input = req.body as TenantRequest
  if (!input?.email || !input.password || !input.fullName?.trim() || !input.phone?.trim() || !input.roomId || !input.startDate) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' })
  }
  if (input.password.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' })
  if (!Number.isFinite(input.deposit) || input.deposit < 0) return res.status(400).json({ error: 'Tiền cọc không hợp lệ' })

  const { data: room } = await userClient
    .from('rooms').select('id').eq('id', input.roomId).eq('owner_id', user.id).eq('status', 'vacant').single()
  if (!room) return res.status(400).json({ error: 'Phòng không tồn tại hoặc không còn trống' })

  const { data: existingTenant } = await userClient
    .from('tenants').select('id').eq('room_id', input.roomId).eq('owner_id', user.id).eq('is_active', true).limit(1).maybeSingle()
  if (existingTenant) return res.status(400).json({ error: 'Phòng này đã có người thuê đang hoạt động' })

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone, role: 'tenant' },
  })
  if (authError || !authData.user) return res.status(400).json({ error: authError?.message ?? 'Không thể tạo tài khoản' })

  const tenantUserId = authData.user.id
  try {
    const { error: profileInsertError } = await adminClient.from('profiles').upsert({
      id: tenantUserId, full_name: input.fullName, phone: input.phone, role: 'tenant',
    })
    if (profileInsertError) throw profileInsertError

    const { data: tenant, error: tenantError } = await adminClient.from('tenants').insert({
      room_id: input.roomId, user_id: tenantUserId, owner_id: user.id,
      full_name: input.fullName, phone: input.phone, move_in_date: input.startDate,
      deposit_amount: input.deposit, is_active: true,
    }).select('id').single()
    if (tenantError || !tenant) throw tenantError ?? new Error('Không thể tạo người thuê')

    const { error: roomUpdateError } = await adminClient.from('rooms')
      .update({ status: 'occupied' }).eq('id', input.roomId).eq('owner_id', user.id)
    if (roomUpdateError) throw roomUpdateError

    return res.status(200).json({ success: true, tenant_id: tenant.id, user_id: tenantUserId })
  } catch (error) {
    await adminClient.auth.admin.deleteUser(tenantUserId)
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Không thể tạo người thuê' })
  }
}