import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CreateTenantRequest = {
  email: string
  password: string
  fullName: string
  phone: string
  roomId: string
  deposit: number
  startDate: string
}

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: 'Thiếu cấu hình Supabase server' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) return response({ error: 'Chưa đăng nhập' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return response({ error: 'Phiên đăng nhập đã hết hạn' }, 401)

  const { data: ownerProfile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileError || ownerProfile?.role !== 'owner') {
    return response({ error: 'Chỉ chủ trọ mới có thể tạo tài khoản người thuê' }, 403)
  }

  let input: CreateTenantRequest
  try {
    input = await request.json()
  } catch {
    return response({ error: 'Dữ liệu gửi lên không hợp lệ' }, 400)
  }

  if (!input.email || !input.password || !input.fullName || !input.phone || !input.roomId || !input.startDate) {
    return response({ error: 'Vui lòng nhập đầy đủ thông tin' }, 400)
  }
  if (input.password.length < 6) return response({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, 400)
  if (!Number.isFinite(input.deposit) || input.deposit < 0) {
    return response({ error: 'Tiền cọc không hợp lệ' }, 400)
  }

  const { data: room, error: roomError } = await userClient
    .from('rooms')
    .select('id')
    .eq('id', input.roomId)
    .eq('owner_id', user.id)
    .eq('status', 'vacant')
    .single()
  if (roomError || !room) return response({ error: 'Phòng không tồn tại hoặc không còn trống' }, 400)

  const { data: activeTenant, error: activeTenantError } = await userClient
    .from('tenants')
    .select('id')
    .eq('room_id', input.roomId)
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (activeTenantError) return response({ error: activeTenantError.message }, 400)
  if (activeTenant) return response({ error: 'Phòng này đã có người thuê đang hoạt động' }, 400)

  const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone, role: 'tenant' },
  })
  if (createUserError || !authData.user) {
    return response({ error: createUserError?.message ?? 'Không thể tạo tài khoản' }, 400)
  }

  const tenantUserId = authData.user.id
  try {
    const { error: profileInsertError } = await adminClient.from('profiles').upsert({
      id: tenantUserId,
      full_name: input.fullName,
      phone: input.phone,
      role: 'tenant',
    })
    if (profileInsertError) throw profileInsertError

    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        room_id: input.roomId,
        user_id: tenantUserId,
        owner_id: user.id,
        full_name: input.fullName,
        phone: input.phone,
        move_in_date: input.startDate,
        deposit_amount: input.deposit,
        is_active: true,
      })
      .select('id')
      .single()
    if (tenantError || !tenant) throw tenantError ?? new Error('Không thể tạo người thuê')

    const { error: roomUpdateError } = await adminClient
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', input.roomId)
      .eq('owner_id', user.id)
    if (roomUpdateError) throw roomUpdateError

    return response({ success: true, tenant_id: tenant.id, user_id: tenantUserId })
  } catch (error) {
    await adminClient.auth.admin.deleteUser(tenantUserId)
    return response({ error: error instanceof Error ? error.message : 'Không thể tạo người thuê' }, 400)
  }
})