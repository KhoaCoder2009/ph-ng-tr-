import { useState, useEffect } from 'react'
import { Zap, Plus, FileDown, History, Pencil } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Header }               from '@/components/layout/Header'
import { Card }                 from '@/components/ui/Card'
import { Button }               from '@/components/ui/Button'
import { Modal }                from '@/components/ui/Modal'
import { Input }                from '@/components/ui/Input'
import { Select }               from '@/components/ui/Select'
import { EmptyState }           from '@/components/ui/EmptyState'
import { CardSkeleton }         from '@/components/ui/Skeleton'
import { electricityService }   from '@/services/electricityService'
import { roomService }          from '@/services/roomService'
import { tenantService }        from '@/services/tenantService'
import { useUIStore }           from '@/store/uiStore'
import { exportElectricityPDF } from '@/utils/pdf'
import { formatMoney, formatPeriod, getCurrentPeriod } from '@/utils/format'
import type { ElectricityReading, Room, Tenant } from '@/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export function ElectricityPage() {
  const { addToast } = useUIStore()
  const { month, year } = getCurrentPeriod()

  const [rooms, setRooms]             = useState<Room[]>([])
  const [readings, setReadings]       = useState<ElectricityReading[]>([])
  const [history, setHistory]         = useState<ElectricityReading[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyRoom, setHistoryRoom] = useState<Room | null>(null)
  const [saving, setSaving]           = useState(false)
  const [exporting, setExporting]     = useState(false)

  const [form, setForm] = useState({
    room_id: '', old_reading: '', new_reading: '', unit_price: '3500',
    period_month: String(month), period_year: String(year),
  })
  const [liveCalc, setLiveCalc] = useState({ consumption: 0, total: 0 })

  const load = async () => {
    setIsLoading(true)
    try {
      const [r, allReadings] = await Promise.all([
        roomService.getAll(),
        electricityService.getAllByPeriod(month, year),
      ])
      setRooms(r)
      setReadings(allReadings)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const calcLive = () => {
    const old_ = Number(form.old_reading) || 0
    const new_ = Number(form.new_reading) || 0
    const unit = Number(form.unit_price)  || 0
    const c = Math.max(0, new_ - old_)
    setLiveCalc({ consumption: c, total: c * unit })
  }

  const openAdd = async (room?: Room) => {
    setEditingReading(null)
    const latest = room ? await electricityService.getLatest(room.id) : null
    setForm({
      room_id: room?.id ?? '',
      old_reading: latest ? String(latest.new_reading) : '',
      new_reading: '',
      unit_price: room ? String(room.elec_unit_price) : '3500',
      period_month: String(month),
      period_year: String(year),
    })
    setLiveCalc({ consumption: 0, total: 0 })
    setShowModal(true)
  }

  const openEdit = (reading: ElectricityReading, room: Room) => {
    setEditingReading(reading)
    setForm({
      room_id: room.id,
      old_reading: String(reading.old_reading),
      new_reading: String(reading.new_reading),
      unit_price: String(reading.unit_price),
      period_month: String(reading.period_month || month),
      period_year: String(reading.period_year || year),
    })
    setLiveCalc({
      consumption: reading.consumption,
      total: reading.total_amount,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.room_id || !form.old_reading || !form.new_reading) {
      return addToast('Vui lòng điền đầy đủ thông tin', 'error')
    }
    if (Number(form.new_reading) < Number(form.old_reading)) {
      return addToast('Chỉ số mới không được nhỏ hơn chỉ số cũ', 'error')
    }
    setSaving(true)
    try {
      if (editingReading) {
        await electricityService.update(editingReading.id, {
          room_id: form.room_id,
          period_month: Number(form.period_month),
          period_year: Number(form.period_year),
          old_reading: Number(form.old_reading),
          new_reading: Number(form.new_reading),
          unit_price: Number(form.unit_price),
        })
        addToast('Đã cập nhật chỉ số điện', 'success')
      } else {
        await electricityService.create({
          room_id: form.room_id,
          period_month: Number(form.period_month),
          period_year: Number(form.period_year),
          old_reading: Number(form.old_reading),
          new_reading: Number(form.new_reading),
          unit_price: Number(form.unit_price),
        })
        addToast('Đã lưu chỉ số điện', 'success')
      }
      setShowModal(false)
      setEditingReading(null)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Có lỗi xảy ra', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async (room: Room) => {
    setHistoryRoom(room)
    setShowHistory(true)
    try {
      const h = await electricityService.getByRoom(room.id, 12)
      setHistory(h)
    } catch { /* ignore */ }
  }

  const handleExportPDF = async (reading: ElectricityReading, room: Room) => {
    setExporting(true)
    try {
      let tenantName = 'Không rõ'
      const tenant = await tenantService.getByRoom(room.id)
      if (tenant) tenantName = tenant.full_name
      await exportElectricityPDF({ ...reading, room_code: room.room_code, tenant_name: tenantName })
      addToast('Đã xuất PDF', 'success')
    } catch (e) {
      addToast('Không thể xuất PDF', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Chart for history
  const historyChartData = {
    labels: [...history].reverse().map(h => formatPeriod(h.period_month, h.period_year)),
    datasets: [{
      data: [...history].reverse().map(h => h.consumption),
      backgroundColor: 'rgba(245,158,11,0.7)',
      borderRadius: 6,
    }],
  }

  return (
    <div className="page-enter">
      <Header title="Quản lý điện" rightSlot={
        <Button size="sm" onClick={() => openAdd()} leftIcon={<Plus className="w-4 h-4" />}>Nhập điện</Button>
      } />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kỳ hiện tại: <span className="font-bold text-slate-700 dark:text-slate-300">{formatPeriod(month, year)}</span>
        </p>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i) => <CardSkeleton key={i} />)}</div>
        ) : rooms.length === 0 ? (
          <EmptyState icon={<Zap className="w-6 h-6" />} title="Chưa có phòng nào" description="Thêm phòng trước khi nhập điện" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {rooms.map(room => {
              const reading = readings.find(r => r.room_id === room.id)
              return (
                <Card key={room.id} className="card-3d space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Phòng {room.room_code}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatPeriod(month, year)}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>

                  {reading ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <p className="text-slate-400">Chỉ số cũ</p>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm">{reading.old_reading}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                          <p className="text-slate-400">Chỉ số mới</p>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm">{reading.new_reading}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                          <p className="text-amber-500">Tiêu thụ</p>
                          <p className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">{reading.consumption} kWh</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Đơn giá: <b>{reading.unit_price.toLocaleString('vi-VN')}đ/kWh</b></span>
                        <span className="font-extrabold text-brand-600 dark:text-brand-400">{formatMoney(reading.total_amount)}</span>
                      </div>
                      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <button onClick={() => openEdit(reading, room)} className="flex-1 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100 active:scale-95 transition-all flex items-center justify-center gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button onClick={() => openHistory(room)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1">
                          <History className="w-3.5 h-3.5" /> Lịch sử
                        </button>
                        <button onClick={() => handleExportPDF(reading, room)} disabled={exporting} className="flex-1 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100 active:scale-95 transition-all flex items-center justify-center gap-1">
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3 space-y-2">
                      <p className="text-xs text-slate-400">Chưa nhập chỉ số tháng này</p>
                      <Button size="sm" onClick={() => openAdd(room)} leftIcon={<Plus className="w-3.5 h-3.5" />}>Nhập điện</Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add reading modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingReading(null) }} title={editingReading ? 'Chỉnh sửa chỉ số điện' : 'Nhập chỉ số điện'}>
        <div className="space-y-4">
          <Select
            label="Chọn phòng"
            value={form.room_id}
            onChange={async e => {
              const room = rooms.find(r => r.id === e.target.value)
              if (room) {
                const latest = await electricityService.getLatest(room.id)
                setForm(s => ({
                  ...s, room_id: e.target.value,
                  unit_price: String(room.elec_unit_price),
                  old_reading: latest ? String(latest.new_reading) : '',
                }))
              }
            }}
            options={rooms.map(r => ({ value: r.id, label: `Phòng ${r.room_code}` }))}
            placeholder="-- Chọn phòng --"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kỳ tháng" type="number" min="1" max="12" value={form.period_month} onChange={e=>setForm(s=>({...s,period_month:e.target.value}))} />
            <Input label="Năm" type="number" value={form.period_year} onChange={e=>setForm(s=>({...s,period_year:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Chỉ số cũ (kWh)" type="number" value={form.old_reading} onChange={e=>{setForm(s=>({...s,old_reading:e.target.value}));calcLive()}} />
            <Input label="Chỉ số mới (kWh)" type="number" value={form.new_reading} onChange={e=>{setForm(s=>({...s,new_reading:e.target.value}));setTimeout(calcLive,0)}} />
          </div>
          <Input label="Đơn giá (đ/kWh)" type="number" value={form.unit_price} onChange={e=>{setForm(s=>({...s,unit_price:e.target.value}));setTimeout(calcLive,0)}} />

          {/* Live calculation */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex justify-between items-center">
            <div className="text-xs text-slate-500">
              Tiêu thụ: <b className="text-amber-600 dark:text-amber-400">{liveCalc.consumption} kWh</b>
            </div>
            <div className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
              {formatMoney(liveCalc.total)}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowModal(false)}>Hủy</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editingReading ? 'Cập nhật chỉ số' : 'Lưu chỉ số'}</Button>
          </div>
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title={`Lịch sử điện - Phòng ${historyRoom?.room_code}`} size="lg">
        <div className="space-y-4">
          {history.length > 0 && (
            <div className="h-36">
              <Bar data={historyChartData} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}},y:{grid:{display:false}}} }} />
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{formatPeriod(h.period_month, h.period_year)}</p>
                  <p className="text-slate-400">{h.old_reading} → {h.new_reading} kWh</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600 dark:text-amber-400">{h.consumption} kWh</p>
                  <p className="font-extrabold text-brand-600 dark:text-brand-400">{formatMoney(h.total_amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
