import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { EMPTY_INVOICE } from "./invoice"
import { invoicePdf } from "./invoice-pdf"

describe("invoice PDF", () => {
  it("renders a one-page PDF, even with characters outside WinAnsi", async () => {
    const bytes = await invoicePdf({
      ...EMPTY_INVOICE,
      number: "INV-2026-014",
      issued: "2026-10-01",
      due: "2026-10-16",
      currency: "EUR",
      from: { name: "Douglas Dev LTDA", details: "Porto Alegre, RS\nCNPJ 12.ABC.345/01DE-35" },
      to: { name: "Acme GmbH", details: "Berlin" },
      items: [{ description: "Software development — September → done ✓", quantity: 160, unitPrice: 45 }],
      discount: 0.1,
    })
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-")
    const reopened = await PDFDocument.load(bytes)
    expect(reopened.getPageCount()).toBe(1)
    expect(reopened.getTitle()).toBe("Invoice INV-2026-014")
  })
})
