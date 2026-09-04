import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, FileText, Share2, Trash2, FileDown } from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { Card }            from '@/components/ui/Card'
import { Button }          from '@/components/ui/Button'
import { Modal }           from '@/components/ui/Modal'
import { Input }           from '@/components/ui/Input'
import { Select }          from '@/components/ui/Select'
import { ConfirmDialog }   from '@/components/ui/ConfirmDialog'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { EmptyState }      from '@/components/ui/EmptyState'
import { CardSkeleton }    from '@/components/ui/Skeleton'
import { invoiceService, type CreateInvoiceParams } from '@/services/invoiceService'
import { electricityService } from '@/services/electricityService'
import { roomService }     from '@/services/roomService'
import { tenantService }   from '@/services/tenantService'
import { bankSettingsService } from '@/services/bankSettingsService'
import { exportInvoicePDF } from '@/utils/pdf'
import { useUIStore }      from '@/store/uiStore'
import { formatMoney, formatPeriod, getCurrentPeriod, getMonthOptions } from '@/utils/format'
import type { Invoice, Room, Tenant, InvoiceStatus } from '@/types'

export function InvoicesPage() {
  const { addToast } = useUIStore()
  const { month, year } = getCurrentPeriod()

  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [rooms, setRooms]           = useState<Room[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteInv, setDeleteInv]   = useState<Invoice | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all')
  const [filterMonth, setFilterMonth]   = useState(String(month))
  const [filterYear, setFilterYear]     = useState(String(year))

  // Create form
  const [selRoom, setSelRoom]         = useState('')
  const [selTenant, setSelTenant]     = useState<Tenant | null>(null)
  const [createPeriodM, setCreatePeriodM] = useState(String(month))
  const [createPeriodY, setCreatePeriodY] = useState(String(year))
  const [elecOld, setElecOld]         = useState('')
  const [elecNew, setElecNew]         = useState('')
  const [elecUnit, setElecUnit]       = useState('3500')
  const [internet, setInternet]       = useState('')
  const [garbage, setGarbage]         = useState('')
  const [other, setOther]             = useState('0')
  const [otherName, setOtherName]     = useState('Khoản thu khác')

  // Computed
  const elecCons  = Math.max(0, (Number(elecNew)||0) - (Number(elecOld)||0))
  const elecAmt   = elecCons * (Number(elecUnit)||0)
  const roomPrice = rooms.find(r=>r.id===selRoom)?.price ?? 0
  const totalAmt  = roomPrice + elecAmt + (Number(internet)||0) + (Number(garbage)||0) + (Number(other)||0)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [invs, rs] = await Promise.all([
        invoiceService.getAll({
          month: filterMonth ? Number(filterMonth) : undefined,
          year:  filterYear  ? Number(filterYear)  : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: search || undefined,
        }),
        roomService.getAll(),
      ])
      setInvoices(invs)
      setRooms(rs)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear, filterStatus, search])

  useEffect(() => { load() }, [load])

  const onRoomChange = async (roomId: string) => {
    setSelRoom(roomId)
    const room = rooms.find(r => r.id === roomId)
    if (room) {
      setInternet(String(room.internet_fee))
      setGarbage(String(room.garbage_fee))
      setElecUnit(String(room.elec_unit_price))
      const latest = await electricityService.getLatest(roomId)
      if (latest) { setElecOld(String(latest.new_reading)); setElecNew('') }
      else { setElecOld(''); setElecNew('') }
      const tenant = await tenantService.getByRoom(roomId)
      setSelTenant(tenant)
    }
  }

  const handleCreate = async () => {
    if (!selRoom || !selTenant) return addToast('Chọn phòng có người thuê', 'error')
    if (Number(elecNew) < Number(elecOld)) return addToast('Chỉ số điện mới không hợp lệ', 'error')
    setSaving(true)
    try {
      const room = rooms.find(r => r.id === selRoom)!
      const params: CreateInvoiceParams = {
        room_id: selRoom,
        tenant_id: selTenant.id,           // tenants.id (PK)
        tenant_user_id: selTenant.user_id, // auth.users.id
        room_code: room.room_code,
        period_month: Number(createPeriodM), period_year: Number(createPeriodY),
        rent_amount: room.price, elec_amount: elecAmt,
        internet_amount: Number(internet)||0, garbage_amount: Number(garbage)||0,
        other_amount: Number(other)||0,
        other_items: Number(other) > 0 ? [{ name: otherName, amount: Number(other) }] : [],
      }
      await invoiceService.create(params)
      // Save electricity reading
      if (elecNew && elecOld) {
        await electricityService.create({
          room_id: selRoom, period_month: Number(createPeriodM), period_year: Number(createPeriodY),
          old_reading: Number(elecOld), new_reading: Number(elecNew), unit_price: Number(elecUnit),
        }).catch(() => {}) // ignore duplicate
      }
      addToast('Đã tạo hóa đơn và gửi thông báo', 'success')
      setShowCreate(false)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tạo hóa đơn', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteInv) return
    setDeleting(true)
    try {
      await invoiceService.delete(deleteInv.id)
      addToast('Đã xóa hóa đơn', 'success')
      setDeleteInv(null)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể xóa', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const copyShareLink = (inv: Invoice) => {
    const link = `${window.location.origin}/invoice/${inv.share_token}`
    navigator.clipboard.writeText(link).then(() => addToast('Đã copy link hóa đơn', 'success'))
  }

  const handleExportPDF = async (inv: Invoice) => {
    try {
      const room = inv.room as unknown as { room_code: string }
      const tenant = inv.tenant as unknown as { full_name: string }
      const bank = await bankSettingsService.get()
      await exportInvoicePDF({ ...inv, room_code: room?.room_code ?? '?', tenant_name: tenant?.full_name ?? '?' }, bank)
      addToast('Đã xuất PDF hóa đơn', 'success')
    } catch (e) { addToast(e instanceof Error ? e.message : 'Không thể xuất PDF', 'error') }
  }

  const monthOptions = getMonthOptions(12).map(o => ({ value: `${o.month}/${o.year}`, label: o.label }))

  return (
    <div className="page-enter">
      <Header title="Hóa đơn" rightSlot={
        <Button size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>Tạo hóa đơn</Button>
      } />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search" placeholder="Tìm theo phòng, tên người thuê..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-input text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={`${filterMonth}/${filterYear}`} onChange={e => { const [m,y]=e.target.value.split('/'); setFilterMonth(m); setFilterYear(y) }}
              className="flex-1 min-w-[130px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-input text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-300">
              {monthOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(['all','unpaid','paid'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filterStatus===s?'bg-brand-600 text-white border-brand-600':'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                {s==='all'?'Tất cả':s==='unpaid'?'Chưa thu':'Đã thu'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i)=><CardSkeleton key={i}/>)}</div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<FileText className="w-6 h-6"/>} title="Không có hóa đơn nào" description="Thay đổi bộ lọc hoặc tạo hóa đơn mới" action={<Button size="sm" onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4"/>}>Tạo hóa đơn</Button>} />
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const room = inv.room as unknown as { room_code: string }
              const tenant = inv.tenant as unknown as { full_name: string }
              return (
                <Card key={inv.id} className="card-3d">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black text-sm">
                        {room?.room_code}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{tenant?.full_name ?? 'Khách thuê'}</p>
                        <p className="text-[10px] text-slate-400">Tháng {formatPeriod(inv.period_month, inv.period_year)}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{inv.invoice_code}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-extrabold text-base text-slate-900 dark:text-white">{formatMoney(inv.total_amount)}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>

                  {/* Item breakdown */}
                  <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>🏠 Phòng: <b>{formatMoney(inv.rent_amount)}</b></span>
                    <span>⚡ Điện: <b>{formatMoney(inv.elec_amount)}</b></span>
                    {inv.internet_amount > 0 && <span>📶 Net: <b>{formatMoney(inv.internet_amount)}</b></span>}
                    {inv.garbage_amount > 0 && <span>🗑️ Rác: <b>{formatMoney(inv.garbage_amount)}</b></span>}
                    {inv.other_amount > 0 && <span>➕ Khác: <b>{formatMoney(inv.other_amount)}</b></span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <button onClick={() => copyShareLink(inv)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-200 active:scale-95 transition-all">
                      <Share2 className="w-3.5 h-3.5" /> Chia sẻ
                    </button>
                    <button onClick={() => handleExportPDF(inv)} className="flex-1 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-brand-100 active:scale-95 transition-all">
                      <FileDown className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={() => setDeleteInv(inv)} className="py-2 px-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 active:scale-95 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create invoice modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo hóa đơn" size="lg">
        <div className="space-y-4">
          <Select label="Chọn phòng" value={selRoom} onChange={e=>onRoomChange(e.target.value)}
            options={rooms.map(r=>({
              value: r.id,
              label: `Phòng ${r.room_code}${r.status === 'occupied' ? '' : ' (chưa có người thuê)'}`,
            }))}
            placeholder="-- Chọn phòng --" />

          {selTenant && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Người thuê: </span>
              <span className="font-bold text-slate-900 dark:text-white">{selTenant.full_name}</span>
              <span className="text-slate-500 ml-2">• Phòng: {formatMoney(roomPrice)}/tháng</span>
            </div>
          )}
          {selRoom && !selTenant && (
            <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
              Phòng này chưa có người thuê đang hoạt động. Hãy tạo người thuê trước khi lập hóa đơn.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Tháng" type="number" min="1" max="12" value={createPeriodM} onChange={e=>setCreatePeriodM(e.target.value)} />
            <Input label="Năm" type="number" value={createPeriodY} onChange={e=>setCreatePeriodY(e.target.value)} />
          </div>

          {/* Electricity */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-2">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">⚡ Tiền điện</p>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Chỉ số cũ" type="number" value={elecOld} onChange={e=>setElecOld(e.target.value)} />
              <Input label="Chỉ số mới" type="number" value={elecNew} onChange={e=>setElecNew(e.target.value)} />
              <Input label="Đơn giá" type="number" value={elecUnit} onChange={e=>setElecUnit(e.target.value)} />
            </div>
            <p className="text-xs text-right font-bold text-amber-700 dark:text-amber-400">
              {elecCons} kWh × {Number(elecUnit).toLocaleString('vi-VN')}đ = {formatMoney(elecAmt)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Internet (đ)" type="number" value={internet} onChange={e=>setInternet(e.target.value)} />
            <Input label="Rác (đ)" type="number" value={garbage} onChange={e=>setGarbage(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tên khoản khác" value={otherName} onChange={e=>setOtherName(e.target.value)} />
            <Input label="Số tiền (đ)" type="number" value={other} onChange={e=>setOther(e.target.value)} />
          </div>

          {/* Total */}
          <div className="p-4 rounded-2xl hero-gradient text-white flex justify-between items-center">
            <span className="font-bold text-sm">TỔNG THANH TOÁN</span>
            <span className="font-black text-xl">{formatMoney(totalAmt)}</span>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleCreate} leftIcon={<FileText className="w-4 h-4"/>}>Tạo & Gửi thông báo</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteInv}
        onClose={() => setDeleteInv(null)}
        onConfirm={handleDelete}
        title="Xóa hóa đơn?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  )
}
