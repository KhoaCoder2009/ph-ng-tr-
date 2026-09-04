import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthState {
  user: { id: string; email?: string; phone?: string } | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  error: string | null
  initialized: boolean

  initialize: () => Promise<void>
  signIn: (phone: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  refreshProfile: () => Promise<void>
}

// Supabase Auth yêu cầu email format
// Nếu input có @ thì coi như email, không thì chuyển phone => phone@hotel.local
function normalizeCredentials(input: string): string[] {
  if (input.includes('@')) {
    return [input]
  }
  const clean = input.replace(/\D/g, '')
  return [`${clean}@hotel.local`, `${clean}@dh.local`]
}

let authSubscription: { unsubscribe: () => void } | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: null,
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        set({
          user: session.user,
          profile,
          role: profile?.role ?? null,
          initialized: true,
          isLoading: false,
        })
      } else {
        set({ initialized: true, isLoading: false })
      }

      authSubscription?.unsubscribe()
      const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id)
          set({ user: session.user, profile, role: profile?.role ?? null })
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, role: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          set({ user: session.user })
        }
      })
      authSubscription = subscription.subscription
    } catch (err) {
      console.error('[Auth] Initialize error:', err)
      set({ initialized: true, isLoading: false, error: 'Lỗi khởi tạo phiên đăng nhập' })
    }
  },

  signIn: async (phone: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const emails = normalizeCredentials(phone)
      let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'] = { user: null, session: null }
      let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error'] = null

      for (const email of emails) {
        const result = await supabase.auth.signInWithPassword({ email, password })
        data = result.data
        error = result.error
        if (!error) break
        if (!error.message.toLowerCase().includes('invalid login')) break
      }

      if (error) {
        console.error('[Auth] SignIn error:', error)
        let msg = 'Đăng nhập thất bại'
        if (error.message.includes('Invalid login')) msg = 'Số điện thoại hoặc mật khẩu không đúng'
        else if (error.message.includes('Email not confirmed')) msg = 'Tài khoản chưa được kích hoạt'
        else msg = `${msg}: ${error.message}`
        set({ error: msg, isLoading: false })
        return
      }

      console.log('[Auth] Login successful, user:', data.user?.id)

      if (data.user) {
        console.log('[Auth] Fetching profile for user:', data.user.id)
        const profile = await fetchProfile(data.user.id)
        console.log('[Auth] Profile fetched:', profile)
        
        if (!profile) {
          console.error('[Auth] Profile not found for user:', data.user.id)
          set({ error: 'Không tìm thấy thông tin người dùng', isLoading: false })
          return
        }
        
        set({ user: data.user, profile, role: profile?.role ?? null, isLoading: false })
      }
    } catch (err) {
      console.error('[Auth] SignIn exception:', err)
      set({ error: 'Không thể kết nối. Vui lòng thử lại.', isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: null, isLoading: false })
  },

  clearError: () => set({ error: null }),

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const profile = await fetchProfile(user.id)
    set({ profile, role: profile?.role ?? null })
  },
}))

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] fetchProfile error:', error)
      return null
    }
    return data as Profile
  } catch {
    return null
  }
}
