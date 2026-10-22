import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib"
import { lineTotal, totals, type Invoice } from "./invoice"

// Gera o PDF do invoice (A4) sem navegador — usado pelo script de terminal. Layout espelha a prévia do site.
const A4: [number, number] = [595.28, 841.89]
const MARGIN = 50
const INK = rgb(0.07, 0.08, 0.12)
const MUTED = rgb(0.29, 0.33, 0.39)
const RULE = rgb(0.9, 0.91, 0.92)

// As fontes padrão do PDF usam WinAnsi: troca o que não existe nela (ex.: "−", "→") por equivalentes
function safe(font: PDFFont, text: string): string {
  return [...text.replace(/−/g, "-").replace(/→/g, "->")]
    .map((char) => {
      try {
        font.encodeText(char)
        return char
      } catch {
        return "?"
      }
    })
    .join("")
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  return text.split("\n").flatMap((paragraph) => {
    const words = paragraph.split(/\s+/)
    const lines: string[] = []
    let line = ""
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(safe(font, candidate), size) > maxWidth && line) {
        lines.push(line)
        line = word
      } else line = candidate
    }
    lines.push(line)
    return lines
  })
}

const longDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "-")

export async function invoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Invoice ${invoice.number}`)
  doc.setCreator("thecodecodex.com")
  const page: PDFPage = doc.addPage(A4)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency })
  const width = A4[0] - MARGIN * 2
  let y = A4[1] - MARGIN

  const text = (value: string, x: number, at: number, size = 10, font = regular, color = INK) => page.drawText(safe(font, value), { x, y: at, size, font, color })
  const right = (value: string, xRight: number, at: number, size = 10, font = regular, color = INK) => text(value, xRight - font.widthOfTextAtSize(safe(font, value), size), at, size, font, color)

  // cabeçalho: número à esquerda, emissor à direita
  text("INVOICE", MARGIN, y, 9, bold, MUTED)
  right(invoice.from.name || "-", MARGIN + width, y, 11, bold)
  y -= 26
  text(invoice.number || "-", MARGIN, y, 22, bold)
  let ry = y + 12
  for (const line of wrap(regular, invoice.from.details, 9, width / 2)) {
    right(line, MARGIN + width, ry, 9, regular, MUTED)
    ry -= 12
  }
  y = Math.min(y, ry) - 28

  // cliente e datas
  text("BILL TO", MARGIN, y, 8, bold, MUTED)
  right(`Issue date   ${longDate(invoice.issued)}`, MARGIN + width, y, 9)
  y -= 14
  text(invoice.to.name || "-", MARGIN, y, 10, bold)
  right(`Due date   ${longDate(invoice.due)}`, MARGIN + width, y, 9)
  y -= 13
  for (const line of wrap(regular, invoice.to.details, 9, width / 2)) {
    text(line, MARGIN, y, 9, regular, MUTED)
    y -= 12
  }
  y -= 18

  // itens
  const cols = { qty: MARGIN + width * 0.62, price: MARGIN + width * 0.8, amount: MARGIN + width }
  text("DESCRIPTION", MARGIN, y, 8, bold)
  right("QTY", cols.qty, y, 8, bold)
  right("UNIT PRICE", cols.price, y, 8, bold)
  right("AMOUNT", cols.amount, y, 8, bold)
  y -= 6
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, thickness: 1.5, color: INK })
  y -= 16
  for (const item of invoice.items) {
    const lines = wrap(regular, item.description || "-", 10, width * 0.5)
    lines.forEach((line, i) => text(line, MARGIN, y - i * 12, 10))
    right(String(item.quantity), cols.qty, y, 10)
    right(money.format(item.unitPrice || 0), cols.price, y, 10)
    right(money.format(lineTotal(item)), cols.amount, y, 10)
    y -= lines.length * 12 + 6
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: MARGIN + width, y: y + 2 }, thickness: 0.5, color: RULE })
    y -= 10
  }

  // totais
  const sum = totals(invoice.items, invoice.discount, invoice.tax)
  const label = MARGIN + width * 0.55
  const row = (name: string, value: string, strong = false) => {
    text(name, label, y, strong ? 11 : 10, strong ? bold : regular, strong ? INK : MUTED)
    right(value, cols.amount, y, strong ? 12 : 10, strong ? bold : regular)
    y -= 16
  }
  y -= 4
  row("Subtotal", money.format(sum.subtotal))
  if (sum.discount > 0) row(`Discount (${+(invoice.discount * 100).toFixed(2)}%)`, `-${money.format(sum.discount)}`)
  if (sum.tax > 0) row(`Tax (${+(invoice.tax * 100).toFixed(2)}%)`, money.format(sum.tax))
  page.drawLine({ start: { x: label, y: y + 10 }, end: { x: MARGIN + width, y: y + 10 }, thickness: 1.5, color: INK })
  y -= 4
  row("Total due", money.format(sum.total), true)
  y -= 22

  // pagamento e observações
  const block = (title: string, body: string, x: number, top: number) => {
    let by = top
    text(title, x, by, 8, bold, MUTED)
    by -= 14
    for (const line of wrap(regular, body, 9.5, width / 2 - 12)) {
      text(line, x, by, 9.5)
      by -= 12
    }
  }
  if (invoice.payment) block("PAYMENT DETAILS", invoice.payment, MARGIN, y)
  if (invoice.notes) block("NOTES", invoice.notes, MARGIN + width / 2 + 12, y)

  return doc.save()
}
