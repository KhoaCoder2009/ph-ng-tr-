import { supabase } from '@/lib/supabase'
import type { BankSettings } from '@/types'

export const bankSettingsService = {
  async get(): Promise<BankSettings | null> {
    const { data } = await supabase
      .from('bank_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data as BankSettings | null
  },

  async upsert(settings: Partial<BankSettings>): Promise<BankSettings> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Phiên đăng nhập đã hết hạn')
    const existing = await bankSettingsService.get()
    const { branch: _branch, owner_id: _ownerId, ...persistedSettings } = settings
    if (existing) {
      const { data, error } = await supabase
        .from('bank_settings')
        .update({ ...persistedSettings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as BankSettings
    } else {
      const { data, error } = await supabase
        .from('bank_settings')
        .insert({ ...persistedSettings, owner_id: user.id })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as BankSettings
    }
  },
}
