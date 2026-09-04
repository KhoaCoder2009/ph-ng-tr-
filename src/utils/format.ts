/**
 * Format số tiền sang định dạng Việt Nam
 * Ví dụ: 2500000 => "2.500.000đ"
 */
export function formatMoney(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

/**
 * Format số tiền gọn (triệu)
 * Ví dụ: 2500000 => "2.5tr"
 */
export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1) + 'tr'
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + 'k'
  }
  return amount.toLocaleString('vi-VN') + 'đ'
}

/**
 * Format ngày tháng Việt Nam
 * Ví dụ: "2026-09-03" => "03/09/2026"
 */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

/**
 * Format kỳ hóa đơn
 * Ví dụ: month=9, year=2026 => "09/2026"
 */
export function formatPeriod(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}

/**
 * Lấy tháng/năm hiện tại
 */
export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

/**
 * Parse "MM/YYYY" thành { month, year }
 */
export function parsePeriod(str: string): { month: number; year: number } | null {
  const parts = str.split('/')
  if (parts.length !== 2) return null
  const month = parseInt(parts[0])
  const year = parseInt(parts[1])
  if (isNaN(month) || isNaN(year)) return null
  return { month, year }
}

/**
 * Tạo mã hóa đơn nội bộ
 * Ví dụ: roomCode=101, month=9, year=2026 => "INV-101-09-2026"
 */
export function generateInvoiceCode(roomCode: string, month: number, year: number): string {
  return `INV-${roomCode}-${String(month).padStart(2, '0')}-${year}`
}

/**
 * Lấy danh sách tháng cho dropdown
 */
export function getMonthOptions(count = 12): Array<{ label: string; month: number; year: number }> {
  const result = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: formatPeriod(d.getMonth() + 1, d.getFullYear()),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    })
  }
  return result
}

/**
 * Tạo VietQR URL để tạo QR code
 */
export function buildVietQRUrl(params: {
  bankId: string
  accountNo: string
  accountName: string
  amount: number
  description: string
}): string {
  const { bankId, accountNo, accountName, amount, description } = params
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`
}
