import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, CreditCard } from 'lucide-react'
import { invoiceService }   from '@/services/invoiceService'
import { bankSettingsService } from '@/services/bankSettingsService'
import { Modal }            from '@/components/ui/Modal'
import { InvoiceStatusBadge } from '@/components/ui/Badge'
import { formatMoney, formatPeriod, buildVietQRUrl } from '@/utils/format'
import type { Invoice, BankSettings } from '@/types'

export function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const [invoice, setInvoice]   = useState<Invoice | null>(null)
  const [bank, setBank]         = useState<BankSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showQR, setShowQR]     = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!token) return setError('Link không hợp lệ')
      try {
        const [inv, b] = await Promise.all([
          invoiceService.getByShareToken(token),
          bankSettingsService.get(),
        ])
        setInvoice(inv)
        setBank(b)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tìm thấy hóa đơn')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [token])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !invoice) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FB] p-6">
      <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="font-bold text-lg text-slate-900 text-center">{error ?? 'Không tìm thấy hóa đơn'}</h1>
      <p className="text-sm text-slate-500 text-center mt-2">Link có thể đã hết hạn hoặc không hợp lệ</p>
    </div>
  )

  const room   = invoice.room   as unknown as { room_code: string }
  const tenant = invoice.tenant as unknown as { full_name: string; phone: string }

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-dark-bg py-8 px-4">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white font-black text-xl shadow-3d mx-auto">DH</div>
          <h1 className="font-black text-xl text-slate-900 dark:text-white">Hóa đơn tiền phòng</h1>
          <p className="text-xs text-slate-500">Kỳ: {formatPeriod(invoice.period_month, invoice.period_year)}</p>
        </div>

        {/* Invoice card */}
        <div className="bg-white dark:bg-dark-card rounded-3xl border border-slate-100 dark:border-slate-800 shadow-glass overflow-hidden">
          {/* Header band */}
          <div className="hero-gradient p-4 text-white">
            <p className="text-xs text-brand-200 font-medium">{invoice.invoice_code}</p>
            <p className="font-black text-2xl mt-1">{formatMoney(invoice.total_amount)}</p>
            <div className="mt-2"><InvoiceStatusBadge status={invoice.status} /></div>
          </div>

          {/* Details */}
          <div className="p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Người thuê</span>
                <span className="font-bold text-slate-900 dark:text-white">{tenant?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phòng</span>
                <span className="font-bold text-slate-900 dark:text-white">{room?.room_code}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
              {([
                ['🏠 Tiền phòng', invoice.rent_amount],
                ['⚡ Tiền điện', invoice.elec_amount],
                invoice.internet_amount > 0 ? ['📶 Internet', invoice.internet_amount] : null,
                invoice.garbage_amount > 0  ? ['🗑️ Tiền rác', invoice.garbage_amount]  : null,
                invoice.other_amount > 0    ? ['➕ Khoản khác', invoice.other_amount]   : null,
              ] as Array<[string, number] | null>).filter((x): x is [string, number] => x !== null).map(([label, amount]) => (
                <div key={label} className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{label}</span>
                  <span className="font-semibold">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pay button */}
        {invoice.status === 'unpaid' && bank && (
          <button
            onClick={() => setShowQR(true)}
            className="w-full py-4 rounded-2xl hero-gradient text-white font-bold text-sm shadow-3d flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <CreditCard className="w-5 h-5" /> Xem QR thanh toán
          </button>
        )}

        <p className="text-center text-xs text-slate-400">DH — Quản lý phòng trọ thông minh</p>
      </div>

      {/* QR modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="QR Thanh toán" size="sm">
        {bank && (
          <div className="flex flex-col items-center gap-4">
            <img
              src={buildVietQRUrl({ bankId:'VCB', accountNo:bank.account_number, accountName:bank.account_name, amount:invoice.total_amount, description:invoice.invoice_code })}
              alt="QR" className="w-56 h-56 rounded-2xl border"
            />
            <div className="text-center space-y-1 text-sm">
              <p className="font-bold">{bank.account_name}</p>
              <p className="text-slate-500">{bank.account_number} — {bank.bank_name}</p>
              <p className="font-black text-xl text-brand-600">{formatMoney(invoice.total_amount)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
