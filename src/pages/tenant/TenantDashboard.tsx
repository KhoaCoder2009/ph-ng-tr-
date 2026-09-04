import { useState, useEffect } from 'react'
import { CreditCard, Home, Zap, DollarSign, FileText, ArrowRight, CheckCircle, CalendarDays, History, Landmark } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header }         from '@/components/layout/Header'
import { Card }           from '@/components/ui/Card'
import { Button }         from '@/components/ui/Button'
import { Modal }          from '@/components/ui/Modal'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { CardSkeleton }   from '@/components/ui/Skeleton'
import { useAuthStore }   from '@/store/authStore'
import { useUIStore }     from '@/store/uiStore'
import { tenantService }  from '@/services/tenantService'
import { invoiceService } from '@/services/invoiceService'
import { electricityService } from '@/services/electricityService'
import { paymentService } from '@/services/paymentService'
import { bankSettingsService } from '@/services/bankSettingsService'
import { formatMoney, formatPeriod, getCurrentPeriod, buildVietQRUrl } from '@/utils/format'
import type { Tenant, Invoice, ElectricityReading, BankSettings } from '@/types'

export function TenantDashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { addToast } = useUIStore()
  const { month, year } = getCurrentPeriod()

  const [tenant, setTenant]         = useState<Tenant | null>(null)
  const [latestInvoice, setLatest]  = useState<Invoice | null>(null)
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([])
  const [elecReading, setElec]      = useState<ElectricityReading | null>(null)
  const [electricityHistory, setElectricityHistory] = useState<ElectricityReading[]>([])
  const [bankSettings, setBank]     = useState<BankSettings | null>(null)
  const [isLoading, setIsLoading]   = useState(true)
  const [showPay, setShowPay]       = useState(false)
  const [showQR, setShowQR]         = useState(false)
  const [paying, setPaying]         = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const t = await tenantService.getByUserId(user.id)
        setTenant(t)
        if (t) {
          const [invs, elec, elecHistory, bank] = await Promise.all([
            invoiceService.getByTenant(t.user_id),
            electricityService.getByPeriod(t.room_id, month, year),
            electricityService.getByRoomAndYear(t.room_id, year),
            bankSettingsService.get(),
          ])
          const currentInvoice = invs.find((invoice) => invoice.period_month === month && invoice.period_year === year)
          setLatest(currentInvoice ?? invs[0] ?? null)
          setUnpaidInvoices(invs.filter((invoice) => invoice.status === 'unpaid'))
          setPaidInvoices(invs.filter((invoice) => invoice.status === 'paid'))
          setElec(elec)
          setElectricityHistory(elecHistory)
          setBank(bank)
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [addToast, month, user, year])

  const handlePayDirect = async () => {
    if (!latestInvoice || !tenant) return
    setPaying(true)
    try {
      // Người thuê ghi nhận ý định thanh toán - chủ trọ sẽ xác nhận
      addToast('Đã gửi yêu cầu thanh toán. Chờ chủ trọ xác nhận.', 'info')
      setShowPay(false)
    } catch (e) {
      addToast('Có lỗi xảy ra', 'error')
    } finally {
      setPaying(false)
    }
  }

  const firstName = profile?.full_name?.split(' ').pop() ?? 'Bạn'
  const room = tenant?.room
  const annualReadings = [...electricityHistory].sort((a, b) =>
    (a.period_year * 100 + a.period_month) - (b.period_year * 100 + b.period_month)
  )
  const firstAnnualReading = annualReadings[0]
  const lastAnnualReading = annualReadings[annualReadings.length - 1]

  return (
    <div className="page-enter">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Greeting */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Xin chào,</p>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{firstName} 👋</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
            {formatPeriod(month, year)}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><CardSkeleton key={i}/>)}</div>
        ) : !tenant ? (
          <Card className="text-center py-8">
            <p className="text-sm text-slate-500">Không tìm thấy thông tin thuê phòng. Liên hệ chủ trọ.</p>
          </Card>
        ) : (
          <>
            {/* Room info hero */}
            <div className="card-3d relative overflow-hidden rounded-3xl p-5 hero-gradient text-white shadow-3d">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-brand-200 font-medium">Phòng của bạn</p>
                  <p className="text-2xl font-black">Phòng {room?.room_code}</p>
                  <p className="text-brand-200 text-xs mt-0.5">{formatMoney(room?.price ?? 0)}/tháng</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/15 relative z-10">
                <div>
                  <p className="text-[10px] text-brand-200">Tiền cọc</p>
                  <p className="font-bold text-sm">{formatMoney(tenant.deposit)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-brand-200">Ngày bắt đầu</p>
                  <p className="font-bold text-sm">{new Date(tenant.start_date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Latest invoice */}
            {unpaidInvoices.length > 0 ? (
              <div className="space-y-3">
                {unpaidInvoices.map((invoice) => (
              <Card key={invoice.id} className="card-3d space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Hóa đơn tháng {formatPeriod(invoice.period_month, invoice.period_year)}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatMoney(invoice.total_amount)}</p>
                  </div>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>🏠 {formatMoney(invoice.rent_amount)}</span>
                  <span>⚡ {formatMoney(invoice.elec_amount)}</span>
                  {invoice.internet_amount > 0 && <span>📶 {formatMoney(invoice.internet_amount)}</span>}
                  {invoice.garbage_amount > 0  && <span>🗑️ {formatMoney(invoice.garbage_amount)}</span>}
                </div>

                <Button fullWidth onClick={() => { setLatest(invoice); setShowPay(true) }} leftIcon={<CreditCard className="w-4 h-4"/>}>
                  Thanh toán ngay
                </Button>
              </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Không còn hóa đơn nào chưa thanh toán</p>
              </Card>
            )}

            {/* Electricity */}
            <Card className="card-3d">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Điện tháng {formatPeriod(month, year)}</p>
                    {elecReading ? (
                      <>
                        <p className="font-extrabold text-lg text-slate-900 dark:text-white">{elecReading.consumption} kWh</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{formatMoney(elecReading.total_amount)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Đầu: {elecReading.old_reading} · Cuối: {elecReading.new_reading}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 font-medium">Chưa cập nhật</p>
                    )}
                  </div>
                </div>
                <button onClick={() => navigate('/tenant/invoices')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Card>

            {/* Electricity history and annual usage */}
            <Card className="card-3d space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Điện trong năm {year}</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {electricityHistory.reduce((sum, reading) => sum + reading.consumption, 0).toLocaleString('vi-VN')} kWh
                    </p>
                    {firstAnnualReading && lastAnnualReading && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Đầu năm: {firstAnnualReading.old_reading} · Cuối năm: {lastAnnualReading.new_reading}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{electricityHistory.length} kỳ</span>
              </div>

              {electricityHistory.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {electricityHistory.slice(0, 6).map((reading) => (
                    <div key={reading.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {reading.period_month > 0 ? `Tháng ${String(reading.period_month).padStart(2, '0')}` : 'Kỳ điện'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Đầu: <b className="text-slate-700 dark:text-slate-200">{reading.old_reading}</b></span>
                        <span>Cuối: <b className="text-slate-700 dark:text-slate-200">{reading.new_reading}</b></span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{reading.consumption} kWh</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">{formatMoney(reading.total_amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa có lịch sử chỉ số điện.</p>
              )}
            </Card>

            {/* Paid invoice history */}
            <Card className="card-3d space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <History className="w-4 h-4 text-emerald-500" /> Lịch sử đã thanh toán
                </h3>
                <button onClick={() => navigate('/tenant/invoices')} className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  Xem tất cả
                </button>
              </div>
              {paidInvoices.length > 0 ? (
                <div className="space-y-2">
                  {paidInvoices.slice(0, 4).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tháng {formatPeriod(invoice.period_month, invoice.period_year)}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{invoice.invoice_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatMoney(invoice.total_amount)}</p>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Đã thanh toán</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa có hóa đơn nào được thanh toán.</p>
              )}
            </Card>

            {/* Deposit info */}
            <Card className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tiền cọc đã đóng</p>
                  <p className="font-extrabold text-base text-slate-900 dark:text-white">{formatMoney(tenant.deposit)}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                Đã giữ
              </span>
            </Card>
          </>
        )}
      </div>

      {/* Payment modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Chọn phương thức thanh toán" size="sm">
        {latestInvoice && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs text-slate-500">Hóa đơn tháng {formatPeriod(latestInvoice.period_month, latestInvoice.period_year)}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{latestInvoice.invoice_code}</p>
                </div>
                <p className="text-xl font-black text-brand-600 dark:text-brand-400">{formatMoney(latestInvoice.total_amount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-brand-100 dark:border-brand-500/20 text-xs text-slate-600 dark:text-slate-300">
                <span>🏠 Tiền phòng: {formatMoney(latestInvoice.rent_amount)}</span>
                <span>⚡ Tiền điện: {formatMoney(latestInvoice.elec_amount)}</span>
                {latestInvoice.internet_amount > 0 && <span>📶 Internet: {formatMoney(latestInvoice.internet_amount)}</span>}
                {latestInvoice.garbage_amount > 0 && <span>🗑️ Tiền rác: {formatMoney(latestInvoice.garbage_amount)}</span>}
                {latestInvoice.other_amount > 0 && <span>➕ Khoản khác: {formatMoney(latestInvoice.other_amount)}</span>}
              </div>
            </div>

            <div className="space-y-2">
              {bankSettings && (
                <button
                  onClick={() => { setShowPay(false); setShowQR(true) }}
                  className="w-full p-4 rounded-2xl border-2 border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-500/10 text-left flex items-center gap-3 hover:border-brand-500 transition-all active:scale-95"
                >
                  <Landmark className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Chuyển khoản ngân hàng</p>
                    <p className="text-xs text-slate-500">Xem thông tin tài khoản hoặc quét QR</p>
                  </div>
                </button>
              )}
              <button
                onClick={() => { handlePayDirect() }}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-left flex items-center gap-3 hover:border-brand-500 transition-all active:scale-95"
              >
                <span className="text-2xl">💵</span>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">Tiền mặt trực tiếp</p>
                  <p className="text-xs text-slate-500">Đưa tiền cho chủ trọ, chủ trọ xác nhận</p>
                </div>
              </button>
            </div>
            {!bankSettings && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">Chủ trọ chưa cấu hình tài khoản ngân hàng.</p>
            )}
          </div>
        )}
      </Modal>

      {/* QR modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="QR Thanh toán" size="sm">
        {latestInvoice && bankSettings && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={buildVietQRUrl({
                bankId: 'VCB', accountNo: bankSettings.account_number,
                accountName: bankSettings.account_name,
                amount: latestInvoice.total_amount,
                description: latestInvoice.invoice_code,
              })}
              alt="QR" className="w-56 h-56 rounded-2xl border border-slate-200 dark:border-slate-700"
            />
            <div className="text-center space-y-1">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{bankSettings.account_name}</p>
              <p className="text-xs text-slate-500">{bankSettings.account_number} — {bankSettings.bank_name}</p>
              <p className="font-black text-xl text-brand-600 dark:text-brand-400">{formatMoney(latestInvoice.total_amount)}</p>
              <p className="text-[11px] font-mono text-slate-400">ND: {latestInvoice.invoice_code}</p>
            </div>
            <p className="text-xs text-slate-400 text-center">Sau khi chuyển khoản, chờ chủ trọ xác nhận trên hệ thống.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
