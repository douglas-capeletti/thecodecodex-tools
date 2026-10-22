import { describe, expect, it } from "vitest"
import { addDaysIso, lineTotal, nextInvoiceNumber, totals } from "./invoice"

describe("invoice", () => {
  it("sums line items with discount then tax", () => {
    const items = [
      { description: "Development", quantity: 160, unitPrice: 45 },
      { description: "Hosting", quantity: 1, unitPrice: 19.99 },
    ]
    expect(lineTotal(items[0]!)).toBe(7200)
    expect(totals(items)).toEqual({ subtotal: 7219.99, discount: 0, tax: 0, total: 7219.99 })
    expect(totals(items, 0.1, 0.05)).toEqual({ subtotal: 7219.99, discount: 722, tax: 324.9, total: 6822.89 })
  })

  it("ignores invalid numbers", () => {
    expect(lineTotal({ description: "x", quantity: Number.NaN, unitPrice: 10 })).toBe(0)
  })

  it("increments invoice numbers keeping prefix and padding", () => {
    expect(nextInvoiceNumber("INV-2026-009")).toBe("INV-2026-010")
    expect(nextInvoiceNumber("42")).toBe("43")
    expect(nextInvoiceNumber("A-99/B")).toBe("A-100/B")
    expect(nextInvoiceNumber("DRAFT")).toBe("DRAFT-2")
  })

  it("adds days to ISO dates across months", () => {
    expect(addDaysIso("2026-01-25", 15)).toBe("2026-02-09")
  })
})
