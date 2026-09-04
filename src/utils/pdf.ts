import jsPDF from 'jspdf'
import type { BankSettings, ElectricityReading, Invoice } from '@/types'
import { buildVietQRUrl, formatMoney, formatPeriod } from './format'

async function addVietnameseFont(doc: jsPDF): Promise<void> {
  const fontUrl = 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf'
  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error('Không thể tải font tiếng Việt cho PDF')
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  const base64 = btoa(binary)
  doc.addFileToVFS('NotoSans-Regular.ttf', base64)
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
  doc.setFont('NotoSans', 'normal')
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`QR request failed: ${response.status}`)
  const blob = await response.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không thể đọc ảnh QR'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Xuất bill tiền điện PDF chuyên nghiệp
 */
export async function exportElectricityPDF(reading: ElectricityReading & { room_code: string; tenant_name: string }): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  doc.setCharSpace(0)
  await addVietnameseFont(doc)

  const W = doc.internal.pageSize.getWidth()
  const blue = [79, 70, 229] as [number, number, number]
  const dark = [15, 23, 42] as [number, number, number]
  const gray = [100, 116, 139] as [number, number, number]

  // Header gradient band
  doc.setFillColor(...blue)
  doc.rect(0, 0, W, 28, 'F')

  // Logo text
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('DH', 10, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('QUAN LY PHONG TRO THONG MINH', 10, 23)

  // Bill title (right aligned)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('HOA DON TIEN DIEN', W - 10, 16, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ky: ${formatPeriod(reading.period_month, reading.period_year)}`, W - 10, 23, { align: 'right' })

  // Info block
  doc.setTextColor(...dark)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('THONG TIN PHONG', 10, 36)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('Phong:', 10, 44)
  doc.text('Nguoi thue:', 10, 51)
  doc.text('Ky tinh:', 10, 58)

  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'bold')
  doc.text(reading.room_code, 45, 44)
  doc.text(reading.tenant_name, 45, 51)
  doc.text(formatPeriod(reading.period_month, reading.period_year), 45, 58)

  // Divider
  doc.setDrawColor(229, 231, 235)
  doc.line(10, 63, W - 10, 63)

  // Electricity table
  doc.setTextColor(...dark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('CHI SO DIEN', 10, 71)

  const rows = [
    ['Chi so cu', String(reading.old_reading), 'kWh'],
    ['Chi so moi', String(reading.new_reading), 'kWh'],
    ['Tieu thu', String(reading.consumption), 'kWh'],
    ['Đơn giá', formatMoney(reading.unit_price), '/kWh'],
  ]

  let y = 79
  doc.setFontSize(9)
  rows.forEach(([label, value, unit]) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(label, 10, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...dark)
    doc.text(value, W - 30, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(unit, W - 10, y, { align: 'right' })
    y += 8
  })

  // Total
  doc.setFillColor(238, 242, 255)
  doc.roundedRect(10, y, W - 20, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...blue)
  doc.text('THANH TIEN:', 14, y + 9)
  doc.setFontSize(13)
  doc.text(formatMoney(reading.total_amount), W - 14, y + 9, { align: 'right' })

  // Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gray)
  doc.text('Cam on ban da su dung dich vu cua DH', W / 2, 140, { align: 'center' })
  doc.text(`In ngay: ${new Date().toLocaleDateString('vi-VN')}`, W / 2, 145, { align: 'center' })

  doc.save(`bill-dien-phong${reading.room_code}-${formatPeriod(reading.period_month, reading.period_year).replace('/', '-')}.pdf`)
}

/**
 * Xuất hóa đơn PDF
 */
export async function exportInvoicePDF(invoice: Invoice & { room_code: string; tenant_name: string }, bank?: BankSettings | null): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  doc.setCharSpace(0)
  await addVietnameseFont(doc)
  const W = doc.internal.pageSize.getWidth()
  const dark = [15, 23, 42] as [number, number, number]
  const gray = [71, 85, 105] as [number, number, number]
  const left = 10
  const right = W - 10
  const isPaid = invoice.status === 'paid'
  const items = [
    ['Tiền phòng', invoice.rent_amount],
    ['Tiền điện', invoice.elec_amount],
    ['Internet', invoice.internet_amount],
    ['Tiền rác', invoice.garbage_amount],
    ['Khoản khác', invoice.other_amount],
  ].filter(([, amount]) => Number(amount) > 0) as Array<[string, number]>

  doc.setTextColor(...dark)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(14)
  doc.text('DH - QUẢN LÝ PHÒNG TRỌ', W / 2, 13, { align: 'center' })
  doc.setFontSize(16)
  doc.text('PHIẾU THANH TOÁN', W / 2, 22, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`Số HĐ: ${invoice.invoice_code}`, W / 2, 29, { align: 'center' })

  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Kỳ thanh toán: ${formatPeriod(invoice.period_month, invoice.period_year)}`, left, 39)
  doc.text(`Phòng: ${invoice.room_code}`, left, 46)
  doc.text(`Người thuê: ${invoice.tenant_name}`, left, 53)
  doc.text(`Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, right, 39, { align: 'right' })
  doc.text(`Trạng thái: ${isPaid ? 'ĐÃ THANH TOÁN' : 'CÒN PHẢI THU'}`, right, 46, { align: 'right' })

  const tableTop = 59
  const nameX = left + 3
  const qtyX = 91
  const unitX = 119
  const amountX = right - 3
  doc.setDrawColor(...dark)
  doc.setLineWidth(0.25)
  doc.rect(left, tableTop, right - left, 10)
  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(8.5)
  doc.text('Tên khoản thu', nameX, tableTop + 6.5)
  doc.text('SL', qtyX, tableTop + 6.5, { align: 'center' })
  doc.text('ĐG', unitX, tableTop + 6.5, { align: 'right' })
  doc.text('Thành tiền', amountX, tableTop + 6.5, { align: 'right' })

  let y = tableTop + 10
  doc.setFont('NotoSans', 'normal')
  items.forEach(([name, amount]) => {
    const lines = doc.splitTextToSize(name, 57) as string[]
    const rowHeight = Math.max(9, lines.length * 4.5 + 4)
    doc.rect(left, y, right - left, rowHeight)
    doc.text(lines, nameX, y + 5)
    doc.text('1', qtyX, y + 5, { align: 'center' })
    doc.text(formatMoney(amount), unitX, y + 5, { align: 'right' })
    doc.text(formatMoney(amount), amountX, y + 5, { align: 'right' })
    y += rowHeight
  })

  doc.setFont('NotoSans', 'bold')
  doc.setFontSize(10)
  doc.text('Tổng tiền hàng', nameX, y + 8)
  doc.text(formatMoney(invoice.total_amount), amountX, y + 8, { align: 'right' })
  y += 15
  doc.setLineWidth(0.7)
  doc.line(left, y, right, y)
  doc.setFontSize(12)
  doc.text('TỔNG THANH TOÁN', nameX, y + 9)
  doc.text(formatMoney(invoice.total_amount), amountX, y + 9, { align: 'right' })
  y += 17
  doc.setFontSize(10)
  doc.text('Còn phải thu', nameX, y)
  doc.text(isPaid ? formatMoney(0) : formatMoney(invoice.total_amount), amountX, y, { align: 'right' })
  doc.setFont('NotoSans', 'normal')
  doc.setFontSize(8.5)
  doc.text(isPaid ? 'Cảm ơn bạn đã thanh toán.' : 'Vui lòng kiểm tra kỹ nội dung trước khi thanh toán.', W / 2, y + 10, { align: 'center' })

  if (bank?.account_number && bank.account_name && !isPaid) {
    const qrUrl = buildVietQRUrl({ bankId: 'VCB', accountNo: bank.account_number, accountName: bank.account_name, amount: invoice.total_amount, description: invoice.invoice_code })
    const qrDataUrl = await imageUrlToDataUrl(qrUrl)
    doc.addImage(qrDataUrl, 'PNG', W / 2 - 25, y + 15, 50, 50)
    doc.setFont('NotoSans', 'bold')
    doc.setFontSize(8)
    doc.text(bank.bank_name, W / 2, y + 69, { align: 'center' })
    doc.setFont('NotoSans', 'normal')
    doc.text(`${bank.account_name} - ${bank.account_number}`, W / 2, y + 74, { align: 'center' })
  }

  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text('DH - Quản lý phòng trọ thông minh', W / 2, 202, { align: 'center' })
  doc.save(`hoa-don-phong${invoice.room_code}-${formatPeriod(invoice.period_month, invoice.period_year).replace('/', '-')}.pdf`)
}
