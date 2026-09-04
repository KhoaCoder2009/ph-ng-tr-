import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, CreditCard, Clock } from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { Card }            from '@/components/ui/Card'
import { Button }          from '@/components/ui/Button'
import { Modal }           from '@/components/ui/Modal'
import { Select }          from '@/components/ui/Select'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { EmptyState }      from '@/components/ui/EmptyState'
import { CardSkeleton }    from '@/components/ui/Skeleton'
import { invoiceService }  from '@/services/invoiceService'
import { paymentService }  from '@/services/paymentService'
import { bankSettingsService } from '@/services/bankSettingsService'
import { useAuthStore }    from '@/store/authStore'
import { useUIStore }      from '@/store/uiStore'
import { formatMoney, formatPeriod, getCurrentPeriod, buildVietQRUrl } from '@/utils/format'
import type { Invoice, BankSettings, PaymentMethod } from '@/types'

export function PaymentsPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const { month, year } = getCurrentPeriod()

  const [unpaid, setUnpaid]           = useState<Invoice[]>([])
  const [summary, setSummary]         = useState({ collected: 0, uncollected: 0 })
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [confirmInv, setConfirmInv]   = useState<Invoice | null>(null)
  const [method, setMethod]           = useState<PaymentMethod>('cash')
  const [txRef, setTxRef]             = useState('')
  const [confirming, setConfirming]   = useState(false)
  const [showQR, setShowQR]           = useState<Invoice | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [invs, s, bank] = await Promise.all([
        invoiceService.getAll({ month, year, status: 'unpaid' }),
        paymentService.getSummary(month, year),
        bankSettingsService.get(),
      ])
      setUnpaid(invs)
      setSummary(s)
      setBankSettings(bank)
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Không thể tải dữ liệu', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const handleConfirm = async () => {
    if (!confirmInv || !user) return
    setConfirming(true)
    try {
      await paymentService.confirm({
        invoiceId: confirmInv.id,
        tenantId: confirmInv.tenant_id,           // tenants.id
        tenantUserId: confirmInv.tenant_user_id,  // auth.users.id
        amount: confirmInv.total_amount,
        method,
        transactionRef: txRef || undefined,
        confirmedBy: user.id,
      })
      addToast(`Đã xác nhận thanh toán phòng ${(confirmInv.room as unknown as { room_code?: string })?.room_code}`, 'success')
      setConfirmInv(null)
      load()
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Có lỗi xảy ra', 'error')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="page-enter">
      <Header title="Thanh toán" />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-[10px] text-slate-500 font-medium mb-1">Đã thu tháng {formatPeriod(month, year)}</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatMoney(summary.collected)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-[10px] text-slate-500 font-medium mb-1">Chưa thu</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">{formatMoney(summary.uncollected)}</p>
          </Card>
        </div>

        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Chờ thanh toán ({unpaid.length})
        </h3>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><CardSkeleton key={i}/>)}</div>
        ) : unpaid.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
            title="Tất cả đã thanh toán! 🎉"
            description={`Tháng ${formatPeriod(month, year)} không còn hóa đơn nào chưa thu`}
          />
        ) : (
          <div className="space-y-3">
            {unpaid.map(inv => {
              const room   = inv.room   as unknown as { room_code: string }
              const tenant = inv.tenant as unknown as { full_name: string }
              return (
                <Card key={inv.id} className="card-3d">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        Phòng {room?.room_code} — {tenant?.full_name ?? 'Khách thuê'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tháng {formatPeriod(inv.period_month, inv.period_year)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-base text-slate-900 dark:text-white">{formatMoney(inv.total_amount)}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    {bankSettings && (
                      <button onClick={() => setShowQR(inv)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-200 active:scale-95">
                        <CreditCard className="w-3.5 h-3.5" /> QR VCB
                      </button>
                    )}
                    <button
                      onClick={() => { setConfirmInv(inv); setMethod('cash'); setTxRef('') }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Xác nhận đã thu
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal open={!!confirmInv} onClose={() => setConfirmInv(null)} title="Xác nhận thanh toán" size="sm">
        {confirmInv && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-sm">
              <p className="font-bold text-slate-900 dark:text-white">
                Phòng {(confirmInv.room as unknown as { room_code?: string })?.room_code}
              </p>
              <p className="text-brand-600 dark:text-brand-400 font-extrabold text-lg">{formatMoney(confirmInv.total_amount)}</p>
            </div>
            <Select label="Phương thức thanh toán" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'cash', label: '💵 Tiền mặt trực tiếp' },
                { value: 'qr_vcb', label: '📱 QR Vietcombank' },
                { value: 'transfer', label: '🏦 Chuyển khoản' },
              ]} />
            {(method === 'qr_vcb' || method === 'transfer') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mã giao dịch (nếu có)</label>
                <input type="text" placeholder="VD: FT24123456" value={txRef} onChange={e=>setTxRef(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-input text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-slate-900 dark:text-slate-100" />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setConfirmInv(null)}>Hủy</Button>
              <Button variant="success" fullWidth loading={confirming} onClick={handleConfirm} leftIcon={<CheckCircle className="w-4 h-4"/>}>
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="QR Thanh toán VCB" size="sm">
        {showQR && bankSettings && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={buildVietQRUrl({
                bankId: 'VCB', accountNo: bankSettings.account_number,
                accountName: bankSettings.account_name,
                amount: showQR.total_amount,
                description: showQR.invoice_code,
              })}
              alt="VietQR"
              className="w-56 h-56 rounded-2xl border border-slate-200 dark:border-slate-700"
            />
            <div className="text-center text-sm space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{bankSettings.account_name}</p>
              <p className="text-slate-500">{bankSettings.account_number} — {bankSettings.bank_name}</p>
              <p className="font-extrabold text-brand-600 dark:text-brand-400 text-lg">{formatMoney(showQR.total_amount)}</p>
              <p className="text-[11px] text-slate-400 font-mono">Nội dung: {showQR.invoice_code}</p>
            </div>
            <p className="text-xs text-slate-400 text-center">Sau khi người thuê chuyển khoản, chủ trọ xác nhận thanh toán trên hệ thống.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
