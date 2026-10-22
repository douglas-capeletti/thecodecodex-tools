import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib"

export const TABS = ["organize", "stamp", "metadata", "images"] as const
export type PdfStudioTab = (typeof TABS)[number]

export const ROTATIONS = [0, 90, 180, 270] as const
export type Rotation = (typeof ROTATIONS)[number]

export const NUMBER_POSITIONS = ["bottom-center", "bottom-right", "bottom-left", "top-center", "top-right", "top-left"] as const
export type NumberPosition = (typeof NUMBER_POSITIONS)[number]

export const NUMBER_FORMATS = ["slash", "number", "label"] as const
export type NumberFormat = (typeof NUMBER_FORMATS)[number]

export const WATERMARK_COLORS = ["gray", "red", "blue", "black"] as const
export type WatermarkColor = (typeof WATERMARK_COLORS)[number]

export const IMAGE_FORMATS = ["png", "jpeg"] as const
export type ExportImageFormat = (typeof IMAGE_FORMATS)[number]

export const IMAGE_SCALES = [1, 2, 3] as const
export type ExportImageScale = (typeof IMAGE_SCALES)[number]

export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
}

export interface PdfPageInfo {
  index: number
  width: number
  height: number
  rotation: number
  paper: string
}

export interface PdfInspection {
  pageCount: number
  pages: PdfPageInfo[]
  metadata: PdfMetadata
  formFieldCount: number
  byteLength: number
}

export interface PagePlanItem {
  id: string
  sourceIndex: number
  sourceName: string
  pageIndex: number
  rotationDelta: Rotation
  width: number
  height: number
  originalRotation: number
}

export interface PdfStudioOptions {
  pageRange?: string
  rotation?: Rotation
  pageNumbers?: boolean
  numberPosition?: NumberPosition
  numberFormat?: NumberFormat
  numberStart?: number
  numberLang?: "pt" | "en"
  watermarkText?: string
  watermarkOpacity?: number
  watermarkAngle?: number
  watermarkSize?: number
  watermarkColor?: WatermarkColor
  flattenForms?: boolean
  clearMetadata?: boolean
  metadata?: Partial<PdfMetadata>
  pagePlan?: PagePlanItem[]
}

export const DEFAULT_STUDIO_OPTIONS: Required<Omit<PdfStudioOptions, "metadata" | "pagePlan">> = {
  pageRange: "",
  rotation: 0,
  pageNumbers: false,
  numberPosition: "bottom-center",
  numberFormat: "slash",
  numberStart: 1,
  numberLang: "pt",
  watermarkText: "",
  watermarkOpacity: 22,
  watermarkAngle: -35,
  watermarkSize: 48,
  watermarkColor: "gray",
  flattenForms: false,
  clearMetadata: false,
}

const COLOR_RGB: Record<WatermarkColor, [number, number, number]> = {
  gray: [0.45, 0.48, 0.52],
  red: [0.82, 0.16, 0.16],
  blue: [0.12, 0.36, 0.78],
  black: [0.08, 0.09, 0.12],
}

export function normalizeRotation(deg: number): Rotation {
  const mod = ((Math.round(deg / 90) * 90) % 360 + 360) % 360
  return (mod === 90 || mod === 180 || mod === 270 ? mod : 0) as Rotation
}

// Identifica formatos de papel conhecidos a partir das dimensões em pontos (1 pt = 1/72 pol.)
export function detectPaperSize(widthPt: number, heightPt: number): string {
  const w = Math.min(widthPt, heightPt)
  const h = Math.max(widthPt, heightPt)
  const near = (a: number, b: number) => Math.abs(a - b) <= 6
  if (near(w, 595) && near(h, 842)) return "A4"
  if (near(w, 420) && near(h, 595)) return "A5"
  if (near(w, 842) && near(h, 1191)) return "A3"
  if (near(w, 612) && near(h, 792)) return "Letter"
  if (near(w, 612) && near(h, 1008)) return "Legal"
  return `${Math.round(widthPt)}×${Math.round(heightPt)} pt`
}

// Converte uma expressão como "1-3, 5, 4-2" em índices 0-based na ordem solicitada
export function parsePageRanges(spec: string, totalPages: number): number[] {
  if (totalPages <= 0) return []
  const trimmed = spec.trim()
  if (!trimmed) return Array.from({ length: totalPages }, (_, i) => i)

  const indices: number[] = []
  const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean)
  for (const part of parts) {
    const rangeMatch = /^(\d+)\s*-\s*(\d*)$/.exec(part)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : totalPages
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        throw new Error(`Intervalo fora do limite (1-${totalPages}): ${part}`)
      }
      const step = start <= end ? 1 : -1
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        indices.push(p - 1)
      }
      continue
    }
    if (/^\d+$/.test(part)) {
      const page = Number(part)
      if (page < 1 || page > totalPages) {
        throw new Error(`Página fora do limite (1-${totalPages}): ${part}`)
      }
      indices.push(page - 1)
      continue
    }
    throw new Error(`Intervalo de páginas inválido: ${part}`)
  }
  return indices
}

export function formatPageNumber(index: number, total: number, start: number, format: NumberFormat, lang: "pt" | "en" = "pt"): string {
  const current = index + start
  const last = total - 1 + start
  if (format === "number") return String(current)
  if (format === "label") return lang === "en" ? `Page ${current} of ${last}` : `Página ${current} de ${last}`
  return `${current} / ${last}`
}

export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pages = doc.getPages().map((page, index) => {
    const { width, height } = page.getSize()
    const rotation = normalizeRotation(page.getRotation().angle)
    return {
      index,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      rotation,
      paper: detectPaperSize(width, height),
    }
  })
  let formFieldCount = 0
  try {
    formFieldCount = doc.getForm().getFields().length
  } catch {
    formFieldCount = 0
  }
  const keywordsRaw = doc.getKeywords()
  return {
    pageCount: pages.length,
    pages,
    metadata: {
      title: doc.getTitle() ?? "",
      author: doc.getAuthor() ?? "",
      subject: doc.getSubject() ?? "",
      keywords: keywordsRaw ?? "",
      creator: doc.getCreator() ?? "",
      producer: doc.getProducer() ?? "",
    },
    formFieldCount,
    byteLength: bytes.byteLength,
  }
}

export async function buildInitialPagePlan(sources: { name: string, bytes: Uint8Array }[]): Promise<PagePlanItem[]> {
  const items: PagePlanItem[] = []
  for (let s = 0; s < sources.length; s++) {
    const source = sources[s]
    if (!source) continue
    const info = await inspectPdf(source.bytes)
    for (const p of info.pages) {
      items.push({
        id: `${s}-${p.index}-${Math.random().toString(36).slice(2, 7)}`,
        sourceIndex: s,
        sourceName: source.name,
        pageIndex: p.index,
        rotationDelta: 0,
        width: p.width,
        height: p.height,
        originalRotation: p.rotation,
      })
    }
  }
  return items
}

export async function processPdf(sources: Uint8Array[], rawOptions: PdfStudioOptions = {}): Promise<{ bytes: Uint8Array, inspection: PdfInspection }> {
  if (sources.length === 0) throw new Error("Nenhum PDF de entrada fornecido")
  const opts = { ...DEFAULT_STUDIO_OPTIONS, ...rawOptions }

  const loadedDocs: PDFDocument[] = []
  for (const src of sources) {
    const doc = await PDFDocument.load(src, { ignoreEncryption: true })
    if (opts.flattenForms) {
      try {
        doc.getForm().flatten()
      } catch {
        // Documento sem formulário válido: ignora
      }
    }
    loadedDocs.push(doc)
  }

  // Monta a lista base de páginas (do pagePlan interativo ou de todos os documentos na ordem)
  const basePlan: { sourceIndex: number, pageIndex: number, rotationDelta: Rotation }[] = []
  if (rawOptions.pagePlan && rawOptions.pagePlan.length > 0) {
    for (const item of rawOptions.pagePlan) {
      basePlan.push({ sourceIndex: item.sourceIndex, pageIndex: item.pageIndex, rotationDelta: item.rotationDelta })
    }
  } else {
    for (let s = 0; s < loadedDocs.length; s++) {
      const doc = loadedDocs[s]
      if (!doc) continue
      const count = doc.getPageCount()
      for (let p = 0; p < count; p++) {
        basePlan.push({ sourceIndex: s, pageIndex: p, rotationDelta: 0 })
      }
    }
  }

  const selectedIndices = parsePageRanges(opts.pageRange, basePlan.length)
  if (selectedIndices.length === 0) throw new Error("Nenhuma página selecionada")

  const out = await PDFDocument.create()
  const firstDoc = loadedDocs[0]

  for (const idx of selectedIndices) {
    const entry = basePlan[idx]
    if (!entry) continue
    const srcDoc = loadedDocs[entry.sourceIndex]
    if (!srcDoc) continue
    const [copied] = await out.copyPages(srcDoc, [entry.pageIndex])
    if (!copied) continue
    const currentAngle = copied.getRotation().angle
    const nextAngle = normalizeRotation(currentAngle + entry.rotationDelta + opts.rotation)
    copied.setRotation(degrees(nextAngle))
    out.addPage(copied)
  }

  const outPages = out.getPages()
  const watermarkText = opts.watermarkText.trim()

  if (watermarkText) {
    const boldFont = await out.embedFont(StandardFonts.HelveticaBold)
    const [r, g, b] = COLOR_RGB[opts.watermarkColor] ?? COLOR_RGB.gray
    const size = Math.min(140, Math.max(10, opts.watermarkSize))
    const opacity = Math.min(1, Math.max(0.03, opts.watermarkOpacity / 100))
    const angleRad = (opts.watermarkAngle * Math.PI) / 180

    for (const page of outPages) {
      const { width, height } = page.getSize()
      const textWidth = boldFont.widthOfTextAtSize(watermarkText, size)
      const textHeight = boldFont.heightAtSize(size)
      const cx = width / 2
      const cy = height / 2
      const dx = (textWidth / 2) * Math.cos(angleRad) - (textHeight / 3) * Math.sin(angleRad)
      const dy = (textWidth / 2) * Math.sin(angleRad) + (textHeight / 3) * Math.cos(angleRad)
      page.drawText(watermarkText, {
        x: cx - dx,
        y: cy - dy,
        size,
        font: boldFont,
        color: rgb(r, g, b),
        opacity,
        rotate: degrees(opts.watermarkAngle),
      })
    }
  }

  if (opts.pageNumbers) {
    const font = await out.embedFont(StandardFonts.Helvetica)
    const fontSize = 10
    const margin = 24
    const total = outPages.length

    for (let i = 0; i < total; i++) {
      const page = outPages[i]
      if (!page) continue
      const { width, height } = page.getSize()
      const label = formatPageNumber(i, total, opts.numberStart, opts.numberFormat, opts.numberLang)
      const textWidth = font.widthOfTextAtSize(label, fontSize)
      const isTop = opts.numberPosition.startsWith("top-")
      const y = isTop ? height - margin - fontSize : margin
      let x = (width - textWidth) / 2
      if (opts.numberPosition.endsWith("-left")) x = margin
      else if (opts.numberPosition.endsWith("-right")) x = width - margin - textWidth

      page.drawText(label, {
        x: Math.max(8, x),
        y: Math.max(8, y),
        size: fontSize,
        font,
        color: rgb(0.25, 0.27, 0.32),
      })
    }
  }

  // Metadados: preserva os do primeiro PDF salvo se clearMetadata ou se sobrescritos
  if (opts.clearMetadata) {
    out.setTitle("")
    out.setAuthor("")
    out.setSubject("")
    out.setKeywords([])
    out.setCreator("")
    out.setProducer("")
  } else {
    const meta = rawOptions.metadata
    const title = meta?.title !== undefined ? meta.title : (firstDoc?.getTitle() ?? "")
    const author = meta?.author !== undefined ? meta.author : (firstDoc?.getAuthor() ?? "")
    const subject = meta?.subject !== undefined ? meta.subject : (firstDoc?.getSubject() ?? "")
    const keywords = meta?.keywords !== undefined ? meta.keywords : (firstDoc?.getKeywords() ?? "")
    const creator = meta?.creator !== undefined ? meta.creator : (firstDoc?.getCreator() ?? "")
    if (title) out.setTitle(title)
    if (author) out.setAuthor(author)
    if (subject) out.setSubject(subject)
    if (keywords) out.setKeywords(keywords.split(",").map((k) => k.trim()).filter(Boolean))
    if (creator) out.setCreator(creator)
  }

  const bytes = await out.save()
  const inspection = await inspectPdf(bytes)
  return { bytes, inspection }
}

// Divide o documento em múltiplos PDFs (um por intervalo informado ou um por página se vazio)
export async function splitPdf(source: Uint8Array, rangeSpec = ""): Promise<{ name: string, bytes: Uint8Array, pages: number[] }[]> {
  const srcDoc = await PDFDocument.load(source, { ignoreEncryption: true })
  const total = srcDoc.getPageCount()
  if (total === 0) return []

  const groups: { label: string, indices: number[] }[] = []
  const trimmed = rangeSpec.trim()
  if (!trimmed) {
    for (let i = 0; i < total; i++) {
      groups.push({ label: `page-${i + 1}`, indices: [i] })
    }
  } else {
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean)
    for (const part of parts) {
      const indices = parsePageRanges(part, total)
      if (indices.length > 0) {
        groups.push({ label: `pages-${part.replace(/\s+/g, "")}`, indices })
      }
    }
  }

  const results: { name: string, bytes: Uint8Array, pages: number[] }[] = []
  for (const group of groups) {
    const out = await PDFDocument.create()
    const copied = await out.copyPages(srcDoc, group.indices)
    for (const p of copied) out.addPage(p)
    results.push({
      name: `${group.label}.pdf`,
      bytes: await out.save(),
      pages: group.indices.map((i) => i + 1),
    })
  }
  return results
}

// Gera um PDF de demonstração de 4 páginas (com texto, cores e um campo de formulário) para testes imediatos
export async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle("The Code Codex — Sample Document")
  doc.setAuthor("Douglas Capeletti")
  doc.setSubject("PDF Studio Demo & Test Suite")
  doc.setKeywords(["pdf", "sample", "codex"])
  doc.setCreator("The Code Codex PDF Studio")

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const form = doc.getForm()

  const pagesSpec = [
    { title: "1. Cover & Interactive Form", subtitle: "A4 Portrait · 595 × 842 pt", accent: rgb(0.12, 0.36, 0.78), width: 595.28, height: 841.89 },
    { title: "2. Architecture Overview", subtitle: "A4 Portrait · Client-side PDF processing", accent: rgb(0.08, 0.52, 0.38), width: 595.28, height: 841.89 },
    { title: "3. Wide Diagram Layout", subtitle: "A4 Landscape · 842 × 595 pt", accent: rgb(0.68, 0.28, 0.12), width: 841.89, height: 595.28 },
    { title: "4. Appendix & Notes", subtitle: "A4 Portrait · Ready to split, rotate or stamp", accent: rgb(0.42, 0.2, 0.65), width: 595.28, height: 841.89 },
  ]

  pagesSpec.forEach((spec, idx) => {
    const page = doc.addPage([spec.width, spec.height])
    // Moldura e faixa superior
    page.drawRectangle({ x: 36, y: 36, width: spec.width - 72, height: spec.height - 72, borderColor: rgb(0.82, 0.84, 0.88), borderWidth: 1.5 })
    page.drawRectangle({ x: 36, y: spec.height - 108, width: spec.width - 72, height: 72, color: spec.accent })
    page.drawText("THE CODE CODEX · PDF STUDIO", { x: 56, y: spec.height - 68, size: 10, font: bold, color: rgb(0.92, 0.95, 1) })
    page.drawText(spec.title, { x: 56, y: spec.height - 92, size: 18, font: bold, color: rgb(1, 1, 1) })

    page.drawText(spec.subtitle, { x: 56, y: spec.height - 140, size: 12, font: bold, color: rgb(0.2, 0.22, 0.28) })
    page.drawText(`Original page #${idx + 1} of ${pagesSpec.length}. Try rotating, reordering, watermarking, or adding page numbers.`, {
      x: 56,
      y: spec.height - 165,
      size: 10.5,
      font,
      color: rgb(0.35, 0.38, 0.44),
    })

    // Número grande no centro para facilitar visualização de rotação nas miniaturas
    const bigNum = String(idx + 1)
    const numWidth = bold.widthOfTextAtSize(bigNum, 96)
    page.drawText(bigNum, {
      x: (spec.width - numWidth) / 2,
      y: spec.height / 2 - 36,
      size: 96,
      font: bold,
      color: rgb(0.9, 0.92, 0.95),
    })

    if (idx === 0) {
      page.drawText("Reviewer Note (Form Field):", { x: 56, y: spec.height - 210, size: 10, font: bold, color: rgb(0.2, 0.22, 0.28) })
      const field = form.createTextField("reviewer_note")
      field.setText("Approved — test form flattening in the Stamp tab")
      field.addToPage(page, { x: 56, y: spec.height - 244, width: 320, height: 24 })
    }
  })

  return doc.save()
}
