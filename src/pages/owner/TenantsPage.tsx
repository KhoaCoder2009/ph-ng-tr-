import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, User, Phone, Calendar, DollarSign, Home, KeyRound, Trash2 } from 'lucide-react'
import { Header }        from '@/components/layout/Header'
import { Card }          from '@/components/ui/Card'
import { Button }        from '@/components/ui/Button'
import { Modal }         from '@/components/ui/Modal'
import { Input }         from '@/components/ui/Input'
import { Select }        from '@/components/ui/Select'
import { EmptyState }    from '@/components/ui/EmptyState'
import { CardSkeleton }  from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { tenantService } from '@/services/tenantService'
import { roomService }   from '@/services/roomService'
import { useUIStore }    from '@/store/uiStore'
import { formatMoney, formatDate } from '@/utils/format'
import type { Tenant, Room } from '@/types'

export function TenantsPage() {
  const [searchParams] = useSearchParams()
  const roomFilter = searchParams.get('room_id')
  const { addToast } = useUIStore()
  const [tenants, setTenants]           = useState<Tenant[]>([])
  const [rooms, setRooms]               = useState<Room[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [resetModal, setResetModal]     = useState<Tenant | null>(null)
  const [deleteModal, setDeleteModal]   = useState<Tenant | null>(null)
  const [saving, setSaving]             = useState(false)
  const [newPwd, setNewPwd]             = useState('123456')

  const [form, setForm] = useState({
    full_name: '', phone: '', room_id: '',
    deposit: '', start_date: new Date().toISOString().slice(0,10),
    password: '123456',
  })

  const load = async () => {
    setIsLoading(true)
    try {
      const [t, r] = await Promise.all([tenantService.getAll(), roomService.getAll()])
      setTenants(t)
      setRooms(r)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const vacantRooms = rooms.filter(r => r.status === 'vacant')

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.room_id || form.deposit === '') {
      return addToast('Vui lòng nhập đầy đủ thông tin', 'error')
    }
    if (!Number.isFinite(Number(form.deposit)) || Number(form.deposit) < 0) {
      return addToast('Tiền cọc không hợp lệ', 'error')
    }
    setSaving(true)
    try {
      await tenantService.createWithAccount({
        phone: form.phone, fullName: form.full_name,
        roomId: form.room_id, deposit: Number(form.deposit),
        startDate: form.start_date, password: form.password,
      })
      addToast(`Đã tạo tài khoản cho ${form.full_name}`, 'success')
      setShowModal(false)
      setForm({ full_name:'', phone:'', room_id:'', deposit:'', start_date: new Date().toISOString().slice(0,10), password:'123456' })
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tạo tài khoản', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPwd = async () => {
    if (!resetModal) return
    setSaving(true)
    try {
      await tenantService.resetPassword(resetModal.id, newPwd)
      addToast('Đã đổi mật khẩu thành công', 'success')
      setResetModal(null)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể đổi mật khẩu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setSaving(true)
    try {
      await tenantService.deleteWithAccount(deleteModal.id)
      addToast(`Đã xóa người thuê ${deleteModal.full_name} và tài khoản đăng nhập`, 'success')
      setDeleteModal(null)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể xóa người thuê', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-enter">
      <Header title="Người thuê" rightSlot={
        <Button size="sm" onClick={() => setShowModal(true)} leftIcon={<UserPlus className="w-4 h-4" />}>Thêm</Button>
      } />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i) => <CardSkeleton key={i} />)}</div>
        ) : tenants.filter((tenant) => !roomFilter || tenant.room_id === roomFilter).length === 0 ? (
          <EmptyState
            icon={<User className="w-6 h-6" />}
            title="Chưa có người thuê"
            description="Tạo tài khoản người thuê để họ có thể đăng nhập vào app"
            action={<Button onClick={() => setShowModal(true)} leftIcon={<UserPlus className="w-4 h-4" />}>Thêm người thuê</Button>}
          />
        ) : (
          <div className="space-y-3">
            {tenants.filter((tenant) => !roomFilter || tenant.room_id === roomFilter).map(tenant => {
              const room = tenant.room as Room | undefined
              return (
                <Card key={tenant.id} className="card-3d">
                  <div className="flex items-start justify-between">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white font-black text-base shadow-3d">
                        {tenant.full_name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{tenant.full_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {tenant.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setResetModal(tenant); setNewPwd('123456') }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 active:scale-95 transition-all"
                        title="Đổi mật khẩu"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal(tenant)}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:text-red-700 active:scale-95 transition-all"
                        title="Xóa người thuê và tài khoản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Home className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Phòng <span className="font-bold text-slate-700 dark:text-slate-300">{room?.room_code ?? '?'}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cọc <span className="font-bold text-slate-700 dark:text-slate-300">{formatMoney(tenant.deposit)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-brand-500" />
                      <span>Từ <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(tenant.start_date)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                      <span>Giá <span className="font-bold text-slate-700 dark:text-slate-300">{formatMoney(room?.price ?? 0)}</span></span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create tenant modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Thêm người thuê mới">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-xs text-brand-700 dark:text-brand-300 font-medium">
            💡 Hệ thống sẽ tự tạo tài khoản đăng nhập cho người thuê với SĐT và mật khẩu cung cấp.
          </div>
          <Input label="Họ và tên" placeholder="Nguyễn Văn A" value={form.full_name} onChange={e=>setForm(s=>({...s,full_name:e.target.value}))} leftIcon={<User className="w-4 h-4"/>} />
          <Input label="Số điện thoại (dùng để đăng nhập)" type="tel" placeholder="0912345678" value={form.phone} onChange={e=>setForm(s=>({...s,phone:e.target.value}))} leftIcon={<Phone className="w-4 h-4"/>} />
          <Select
            label="Phòng"
            placeholder="-- Chọn phòng --"
            value={form.room_id}
            onChange={e=>setForm(s=>({...s,room_id:e.target.value}))}
            options={vacantRooms.map(r=>({ value: r.id, label: `Phòng ${r.room_code} — ${formatMoney(r.price)}/tháng` }))}
          />
          {vacantRooms.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Không có phòng trống nào.</p>
          )}
          <Input label="Tiền cọc (đ)" type="number" placeholder="5000000" value={form.deposit} onChange={e=>setForm(s=>({...s,deposit:e.target.value}))} leftIcon={<DollarSign className="w-4 h-4"/>} />
          <Input label="Ngày bắt đầu thuê" type="date" value={form.start_date} onChange={e=>setForm(s=>({...s,start_date:e.target.value}))} leftIcon={<Calendar className="w-4 h-4"/>} />
          <Input label="Mật khẩu ban đầu" value={form.password} onChange={e=>setForm(s=>({...s,password:e.target.value}))} hint="Người thuê có thể đổi mật khẩu sau khi đăng nhập" />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleCreate} leftIcon={<UserPlus className="w-4 h-4"/>}>Tạo tài khoản</Button>
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title="Đổi mật khẩu" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Đổi mật khẩu cho <span className="font-bold text-slate-900 dark:text-white">{resetModal?.full_name}</span></p>
          <Input label="Mật khẩu mới" value={newPwd} onChange={e=>setNewPwd(e.target.value)} leftIcon={<KeyRound className="w-4 h-4"/>} />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setResetModal(null)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleResetPwd}>Lưu</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Xóa người thuê và tài khoản?"
        description={`Thao tác này sẽ xóa ${deleteModal?.full_name ?? 'người thuê'}, tài khoản đăng nhập và trả phòng về trạng thái trống.`}
        confirmLabel="Xóa vĩnh viễn"
        loading={saving}
      />
    </div>
  )
}
