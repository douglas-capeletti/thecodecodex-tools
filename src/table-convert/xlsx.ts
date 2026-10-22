// Excel (.xlsx) sem dependências: um .xlsx é um ZIP de arquivos XML (SpreadsheetML).
// Escrita: uma aba, cabeçalho em negrito e congelado, filtro, larguras de coluna e células tipadas.
// Leitura: todas as abas, textos compartilhados, fórmulas (valor calculado), datas e células mescladas.
import { uniqueKeys, type Table } from "./model"
import { decodeEntities } from "./parse"
import { columnKinds, displayWidth, typedRows, type SerializeOptions } from "./serialize"
import { unzip, zip, ZipError } from "./zip"

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// ---------- escrita ----------

export function columnName(index: number): string {
  let name = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

// caracteres de controle são proibidos em XML; o Excel limita a célula a 32.767 caracteres
const xmlText = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
    .slice(0, 32767)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

export function sheetName(name: string | undefined): string {
  const clean = (name ?? "").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31)
  return clean || "Sheet1"
}

// Datas ISO (2026-10-21 ou 2026-10-21 13:45[:00]) viram datas de verdade no Excel
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/

export function excelSerial(iso: string): number | undefined {
  const m = ISO_DATE.exec(iso)
  if (!m) return undefined
  const [year, month, day, hour, minute, second] = m.slice(1).map((v) => Number(v ?? 0)) as number[]
  const ms = Date.UTC(year as number, (month as number) - 1, day, hour, minute, second)
  const check = new Date(ms)
  if (check.getUTCMonth() !== (month as number) - 1 || check.getUTCDate() !== day) return undefined
  return ms / 86_400_000 + 25569
}

// estilos (índices de cellXfs): 0 normal, 1 cabeçalho em negrito, 2 data, 3 data e hora
const DATE_STYLE = ' s="2"'
const DATETIME_STYLE = ' s="3"'

export function toXlsx(t: Table, o: SerializeOptions & { sheet?: string } = {}): Uint8Array {
  const header = o.header ?? true
  const kinds = columnKinds(t, o)
  const rows = typedRows(t, o, kinds)
  // coluna de datas: todos os valores preenchidos são datas ISO válidas
  const dateColumns = t.columns.map((_, i) => {
    if (!(o.types ?? true) || kinds[i] !== "text") return undefined
    const values = t.rows.map((r) => r[i] ?? "").filter((c) => c !== "")
    if (!values.length || !values.every((c) => excelSerial(c) !== undefined)) return undefined
    return values.some((c) => c.length > 10) ? "datetime" : "date"
  })
  const cell = (ref: string, value: string | number | boolean | null, style = "", column = -1) => {
    if (value === null || value === "") return ""
    const date = dateColumns[column]
    if (date && typeof value === "string") return `<c r="${ref}"${date === "date" ? DATE_STYLE : DATETIME_STYLE}><v>${excelSerial(value)}</v></c>`
    if (typeof value === "number") return `<c r="${ref}"${style}><v>${value}</v></c>`
    if (typeof value === "boolean") return `<c r="${ref}"${style} t="b"><v>${value ? 1 : 0}</v></c>`
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`
  }
  const lines: string[] = []
  const offset = header ? 1 : 0
  if (header) lines.push(`<row r="1">${uniqueKeys(t.columns).map((name, c) => cell(`${columnName(c)}1`, name, ' s="1"')).join("")}</row>`)
  rows.forEach((r, i) => lines.push(`<row r="${i + 1 + offset}">${r.map((v, c) => cell(`${columnName(c)}${i + 1 + offset}`, v ?? null, "", c)).join("")}</row>`))
  const widths = t.columns.map((name, c) => Math.min(60, Math.max(8, displayWidth(name) + 2, ...t.rows.slice(0, 500).map((r) => displayWidth(r[c] ?? "") + 2))))
  const last = `${columnName(Math.max(0, t.columns.length - 1))}${Math.max(1, rows.length + offset)}`
  const sheet =
    XML_HEAD +
    `<worksheet xmlns="${MAIN}" xmlns:r="${REL}">` +
    (header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "") +
    (widths.length ? `<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "") +
    `<sheetData>${lines.join("")}</sheetData>` +
    (header && t.columns.length ? `<autoFilter ref="A1:${last}"/>` : "") +
    "</worksheet>"
  const styles =
    XML_HEAD +
    `<styleSheet xmlns="${MAIN}">` +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd\\ hh:mm:ss"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>"
  const files: Record<string, string> = {
    "[Content_Types].xml":
      XML_HEAD +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      "</Types>",
    "_rels/.rels": XML_HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": XML_HEAD + `<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="${xmlText(sheetName(o.sheet))}" sheetId="1" r:id="rId1"/></sheets>` + (header && t.columns.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheetName(o.sheet).replace(/'/g, "''")}'!$A$1:$${columnName(t.columns.length - 1)}$${Math.max(1, rows.length + 1)}</definedName></definedNames>` : "") + "</workbook>",
    "xl/_rels/workbook.xml.rels": XML_HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": sheet,
    "xl/styles.xml": styles,
  }
  const encoder = new TextEncoder()
  return zip(Object.entries(files).map(([name, text]) => ({ name, data: encoder.encode(text) })))
}

// ---------- leitura ----------

export interface Sheet {
  name: string
  rows: string[][]
}

export class XlsxError extends Error {}

export const isZip = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04

const attr = (attrs: string, name: string) => {
  const match = new RegExp(`(?:^|\\s)(?:\\w+:)?${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs)
  return match ? decodeEntities(match[2] ?? match[3] ?? "") : undefined
}
// OOXML escapa caracteres de controle como _x000D_
const ooxmlText = (text: string) => decodeEntities(text).replace(/_x([\da-fA-F]{4})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
const runsText = (xml: string) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)].map((m) => ooxmlText(m[1] ?? "")).join("")

// Formatos numéricos de data/hora embutidos no Excel
const DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57])

function isDateFormat(code: string): boolean {
  const bare = code
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "")
    .replace(/\[(?!h\]|m\]|s\])[^\]]*\]/gi, "")
  return /[dmyhs]/i.test(bare) && !/^general$/i.test(code.trim())
}

const pad2 = (n: number) => String(n).padStart(2, "0")

// Número de série do Excel → data ISO (sistema 1900, ou 1904 de planilhas antigas do Mac)
export function excelDate(serial: number, date1904 = false): string {
  const days = serial + (date1904 ? 1462 : 0)
  const ms = Math.round((days - 25569) * 86_400_000)
  const d = new Date(ms)
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
  if (serial < 1 && !date1904) return time
  return Number.isInteger(Math.round(serial * 86400) / 86400) ? date : `${date} ${time}`
}

function cellIndex(ref: string | undefined): [number, number] | undefined {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(ref ?? "")
  if (!match) return undefined
  const letters = (match[1] ?? "").toUpperCase()
  let column = 0
  for (const ch of letters) column = column * 26 + (ch.charCodeAt(0) - 64)
  return [Number(match[2]) - 1, column - 1]
}

function resolvePath(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1)
  const parts = base.split("/").slice(0, -1)
  for (const part of target.split("/")) {
    if (part === "..") parts.pop()
    else if (part !== ".") parts.push(part)
  }
  return parts.join("/")
}

export async function readXlsx(bytes: Uint8Array): Promise<Sheet[]> {
  let files: ReturnType<typeof unzip>
  try {
    files = unzip(bytes)
  } catch (error) {
    throw new XlsxError(error instanceof ZipError ? error.message : String(error))
  }
  const decoder = new TextDecoder()
  const text = async (path: string) => {
    const get = files.get(path)
    return get ? decoder.decode(await get()) : undefined
  }
  const rels = async (path: string) => {
    const dir = path.split("/").slice(0, -1).join("/")
    const xml = (await text(`${dir ? `${dir}/` : ""}_rels/${path.split("/").pop()}.rels`)) ?? ""
    return new Map([...xml.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [attr(m[1] ?? "", "Id") ?? "", { target: attr(m[1] ?? "", "Target") ?? "", type: attr(m[1] ?? "", "Type") ?? "" }]))
  }

  const root = [...(await rels("")).values()].find((r) => r.type.endsWith("/officeDocument"))
  const workbookPath = root ? resolvePath("", root.target) : "xl/workbook.xml"
  const workbook = await text(workbookPath)
  if (!workbook) throw new XlsxError(files.has("word/document.xml") ? "this is a Word file, not a spreadsheet" : "workbook.xml not found (is this an .xlsx?)")
  const date1904 = /<workbookPr\b[^>]*date1904\s*=\s*["'](1|true)["']/i.test(workbook)
  const workbookRels = await rels(workbookPath)

  const sharedTarget = [...workbookRels.values()].find((r) => r.type.endsWith("/sharedStrings"))
  const sharedXml = (await text(sharedTarget ? resolvePath(workbookPath, sharedTarget.target) : "xl/sharedStrings.xml")) ?? ""
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)].map((m) => runsText(m[1] ?? ""))

  const stylesTarget = [...workbookRels.values()].find((r) => r.type.endsWith("/styles"))
  const stylesXml = (await text(stylesTarget ? resolvePath(workbookPath, stylesTarget.target) : "xl/styles.xml")) ?? ""
  const customFormats = new Map([...stylesXml.matchAll(/<numFmt\b([^>]*)\/?>/g)].map((m) => [Number(attr(m[1] ?? "", "numFmtId")), attr(m[1] ?? "", "formatCode") ?? ""]))
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? ""
  const dateStyles = [...cellXfs.matchAll(/<xf\b([^>]*?)(?:\/>|>)/g)].map((m) => {
    const id = Number(attr(m[1] ?? "", "numFmtId") ?? 0)
    return DATE_FORMATS.has(id) || (customFormats.has(id) && isDateFormat(customFormats.get(id) ?? ""))
  })

  const sheets: Sheet[] = []
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = m[1] ?? ""
    const rel = workbookRels.get(attr(attrs, "id") ?? "")
    if (!rel || !rel.type.endsWith("/worksheet")) continue
    const xml = (await text(resolvePath(workbookPath, rel.target))) ?? ""
    const grid: string[][] = []
    let nextRow = 0
    for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = Number(attr(rowMatch[1] ?? "", "r") ?? nextRow + 1) - 1
      nextRow = r + 1
      const row: string[] = []
      let nextColumn = 0
      for (const c of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const cAttrs = c[1] ?? ""
        const body = c[2] ?? ""
        const column = cellIndex(attr(cAttrs, "r"))?.[1] ?? nextColumn
        nextColumn = column + 1
        const type = attr(cAttrs, "t") ?? "n"
        const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1]
        let value = ""
        if (type === "s") value = shared[Number(raw)] ?? ""
        else if (type === "inlineStr") value = runsText(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? "")
        else if (type === "b") value = raw === "1" ? "true" : raw === "0" ? "false" : ""
        else if (raw !== undefined && type === "n") {
          const n = Number(raw)
          value = !Number.isFinite(n) ? raw : dateStyles[Number(attr(cAttrs, "s") ?? 0)] ? excelDate(n, date1904) : String(n)
        } else if (raw !== undefined) value = ooxmlText(raw)
        row[column] = value
      }
      grid[r] = Array.from(row, (v) => v ?? "")
    }
    // células mescladas: o valor do canto superior esquerdo se repete no intervalo
    for (const merge of xml.matchAll(/<mergeCell\b[^>]*ref\s*=\s*["']([^"']+)["']/g)) {
      const [from, to] = (merge[1] ?? "").split(":").map(cellIndex)
      if (!from || !to) continue
      const value = grid[from[0]]?.[from[1]] ?? ""
      for (let r = from[0]; r <= Math.min(to[0], from[0] + 10_000); r++) for (let c = from[1]; c <= Math.min(to[1], from[1] + 1000); c++) (grid[r] ??= [])[c] = value
    }
    const rows = Array.from(grid, (r) => Array.from(r ?? [], (v) => v ?? "")).filter((r) => r.some((v) => v !== ""))
    sheets.push({ name: attr(attrs, "name") ?? `Sheet${sheets.length + 1}`, rows })
  }
  if (sheets.length === 0) throw new XlsxError("no worksheets found")
  return sheets
}
