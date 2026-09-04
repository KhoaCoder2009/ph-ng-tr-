import { useState } from 'react'
import { Plus, Home, Edit2, Trash2, Zap, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header }          from '@/components/layout/Header'
import { Card }            from '@/components/ui/Card'
import { Button }          from '@/components/ui/Button'
import { Modal }           from '@/components/ui/Modal'
import { Input }           from '@/components/ui/Input'
import { ConfirmDialog }   from '@/components/ui/ConfirmDialog'
import { RoomStatusBadge } from '@/components/ui/Badge'
import { EmptyState }      from '@/components/ui/EmptyState'
import { CardSkeleton }    from '@/components/ui/Skeleton'
import { useRooms }        from '@/hooks/useRooms'
import { roomService }     from '@/services/roomService'
import { useUIStore }      from '@/store/uiStore'
import { formatMoney }     from '@/utils/format'
import type { Room }       from '@/types'

type Filter = 'all' | 'occupied' | 'vacant'

export function RoomsPage() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { rooms, isLoading, error, refetch } = useRooms()

  const [filter, setFilter]           = useState<Filter>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRoom, setEditRoom]        = useState<Room | null>(null)
  const [deleteRoom, setDeleteRoom]    = useState<Room | null>(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)

  // Form state
  const [form, setForm] = useState({
    room_code: '', price: '', internet_fee: '100000',
    garbage_fee: '20000', elec_unit_price: '3500', notes: '',
  })

  const filtered = rooms.filter(r =>
    filter === 'all' ? true : r.status === filter
  )

  const openAdd = () => {
    setForm({ room_code: '', price: '', internet_fee: '100000', garbage_fee: '20000', elec_unit_price: '3500', notes: '' })
    setEditRoom(null)
    setShowAddModal(true)
  }

  const openEdit = (room: Room) => {
    setForm({
      room_code: room.room_code, price: String(room.price),
      internet_fee: String(room.internet_fee), garbage_fee: String(room.garbage_fee),
      elec_unit_price: String(room.elec_unit_price), notes: room.notes ?? '',
    })
    setEditRoom(room)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.room_code.trim() || !form.price) return addToast('Vui lòng nhập đầy đủ thông tin', 'error')
    setSaving(true)
    try {
      const payload = {
        room_code: form.room_code.trim(),
        price: Number(form.price),
        internet_fee: Number(form.internet_fee),
        garbage_fee: Number(form.garbage_fee),
        elec_unit_price: Number(form.elec_unit_price),
        notes: form.notes,
        status: 'vacant' as const,
      }
      if (editRoom) {
        await roomService.update(editRoom.id, payload)
        addToast(`Đã cập nhật phòng ${form.room_code}`, 'success')
      } else {
        await roomService.create(payload)
        addToast(`Đã thêm phòng ${form.room_code}`, 'success')
      }
      setShowAddModal(false)
      refetch()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Có lỗi xảy ra', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRoom) return
    setDeleting(true)
    try {
      await roomService.delete(deleteRoom.id)
      addToast(`Đã xóa phòng ${deleteRoom.room_code}`, 'success')
      setDeleteRoom(null)
      refetch()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể xóa phòng', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-enter">
      <Header title="Phòng trọ" rightSlot={
        <Button size="sm" onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>Thêm phòng</Button>
      } />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all','occupied','vacant'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {f === 'all' ? `Tất cả (${rooms.length})`
                : f === 'occupied' ? `Đang thuê (${rooms.filter(r=>r.status==='occupied').length})`
                : `Trống (${rooms.filter(r=>r.status==='vacant').length})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 text-sm">
            {error} — <button onClick={refetch} className="underline font-semibold">Thử lại</button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Home className="w-6 h-6" />}
            title={filter === 'all' ? 'Chưa có phòng trọ' : 'Không có phòng nào'}
            description={filter === 'all' ? 'Bắt đầu bằng cách thêm phòng đầu tiên' : undefined}
            action={filter === 'all' ? <Button onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>Thêm phòng</Button> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map(room => (
              <Card key={room.id} className="card-3d space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Phòng {room.room_code}
                    </h3>
                  </div>
                  <RoomStatusBadge status={room.status} />
                </div>

                {/* Price */}
                <p className="text-lg font-black text-brand-600 dark:text-brand-400">
                  {formatMoney(room.price)}
                  <span className="text-xs font-normal text-slate-400">/tháng</span>
                </p>

                <div className="min-h-9 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs">
                  {room.tenant ? (
                    <>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{room.tenant.full_name}</p>
                      <p className="text-slate-500 dark:text-slate-400">{room.tenant.phone}</p>
                    </>
                  ) : (
                    <p className="text-slate-400">Chưa có người thuê</p>
                  )}
                </div>

                {/* Fees */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>⚡ Điện: <b className="text-slate-700 dark:text-slate-300">{room.elec_unit_price.toLocaleString('vi-VN')}đ/kWh</b></span>
                  <span>📶 Net: <b className="text-slate-700 dark:text-slate-300">{formatMoney(room.internet_fee)}</b></span>
                  <span>🗑️ Rác: <b className="text-slate-700 dark:text-slate-300">{formatMoney(room.garbage_fee)}</b></span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => navigate('/owner/invoices')}
                    className="flex-1 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Hóa đơn
                  </button>
                  <button
                    onClick={() => navigate(`/owner/tenants?room_id=${room.id}`)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1"
                    title={room.tenant ? `Người thuê: ${room.tenant.full_name}` : 'Phòng đang trống'}
                  >
                    <Users className="w-3.5 h-3.5" /> {room.tenant?.full_name ?? 'Trống'}
                  </button>
                  <button
                    onClick={() => navigate('/owner/electricity')}
                    className="py-2 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs hover:bg-amber-100 active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(room)}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 active:scale-95 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteRoom(room)}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editRoom ? `Sửa phòng ${editRoom.room_code}` : 'Thêm phòng mới'}
      >
        <div className="space-y-4">
          <Input label="Số / Mã phòng" placeholder="101, A01..." value={form.room_code} onChange={e => setForm(s=>({...s,room_code:e.target.value}))} disabled={!!editRoom} />
          <Input label="Giá thuê (đ/tháng)" type="number" placeholder="2500000" value={form.price} onChange={e => setForm(s=>({...s,price:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phí internet (đ)" type="number" value={form.internet_fee} onChange={e => setForm(s=>({...s,internet_fee:e.target.value}))} />
            <Input label="Phí rác (đ)" type="number" value={form.garbage_fee} onChange={e => setForm(s=>({...s,garbage_fee:e.target.value}))} />
          </div>
          <Input label="Đơn giá điện (đ/kWh)" type="number" value={form.elec_unit_price} onChange={e => setForm(s=>({...s,elec_unit_price:e.target.value}))} />
          <Input label="Ghi chú" placeholder="Tầng 1, góc..." value={form.notes} onChange={e => setForm(s=>({...s,notes:e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowAddModal(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editRoom ? 'Lưu thay đổi' : 'Thêm phòng'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteRoom}
        onClose={() => setDeleteRoom(null)}
        onConfirm={handleDelete}
        title={`Xóa phòng ${deleteRoom?.room_code}?`}
        description="Hành động này không thể hoàn tác. Chỉ có thể xóa phòng không còn người thuê."
        confirmLabel="Xóa phòng"
        loading={deleting}
      />
    </div>
  )
}
