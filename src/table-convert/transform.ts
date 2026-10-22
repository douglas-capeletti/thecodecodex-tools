import { parseNumber, type Decimal, type Table } from "./model"

export const CASES = ["none", "upper", "lower", "title"] as const
export type CaseMode = (typeof CASES)[number]

// Transformações não destrutivas: a entrada colada não muda, então desfazer é só desligar a opção
// (e o link compartilhado reproduz o mesmo resultado).
export interface TransformOptions {
  trim?: boolean
  dropEmpty?: boolean
  find?: string
  replace?: string
  regex?: boolean
  ignoreCase?: boolean
  caseMode?: CaseMode
  // índice da coluna (na tabela lida) para ordenar; -1 = sem ordenação
  sortBy?: number
  descending?: boolean
  // colunas exibidas, na ordem, por índice na tabela lida; vazio = todas
  columns?: number[]
  dedupe?: boolean
  transpose?: boolean
  // como reconhecer números ao ordenar
  decimal?: Decimal
}

export interface Transformed {
  table: Table
  // para cada coluna do resultado, o índice na tabela lida (undefined depois de transpor)
  source: (number | undefined)[]
  // colunas que podem aparecer (as vazias removidas por dropEmpty ficam de fora), para restaurar ocultas
  available: number[]
  removedDuplicates: number
  removedEmpty: number
}

export class FindPatternError extends Error {}

const titleCase = (text: string) => text.toLocaleLowerCase().replace(/(^|[\s\-_/(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase())

function cellMapper(options: TransformOptions): ((cell: string) => string) | undefined {
  const steps: ((cell: string) => string)[] = []
  if (options.trim) steps.push((c) => c.trim().replace(/[ \t]+/g, " "))
  if (options.find) {
    const flags = `g${options.ignoreCase ? "i" : ""}u`
    let pattern: RegExp
    try {
      pattern = new RegExp(options.regex ? options.find : options.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags)
    } catch (error) {
      throw new FindPatternError(error instanceof Error ? error.message : String(error))
    }
    const replacement = options.replace ?? ""
    // sem regex, "$1" na substituição é texto literal
    steps.push(options.regex ? (c) => c.replace(pattern, replacement) : (c) => c.replace(pattern, () => replacement))
  }
  if (options.caseMode === "upper") steps.push((c) => c.toLocaleUpperCase())
  if (options.caseMode === "lower") steps.push((c) => c.toLocaleLowerCase())
  if (options.caseMode === "title") steps.push(titleCase)
  if (steps.length === 0) return undefined
  return (cell) => steps.reduce((value, step) => step(value), cell)
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

export function compareCells(a: string, b: string, decimal: Decimal = "dot"): number {
  // números comparam como números; o resto em ordem "natural" (item2 antes de item10)
  const x = parseNumber(a, decimal)
  const y = parseNumber(b, decimal)
  if (x !== undefined && y !== undefined) return x - y
  return collator.compare(a, b)
}

export function transposeTable(table: Table): Table {
  const grid = [table.columns, ...table.rows]
  const [first = [], ...rest] = grid[0]?.map((_, c) => grid.map((row) => row[c] ?? "")) ?? []
  return { columns: first, rows: rest }
}

// Ordem: limpeza → localizar/substituir → caixa → ordenar → escolher colunas → remover duplicadas → transpor
export function transformTable(input: Table, options: TransformOptions = {}): Transformed {
  const map = cellMapper(options)
  const columns = map ? input.columns.map(map) : [...input.columns]
  let rows = map ? input.rows.map((r) => r.map(map)) : input.rows.map((r) => [...r])

  let removedEmpty = 0
  if (options.dropEmpty) {
    const before = rows.length
    rows = rows.filter((r) => r.some((c) => c.trim() !== ""))
    removedEmpty = before - rows.length
    const keep = columns.map((name, i) => name.trim() !== "" && !/^column\d+$/.test(name) ? true : rows.some((r) => (r[i] ?? "").trim() !== ""))
    if (keep.includes(false) && keep.includes(true)) {
      // colunas vazias saem; a numeração de origem é preservada pelo índice
      const indices = keep.flatMap((k, i) => (k ? [i] : []))
      removedEmpty += keep.length - indices.length
      return finish({ columns, rows }, options, indices, removedEmpty)
    }
  }
  return finish({ columns, rows }, options, columns.map((_, i) => i), removedEmpty)
}

function finish(table: Table, options: TransformOptions, available: number[], removedEmpty: number): Transformed {
  let rows = table.rows
  const sortBy = options.sortBy ?? -1
  if (sortBy >= 0 && sortBy < table.columns.length) {
    const direction = options.descending ? -1 : 1
    rows = [...rows].sort((a, b) => {
      const x = a[sortBy] ?? ""
      const y = b[sortBy] ?? ""
      if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1
      return compareCells(x, y, options.decimal) * direction
    })
  }

  const chosen = (options.columns ?? []).filter((i) => available.includes(i))
  const source = chosen.length ? chosen : available
  let result: Table = { columns: source.map((i) => table.columns[i] ?? ""), rows: rows.map((r) => source.map((i) => r[i] ?? "")) }

  let removedDuplicates = 0
  if (options.dedupe) {
    const seen = new Set<string>()
    const unique = result.rows.filter((r) => {
      const key = JSON.stringify(r)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    removedDuplicates = result.rows.length - unique.length
    result = { ...result, rows: unique }
  }

  if (options.transpose) return { table: transposeTable(result), source: [], available, removedDuplicates, removedEmpty }
  return { table: result, source, available, removedDuplicates, removedEmpty }
}
