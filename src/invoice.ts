import type { UrlCodec } from "./url-codec"

// Invoice para clientes no exterior: totais e numeração sequencial

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  tax: number
  total: number
}

const cents = (value: number) => Math.round(value * 100) / 100

export function lineTotal(item: InvoiceItem): number {
  return cents((Number.isFinite(item.quantity) ? item.quantity : 0) * (Number.isFinite(item.unitPrice) ? item.unitPrice : 0))
}

// desconto e imposto em fração (0.1 = 10%); o imposto incide depois do desconto
export function totals(items: InvoiceItem[], discountRate = 0, taxRate = 0): InvoiceTotals {
  const subtotal = cents(items.reduce((sum, item) => sum + lineTotal(item), 0))
  const discount = cents(subtotal * discountRate)
  const tax = cents((subtotal - discount) * taxRate)
  return { subtotal, discount, tax, total: cents(subtotal - discount + tax) }
}

// Próximo número mantendo prefixo e zeros: "INV-2026-009" → "INV-2026-010"; sem número no fim → acrescenta "-2"
export function nextInvoiceNumber(current: string): string {
  const match = current.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return current ? `${current}-2` : "1"
  const [, prefix = "", digits = "0", suffix = ""] = match
  const next = String(Number(digits) + 1).padStart(digits.length, "0")
  return `${prefix}${next}${suffix}`
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Modelo completo do invoice: o mesmo JSON do link do site (#invoice=...) e do parâmetro invoice= do script de terminal
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "BRL"] as const

export interface Party {
  name: string
  details: string
}

export interface Invoice {
  number: string
  issued: string
  due: string
  currency: (typeof CURRENCIES)[number]
  from: Party
  to: Party
  items: InvoiceItem[]
  discount: number
  tax: number
  payment: string
  notes: string
}

export const EMPTY_INVOICE: Invoice = {
  number: "INV-001",
  issued: "",
  due: "",
  currency: "USD",
  from: { name: "", details: "" },
  to: { name: "", details: "" },
  items: [{ description: "Software development services", quantity: 1, unitPrice: 0 }],
  discount: 0,
  tax: 0,
  payment: "",
  notes: "Payment due within 15 days. Thank you for your business!",
}

// Invoice inteiro como JSON no fragmento (#) da URL
export const invoiceCodec: UrlCodec<Invoice> = {
  parse: (raw) => {
    try {
      const value = JSON.parse(raw) as Partial<Invoice>
      return value && Array.isArray(value.items) ? { ...EMPTY_INVOICE, ...value } : undefined
    } catch {
      return undefined
    }
  },
  format: (value) => JSON.stringify(value),
}
