import { useState, useEffect } from 'react'
import { FileText, CreditCard } from 'lucide-react'
import { Header }           from '@/components/layout/Header'
import { Card }             from '@/components/ui/Card'
import { Modal }            from '@/components/ui/Modal'
import { Button }           from '@/components/ui/Button'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { EmptyState }       from '@/components/ui/EmptyState'
import { CardSkeleton }     from '@/components/ui/Skeleton'
import { useAuthStore }     from '@/store/authStore'
import { useUIStore }       from '@/store/uiStore'
import { invoiceService }   from '@/services/invoiceService'
import { tenantService }    from '@/services/tenantService'
import { bankSettingsService } from '@/services/bankSettingsService'
import { formatMoney, formatPeriod, buildVietQRUrl } from '@/utils/format'
import type { Invoice, BankSettings } from '@/types'

export function TenantInvoicesPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()

  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [showQR, setShowQR]         = useState<Invoice | null>(null)
  const [bankSettings, setBank]     = useState<BankSettings | null>(null)
  const [tenantUserId, setTenantUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const t = await tenantService.getByUserId(user.id)
        if (!t) return
        setTenantUserId(t.user_id)
        const [invs, bank] = await Promise.all([
          invoiceService.getByTenant(t.user_id),
          bankSettingsService.get(),
        ])
        setInvoices(invs)
        setBank(bank)
      } catch (e) {
        addToast(e instanceof Error ? e.message : 'Không thể tải', 'error')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="page-enter">
      <Header title="Hóa đơn của tôi" />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_,i)=><CardSkeleton key={i}/>)}</div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<FileText className="w-6 h-6"/>} title="Chưa có hóa đơn nào" description="Khi chủ trọ tạo hóa đơn, bạn sẽ nhận được thông báo" />
        ) : (
          invoices.map(inv => (
            <Card key={inv.id} className="card-3d space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-base text-slate-900 dark:text-white">
                    Tháng {formatPeriod(inv.period_month, inv.period_year)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{inv.invoice_code}</p>
                </div>
                <InvoiceStatusBadge status={inv.status} />
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>🏠 Phòng: <b className="text-slate-700 dark:text-slate-300">{formatMoney(inv.rent_amount)}</b></span>
                <span>⚡ Điện: <b className="text-slate-700 dark:text-slate-300">{formatMoney(inv.elec_amount)}</b></span>
                {inv.internet_amount > 0 && <span>📶 Net: <b className="text-slate-700 dark:text-slate-300">{formatMoney(inv.internet_amount)}</b></span>}
                {inv.garbage_amount > 0  && <span>🗑️ Rác: <b className="text-slate-700 dark:text-slate-300">{formatMoney(inv.garbage_amount)}</b></span>}
                {inv.other_amount > 0    && <span>➕ Khác: <b className="text-slate-700 dark:text-slate-300">{formatMoney(inv.other_amount)}</b></span>}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-xs text-slate-500">Tổng cộng</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(inv.total_amount)}</span>
              </div>

              {inv.status === 'unpaid' && bankSettings && (
                <Button fullWidth size="sm" onClick={() => setShowQR(inv)} leftIcon={<CreditCard className="w-4 h-4"/>}>
                  Xem QR thanh toán
                </Button>
              )}
            </Card>
          ))
        )}
      </div>

      {/* QR Modal */}
      <Modal open={!!showQR} onClose={() => setShowQR(null)} title="QR Thanh toán" size="sm">
        {showQR && bankSettings && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={buildVietQRUrl({ bankId:'VCB', accountNo:bankSettings.account_number, accountName:bankSettings.account_name, amount:showQR.total_amount, description:showQR.invoice_code })}
              alt="QR" className="w-56 h-56 rounded-2xl border border-slate-200 dark:border-slate-700"
            />
            <div className="text-center space-y-1">
              <p className="font-bold text-sm">{bankSettings.account_name}</p>
              <p className="text-xs text-slate-500">{bankSettings.account_number} — {bankSettings.bank_name}</p>
              <p className="font-black text-xl text-brand-600 dark:text-brand-400">{formatMoney(showQR.total_amount)}</p>
              <p className="text-[11px] font-mono text-slate-400">ND: {showQR.invoice_code}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
