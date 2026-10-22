import { normalize, TableParseError, type Table } from "./model"

export const INPUT_FORMATS = ["auto", "csv", "json", "markdown", "html"] as const
export type InputFormat = (typeof INPUT_FORMATS)[number]
export type ConcreteInput = Exclude<InputFormat, "auto">

export const DELIMITERS = { comma: ",", semicolon: ";", tab: "\t", pipe: "|" } as const
export type Delimiter = keyof typeof DELIMITERS
export const DELIMITER_NAMES = Object.keys(DELIMITERS) as Delimiter[]

export interface ParseOptions {
  from?: InputFormat
  delimiter?: Delimiter | "auto"
  header?: boolean
}

export interface Parsed {
  table: Table
  format: ConcreteInput
  delimiter?: Delimiter
}

// ---------- detecção ----------

export function detectFormat(text: string): ConcreteInput {
  const start = text.trimStart()
  if (start.startsWith("[") || start.startsWith("{")) return "json"
  if (/^<(!doctype|html|table|thead|tbody|tr|div|body)\b/i.test(start) || /<table[\s>]/i.test(start)) return "html"
  const lines = start.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length >= 2 && lines[0]?.trim().startsWith("|") && isMarkdownSeparator(lines[1] ?? "")) return "markdown"
  return "csv"
}

// Escolhe o separador que dá o mesmo número (> 1) de colunas no maior número de linhas.
// Em empate vence a ordem: tab (colado do Excel/Sheets), ponto-e-vírgula (Excel em pt-BR), vírgula, barra.
export function detectDelimiter(text: string): Delimiter {
  const sample = text.split(/\r?\n/).slice(0, 30).join("\n")
  let best: { name: Delimiter, score: number } = { name: "comma", score: 0 }
  for (const name of ["tab", "semicolon", "comma", "pipe"] as const) {
    const rows = parseDelimited(sample, DELIMITERS[name]).filter((r) => r.length > 1 || r[0] !== "")
    if (rows.length === 0) continue
    const counts = new Map<number, number>()
    for (const r of rows) counts.set(r.length, (counts.get(r.length) ?? 0) + 1)
    const [width, hits] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? [1, 0]
    if (width < 2) continue
    const score = (hits / rows.length) * 1000 + width
    if (score > best.score) best = { name, score }
  }
  return best.name
}

// ---------- CSV / TSV (RFC 4180) ----------

export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  let i = 0
  const input = text.replace(/^﻿/, "")
  while (i < input.length) {
    const ch = input[i] as string
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === "") quoted = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
    i++
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  // linhas totalmente vazias (ex.: final do arquivo) não contam
  return rows.filter((r) => r.some((c) => c !== ""))
}

// ---------- Markdown ----------

const isMarkdownSeparator = (line: string) => /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(line) && line.includes("-")

function splitMarkdownRow(line: string): string[] {
  let body = line.trim()
  if (body.startsWith("|")) body = body.slice(1)
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1)
  const cells: string[] = []
  let cell = ""
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === "\\" && body[i + 1] === "|") {
      cell += "|"
      i++
    } else if (ch === "|") {
      cells.push(cell)
      cell = ""
    } else cell += ch
  }
  cells.push(cell)
  return cells.map((c) => c.trim().replace(/<br\s*\/?>/gi, "\n"))
}

export function parseMarkdown(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.includes("|") && !isMarkdownSeparator(line))
    .map(splitMarkdownRow)
}

// ---------- HTML ----------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", reg: "®", hellip: "…", mdash: "—", ndash: "–" }

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

// Parser leve de propósito (sem DOM): funciona igual no navegador e no terminal. Lê a primeira <table>;
// colspan repete a célula vazia para manter as colunas alinhadas.
export function parseHtml(text: string): string[][] {
  const clean = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
  const table = /<table\b[\s\S]*?<\/table>/i.exec(clean)?.[0] ?? clean
  const rows: string[][] = []
  for (const tr of table.match(/<tr\b[\s\S]*?(?=<tr\b|<\/tbody|<\/thead|<\/tfoot|<\/table|$)/gi) ?? []) {
    const cells: string[] = []
    for (const match of tr.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)(?=<td\b|<th\b|<\/tr|$)/gi)) {
      const value = decodeEntities(
        (match[3] ?? "")
          .replace(/<\/(td|th)>\s*$/i, "")
          .replace(/<br\s*\/?>/gi, "\u0000")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " "),
      )
        .split("\u0000")
        .map((line) => line.trim())
        .join("\n")
        .trim()
      cells.push(value)
      const span = Number(/colspan\s*=\s*["']?(\d+)/i.exec(match[2] ?? "")?.[1] ?? 1)
      for (let s = 1; s < Math.min(span, 1000); s++) cells.push("")
    }
    if (cells.length) rows.push(cells)
  }
  return rows
}

// ---------- JSON ----------

const cellText = (value: unknown): string => (value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value))
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

function parseJsonValue(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    // JSON Lines: um objeto por linha
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length > 1) {
      try {
        return lines.map((l) => JSON.parse(l))
      } catch {
        // mantém o erro original, mais útil
      }
    }
    throw new TableParseError("json", error instanceof Error ? error.message : String(error))
  }
}

// Aceita: array de objetos, array de arrays, objeto de colunas ({ nome: [...] }), objeto de objetos
// ({ id: {...} } → coluna "key") e um objeto que embrulha um desses ({ "data": [...] }).
export function parseJson(text: string, header = true): Table {
  let value = parseJsonValue(text)
  if (isRecord(value)) {
    const entries = Object.entries(value)
    const arrays = entries.filter(([, v]) => Array.isArray(v))
    const scalarList = (v: unknown) => Array.isArray(v) && v.every((x) => !isRecord(x) && !Array.isArray(x))
    if (entries.length > 1 && entries.every(([, v]) => scalarList(v))) {
      const columns = entries.map(([k]) => k)
      const lists = entries.map(([, v]) => v as unknown[])
      const height = Math.max(...lists.map((l) => l.length))
      return { columns, rows: Array.from({ length: height }, (_, i) => lists.map((l) => cellText(l[i]))) }
    }
    if (arrays.length === 1) value = arrays[0]?.[1]
    else if (entries.length > 0 && entries.every(([, v]) => isRecord(v))) value = entries.map(([key, v]) => ({ key, ...(v as Record<string, unknown>) }))
    else value = [value]
  }
  if (!Array.isArray(value)) throw new TableParseError("json", "expected an array or object")
  if (value.length === 0) return { columns: [], rows: [] }
  if (value.every(Array.isArray)) return normalize((value as unknown[][]).map((row) => row.map(cellText)), header)
  const columns: string[] = []
  const known = new Set<string>()
  for (const item of value) {
    for (const key of Object.keys(isRecord(item) ? item : { value: item })) {
      if (!known.has(key)) {
        known.add(key)
        columns.push(key)
      }
    }
  }
  return { columns, rows: value.map((item) => columns.map((key) => cellText(isRecord(item) ? item[key] : key === "value" ? item : undefined))) }
}

// ---------- entrada única ----------

export function parseTable(text: string, options: ParseOptions = {}): Parsed {
  const header = options.header ?? true
  if (!text.trim()) return { table: { columns: [], rows: [] }, format: options.from && options.from !== "auto" ? options.from : "csv" }
  const format = !options.from || options.from === "auto" ? detectFormat(text) : options.from
  switch (format) {
    case "json":
      return { table: parseJson(text, header), format }
    case "markdown":
      return { table: normalize(parseMarkdown(text), header), format }
    case "html": {
      const grid = parseHtml(text)
      if (grid.length === 0) throw new TableParseError("html", "no <tr> rows found")
      return { table: normalize(grid, header), format }
    }
    case "csv": {
      const delimiter = !options.delimiter || options.delimiter === "auto" ? detectDelimiter(text) : options.delimiter
      return { table: normalize(parseDelimited(text, DELIMITERS[delimiter]), header), format, delimiter }
    }
  }
}
