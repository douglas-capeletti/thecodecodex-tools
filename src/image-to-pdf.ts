import { degrees, PDFDocument, rgb } from "pdf-lib"
import { normalizeRotation, type Rotation } from "./pdf-studio"

export const PAGE_SIZES = ["a4", "letter", "legal", "fit"] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export const ORIENTATIONS = ["auto", "portrait", "landscape"] as const
export type Orientation = (typeof ORIENTATIONS)[number]

export const FIT_MODES = ["contain", "cover", "stretch"] as const
export type FitMode = (typeof FIT_MODES)[number]

export const BACKGROUNDS = ["white", "black", "transparent"] as const
export type PageBackground = (typeof BACKGROUNDS)[number]

export type ImageFormat = "png" | "jpeg" | "webp" | "gif" | "bmp" | "unknown"

export interface PdfImageInput {
  name: string
  bytes: Uint8Array
  rotation?: Rotation
}

export interface ImageToPdfOptions {
  pageSize?: PageSize
  orientation?: Orientation
  fit?: FitMode
  margin?: number
  background?: PageBackground
  title?: string
  author?: string
}

export interface PageLayout {
  pageWidth: number
  pageHeight: number
  boxX: number
  boxY: number
  boxWidth: number
  boxHeight: number
  anchorX: number
  anchorY: number
  drawWidth: number
  drawHeight: number
  rotation: Rotation
  imageWidth: number
  imageHeight: number
}

export const DEFAULT_IMAGE_PDF_OPTIONS: Required<ImageToPdfOptions> = {
  pageSize: "a4",
  orientation: "auto",
  fit: "contain",
  margin: 24,
  background: "white",
  title: "",
  author: "",
}

const PAPER_DIMENSIONS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
}

export function detectImageFormat(bytes: Uint8Array): ImageFormat {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png"
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp"
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif"
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp"
  return "unknown"
}

export function computePageLayout(imgWidth: number, imgHeight: number, rawOptions: ImageToPdfOptions = {}, rawRotation: Rotation = 0): PageLayout {
  const opts = { ...DEFAULT_IMAGE_PDF_OPTIONS, ...rawOptions }
  const rotation = normalizeRotation(rawRotation)
  const swapped = rotation === 90 || rotation === 270
  const effectiveW = Math.max(1, swapped ? imgHeight : imgWidth)
  const effectiveH = Math.max(1, swapped ? imgWidth : imgHeight)
  const margin = Math.max(0, Math.min(180, opts.margin))

  let pageWidth: number
  let pageHeight: number

  if (opts.pageSize === "fit") {
    pageWidth = effectiveW + margin * 2
    pageHeight = effectiveH + margin * 2
  } else {
    const [baseW, baseH] = PAPER_DIMENSIONS[opts.pageSize]
    const wantLandscape = opts.orientation === "landscape" || (opts.orientation === "auto" && effectiveW > effectiveH)
    pageWidth = wantLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH)
    pageHeight = wantLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH)
  }

  const availW = Math.max(1, pageWidth - margin * 2)
  const availH = Math.max(1, pageHeight - margin * 2)

  let boxWidth = availW
  let boxHeight = availH

  if (opts.pageSize === "fit") {
    boxWidth = effectiveW
    boxHeight = effectiveH
  } else if (opts.fit === "contain") {
    const scale = Math.min(availW / effectiveW, availH / effectiveH)
    boxWidth = effectiveW * scale
    boxHeight = effectiveH * scale
  } else if (opts.fit === "cover") {
    const scale = Math.max(availW / effectiveW, availH / effectiveH)
    boxWidth = effectiveW * scale
    boxHeight = effectiveH * scale
  }

  const boxX = (pageWidth - boxWidth) / 2
  const boxY = (pageHeight - boxHeight) / 2

  let anchorX = boxX
  let anchorY = boxY
  let drawWidth = boxWidth
  let drawHeight = boxHeight

  if (rotation === 90) {
    anchorX = boxX + boxWidth
    anchorY = boxY
    drawWidth = boxHeight
    drawHeight = boxWidth
  } else if (rotation === 180) {
    anchorX = boxX + boxWidth
    anchorY = boxY + boxHeight
  } else if (rotation === 270) {
    anchorX = boxX
    anchorY = boxY + boxHeight
    drawWidth = boxHeight
    drawHeight = boxWidth
  }

  return {
    pageWidth: Math.round(pageWidth * 100) / 100,
    pageHeight: Math.round(pageHeight * 100) / 100,
    boxX: Math.round(boxX * 100) / 100,
    boxY: Math.round(boxY * 100) / 100,
    boxWidth: Math.round(boxWidth * 100) / 100,
    boxHeight: Math.round(boxHeight * 100) / 100,
    anchorX: Math.round(anchorX * 100) / 100,
    anchorY: Math.round(anchorY * 100) / 100,
    drawWidth: Math.round(drawWidth * 100) / 100,
    drawHeight: Math.round(drawHeight * 100) / 100,
    rotation,
    imageWidth: imgWidth,
    imageHeight: imgHeight,
  }
}

export async function imagesToPdf(images: PdfImageInput[], rawOptions: ImageToPdfOptions = {}): Promise<{ bytes: Uint8Array, pages: PageLayout[] }> {
  if (images.length === 0) throw new Error("Nenhuma imagem fornecida")
  const opts = { ...DEFAULT_IMAGE_PDF_OPTIONS, ...rawOptions }
  const doc = await PDFDocument.create()
  if (opts.title.trim()) doc.setTitle(opts.title.trim())
  if (opts.author.trim()) doc.setAuthor(opts.author.trim())
  doc.setCreator("The Code Codex — Images to PDF")

  const layouts: PageLayout[] = []

  for (const item of images) {
    const fmt = detectImageFormat(item.bytes)
    if (fmt !== "png" && fmt !== "jpeg") {
      throw new Error(`Formato ${fmt} requer conversão para PNG ou JPEG antes de embutir no PDF (${item.name})`)
    }
    const embedded = fmt === "png" ? await doc.embedPng(item.bytes) : await doc.embedJpg(item.bytes)
    const layout = computePageLayout(embedded.width, embedded.height, opts, item.rotation ?? 0)
    layouts.push(layout)

    const page = doc.addPage([layout.pageWidth, layout.pageHeight])
    if (opts.background !== "transparent") {
      const color = opts.background === "black" ? rgb(0.05, 0.06, 0.08) : rgb(1, 1, 1)
      page.drawRectangle({ x: 0, y: 0, width: layout.pageWidth, height: layout.pageHeight, color })
    }

    page.drawImage(embedded, {
      x: layout.anchorX,
      y: layout.anchorY,
      width: layout.drawWidth,
      height: layout.drawHeight,
      rotate: degrees(layout.rotation),
    })
  }

  const bytes = await doc.save()
  return { bytes, pages: layouts }
}

// Gerador puro de PNG RGB (blocos DEFLATE sem compressão + CRC32 + Adler32) para imagens de exemplo em qualquer runtime
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] ?? 0
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
  }
  return (c ^ 0xffffffff) >>> 0
}

function adler32(buf: Uint8Array): number {
  let a = 1
  let b = 0
  for (let i = 0; i < buf.length; i++) {
    a = (a + (buf[i] ?? 0)) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function u32be(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  out.set(u32be(data.length), 0)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  const crc = crc32(out.subarray(4, 8 + data.length))
  out.set(u32be(crc), 8 + data.length)
  return out
}

export function createGradientPng(width: number, height: number, topRgb: [number, number, number], bottomRgb: [number, number, number]): Uint8Array {
  const rowSize = 1 + width * 3
  const raw = new Uint8Array(rowSize * height)
  for (let y = 0; y < height; y++) {
    const t = height > 1 ? y / (height - 1) : 0
    const rowOffset = y * rowSize
    raw[rowOffset] = 0 // filtro None
    for (let x = 0; x < width; x++) {
      const s = width > 1 ? x / (width - 1) : 0
      const border = x < 4 || x >= width - 4 || y < 4 || y >= height - 4
      const p = rowOffset + 1 + x * 3
      raw[p] = border ? 255 : Math.round(topRgb[0] * (1 - t) + bottomRgb[0] * t * (0.75 + 0.25 * s))
      raw[p + 1] = border ? 255 : Math.round(topRgb[1] * (1 - t) + bottomRgb[1] * t)
      raw[p + 2] = border ? 255 : Math.round(topRgb[2] * (1 - t * 0.5) + bottomRgb[2] * t * 0.5)
    }
  }

  // Empacota em blocos zlib stored (máx. 65535 bytes por bloco)
  const maxBlock = 65535
  const numBlocks = Math.ceil(raw.length / maxBlock) || 1
  const zlib = new Uint8Array(2 + raw.length + numBlocks * 5 + 4)
  zlib[0] = 0x78
  zlib[1] = 0x01
  let zPos = 2
  for (let b = 0; b < numBlocks; b++) {
    const start = b * maxBlock
    const slice = raw.subarray(start, Math.min(raw.length, start + maxBlock))
    const len = slice.length
    const nlen = (~len) & 0xffff
    zlib[zPos++] = b === numBlocks - 1 ? 0x01 : 0x00
    zlib[zPos++] = len & 0xff
    zlib[zPos++] = (len >>> 8) & 0xff
    zlib[zPos++] = nlen & 0xff
    zlib[zPos++] = (nlen >>> 8) & 0xff
    zlib.set(slice, zPos)
    zPos += len
  }
  zlib.set(u32be(adler32(raw)), zPos)

  const ihdr = new Uint8Array([...u32be(width), ...u32be(height), 8, 2, 0, 0, 0])
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const cIhdr = pngChunk("IHDR", ihdr)
  const cIdat = pngChunk("IDAT", zlib)
  const cIend = pngChunk("IEND", new Uint8Array(0))

  const png = new Uint8Array(sig.length + cIhdr.length + cIdat.length + cIend.length)
  let offset = 0
  for (const part of [sig, cIhdr, cIdat, cIend]) {
    png.set(part, offset)
    offset += part.length
  }
  return png
}

export function createSampleImages(): PdfImageInput[] {
  return [
    { name: "01-landscape-diagram.png", bytes: createGradientPng(160, 100, [30, 92, 198], [16, 165, 135]), rotation: 0 },
    { name: "02-portrait-scan.png", bytes: createGradientPng(100, 150, [110, 48, 175], [215, 75, 115]), rotation: 0 },
    { name: "03-square-chart.png", bytes: createGradientPng(120, 120, [210, 105, 30], [45, 65, 115]), rotation: 0 },
  ]
}
