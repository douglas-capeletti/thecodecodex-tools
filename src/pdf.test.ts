import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { computePageLayout, createGradientPng, createSampleImages, detectImageFormat, imagesToPdf } from "./image-to-pdf"
import { createSamplePdf, detectPaperSize, formatPageNumber, inspectPdf, parsePageRanges, processPdf, splitPdf } from "./pdf-studio"

describe("pdf-studio logic", () => {
  it("parses page ranges including single pages, intervals and reverse ranges", () => {
    expect(parsePageRanges("", 4)).toEqual([0, 1, 2, 3])
    expect(parsePageRanges("1, 3-4", 4)).toEqual([0, 2, 3])
    expect(parsePageRanges("4-2", 4)).toEqual([3, 2, 1])
    expect(parsePageRanges("2-", 4)).toEqual([1, 2, 3])
    expect(() => parsePageRanges("0", 4)).toThrow()
    expect(() => parsePageRanges("1-9", 4)).toThrow()
    expect(() => parsePageRanges("abc", 4)).toThrow()
  })

  it("detects standard paper sizes and formats page numbers", () => {
    expect(detectPaperSize(595.28, 841.89)).toBe("A4")
    expect(detectPaperSize(841.89, 595.28)).toBe("A4")
    expect(detectPaperSize(612, 792)).toBe("Letter")
    expect(detectPaperSize(612, 1008)).toBe("Legal")
    expect(detectPaperSize(300, 400)).toBe("300×400 pt")

    expect(formatPageNumber(0, 4, 1, "slash")).toBe("1 / 4")
    expect(formatPageNumber(2, 4, 10, "number")).toBe("12")
    expect(formatPageNumber(1, 4, 1, "label", "pt")).toBe("Página 2 de 4")
    expect(formatPageNumber(1, 4, 1, "label", "en")).toBe("Page 2 of 4")
  })

  it("creates a sample PDF with 4 pages, metadata and form fields", async () => {
    const sample = await createSamplePdf()
    const info = await inspectPdf(sample)
    expect(info.pageCount).toBe(4)
    expect(info.formFieldCount).toBe(1)
    expect(info.metadata.title).toContain("The Code Codex")
    expect(info.pages[0]?.paper).toBe("A4")
    expect(info.pages[2]?.width).toBeGreaterThan(info.pages[2]?.height ?? 0)
  })

  it("merges multiple PDFs, filters by page range, rotates, stamps, flattens forms and updates metadata", async () => {
    const sample = await createSamplePdf()
    const { bytes, inspection } = await processPdf([sample, sample], {
      pageRange: "1, 5, 8",
      rotation: 90,
      pageNumbers: true,
      numberPosition: "bottom-right",
      numberFormat: "slash",
      watermarkText: "CONFIDENTIAL",
      watermarkColor: "red",
      flattenForms: true,
      metadata: {
        title: "Merged Spec",
        author: "Codex Bot",
        subject: "Testing",
        keywords: "alpha, beta",
      },
    })

    expect(inspection.pageCount).toBe(3)
    expect(inspection.formFieldCount).toBe(0)
    expect(inspection.pages[0]?.rotation).toBe(90)
    expect(inspection.metadata.title).toBe("Merged Spec")
    expect(inspection.metadata.author).toBe("Codex Bot")
    expect(bytes.byteLength).toBeGreaterThan(500)

    // clearMetadata limpa todos os campos
    const cleared = await processPdf([bytes], { clearMetadata: true })
    expect(cleared.inspection.metadata.title).toBe("")
    expect(cleared.inspection.metadata.author).toBe("")
  })

  it("splits a PDF into individual pages or custom range groups", async () => {
    const sample = await createSamplePdf()
    const singlePages = await splitPdf(sample)
    expect(singlePages).toHaveLength(4)
    expect(singlePages[0]?.pages).toEqual([1])

    const grouped = await splitPdf(sample, "1-2, 3-4")
    expect(grouped).toHaveLength(2)
    expect((await PDFDocument.load(grouped[0]!.bytes)).getPageCount()).toBe(2)
  })
})

describe("image-to-pdf logic", () => {
  it("generates valid PNG bytes and detects image format", () => {
    const png = createGradientPng(32, 24, [20, 40, 80], [100, 180, 240])
    expect(detectImageFormat(png)).toBe("png")
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg")
    expect(detectImageFormat(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe("gif")
  })

  it("computes page layouts for auto orientation, margins and rotations", () => {
    // Imagem paisagem (800x400) em A4 com orientação auto -> folha paisagem (841.89 x 595.28)
    const landscape = computePageLayout(800, 400, { pageSize: "a4", orientation: "auto", fit: "contain", margin: 20 }, 0)
    expect(landscape.pageWidth).toBeGreaterThan(landscape.pageHeight)
    expect(landscape.boxX).toBeGreaterThanOrEqual(20)

    // Mesma imagem girada 90° vira retrato (400x800) -> folha retrato
    const rotated = computePageLayout(800, 400, { pageSize: "a4", orientation: "auto", fit: "contain", margin: 20 }, 90)
    expect(rotated.pageHeight).toBeGreaterThan(rotated.pageWidth)
    expect(rotated.rotation).toBe(90)

    // Modo fit ajusta a folha ao tamanho exato da imagem + 2 * margem
    const fitted = computePageLayout(300, 200, { pageSize: "fit", margin: 15 }, 0)
    expect(fitted.pageWidth).toBe(330)
    expect(fitted.pageHeight).toBe(230)
  })

  it("embeds sample PNG images into a multi-page PDF", async () => {
    const samples = createSampleImages()
    const { bytes, pages } = await imagesToPdf(samples, {
      pageSize: "a4",
      orientation: "auto",
      fit: "contain",
      margin: 24,
      background: "white",
      title: "Photo Album",
      author: "Douglas",
    })
    expect(pages).toHaveLength(3)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(3)
    expect(doc.getTitle()).toBe("Photo Album")
  })
})
