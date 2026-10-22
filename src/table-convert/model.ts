// Modelo intermediário do conversor: todo formato de entrada vira isto, e todo formato de saída parte disto.
// Células são sempre texto; a inferência de tipos (número, booleano, nulo) acontece só na saída.
export interface Table {
  columns: string[]
  rows: string[][]
}

export class TableParseError extends Error {
  constructor(readonly format: string, message: string) {
    super(message)
    this.name = "TableParseError"
  }
}

export const EMPTY_TABLE: Table = { columns: [], rows: [] }

// Iguala o número de células de todas as linhas (completa com vazio) e dá nome às colunas sem título
export function normalize(grid: string[][], header: boolean): Table {
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0)
  const pad = (row: string[]) => Array.from({ length: width }, (_, i) => row[i] ?? "")
  const padded = grid.map(pad)
  if (!header) return { columns: generatedColumns(width), rows: padded }
  const [first = [], ...rows] = padded
  return { columns: first.map((name, i) => name.trim() || `column${i + 1}`), rows }
}

export const generatedColumns = (width: number) => Array.from({ length: width }, (_, i) => `column${i + 1}`)

// Chaves únicas para formatos com nomes (JSON, YAML, XML, SQL): repetidas ganham sufixo _2, _3…
export function uniqueKeys(columns: string[]): string[] {
  const seen = new Map<string, number>()
  return columns.map((name) => {
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name}_${count}`
  })
}

export type Scalar = string | number | boolean | null

export const DECIMALS = ["dot", "comma"] as const
// "dot": 1234.5 (padrão de programação); "comma": 1.234,5 (Excel e planilhas em português)
export type Decimal = (typeof DECIMALS)[number]

// Inferência conservadora: zeros à esquerda (CEP, CPF, "007") continuam texto
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/
// vírgula decimal, com ou sem ponto de milhar bem formado (1.234.567,89)
const NUMBER_COMMA = /^-?(0|[1-9]\d{0,2}(\.\d{3})+|[1-9]\d*)(,\d+)?$/

// Converte o texto de uma célula em número, ou undefined se não for número no formato escolhido
export function parseNumber(cell: string, decimal: Decimal = "dot"): number | undefined {
  const text = cell.trim()
  if (decimal === "comma") {
    if (!NUMBER_COMMA.test(text)) return undefined
    const n = Number(text.replace(/\./g, "").replace(",", "."))
    return Number.isFinite(n) ? n : undefined
  }
  return NUMBER.test(text) && Number.isFinite(Number(text)) ? Number(text) : undefined
}

export function inferValue(cell: string, emptyAsNull = false, decimal: Decimal = "dot"): Scalar {
  if (cell === "") return emptyAsNull ? null : ""
  const n = parseNumber(cell, decimal)
  if (n !== undefined) return n
  const lower = cell.toLowerCase()
  if (lower === "true") return true
  if (lower === "false") return false
  if (lower === "null") return null
  return cell
}

export const isNumeric = (cell: string, decimal: Decimal = "dot") => parseNumber(cell, decimal) !== undefined
