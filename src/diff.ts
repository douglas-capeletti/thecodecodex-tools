// Diff de textos sem dependências: algoritmo de Myers (O(ND)) sobre linhas e, dentro das linhas alteradas,
// sobre caracteres ou palavras. Usado pela ferramenta Diff no site e pelo comando `diff` do cli.js.

export type Op = { type: "equal", a: number, b: number } | { type: "delete", a: number } | { type: "insert", b: number }

// Myers: menor sequência de inserções/remoções que transforma `a` em `b` (comparando por igualdade de string)
export function myers(a: string[], b: string[]): Op[] {
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max + 1
  const v = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []
  outer: for (let d = 0; d <= max; d++) {
    trace.push(v.slice())
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && (v[offset + k - 1] ?? 0) < (v[offset + k + 1] ?? 0)) ? (v[offset + k + 1] ?? 0) : (v[offset + k - 1] ?? 0) + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) break outer
    }
  }

  // reconstrói o caminho de trás para frente
  const ops: Op[] = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d] as Int32Array
    const k = x - y
    const prevK = k === -d || (k !== d && (vd[offset + k - 1] ?? 0) < (vd[offset + k + 1] ?? 0)) ? k + 1 : k - 1
    const prevX = d === 0 ? 0 : (vd[offset + prevK] ?? 0)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      x--
      y--
      ops.push({ type: "equal", a: x, b: y })
    }
    if (d > 0) {
      if (x === prevX) ops.push({ type: "insert", b: y - 1 })
      else ops.push({ type: "delete", a: x - 1 })
    }
    x = prevX
    y = prevY
  }
  return ops.reverse()
}

export type Granularity = "char" | "word"
export type JsonMode = "off" | "format" | "sortKeys"

export interface DiffOptions {
  granularity?: Granularity
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
  ignoreLineEndings?: boolean
  sortLines?: boolean
  json?: JsonMode
}

export interface Segment {
  text: string
  changed: boolean
}

export interface Row {
  type: "equal" | "insert" | "delete" | "modified"
  aLine?: number
  bLine?: number
  aText?: string
  bText?: string
  // só em linhas modificadas: trechos de cada lado com o que mudou marcado
  inline?: { a: Segment[], b: Segment[] }
}

export interface DiffStats {
  linesEqual: number
  linesAdded: number
  linesRemoved: number
  linesModified: number
  // linhas diferentes = adicionadas + removidas + modificadas
  linesDifferent: number
  charsAdded: number
  charsRemoved: number
  // 0 a 1: caracteres iguais × 2 ÷ (tamanho de A + tamanho de B)
  similarity: number
}

export interface DiffResult {
  rows: Row[]
  stats: DiffStats
  identical: boolean
  // o conteúdo é o mesmo e só a ordem (de chaves JSON ou de linhas) muda
  onlyOrderDiffers: boolean
  // textos efetivamente comparados (após formatar/ordenar)
  a: string
  b: string
  // acima do limite, não calcula diferenças dentro das linhas
  inlineSkipped: boolean
}

export class JsonInputError extends Error {
  constructor(
    readonly side: "a" | "b",
    message: string,
  ) {
    super(message)
  }
}

export const INLINE_LINE_LIMIT = 5000

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])]))
  return value
}

function transform(text: string, side: "a" | "b", options: DiffOptions, applySorting = true): string {
  let result = options.ignoreLineEndings ? text.replace(/\r\n?/g, "\n") : text
  const json = options.json ?? "off"
  if (json !== "off" && result.trim()) {
    try {
      const parsed: unknown = JSON.parse(result)
      result = JSON.stringify(json === "sortKeys" && applySorting ? sortKeysDeep(parsed) : parsed, null, 2)
    } catch (error) {
      throw new JsonInputError(side, error instanceof Error ? error.message : String(error))
    }
  }
  if (options.sortLines && applySorting) result = result.split("\n").sort((x, y) => x.localeCompare(y)).join("\n")
  return result
}

// chave usada para comparar linhas (o texto exibido continua o original)
function lineKey(line: string, options: DiffOptions): string {
  let key = options.ignoreLineEndings ? line.replace(/\r$/, "") : line
  if (options.ignoreWhitespace) key = key.trim().replace(/\s+/g, " ")
  if (options.ignoreCase) key = key.toLowerCase()
  return key
}

const WORD = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu

export function tokenize(text: string, granularity: Granularity): string[] {
  return granularity === "word" ? (text.match(WORD) ?? []) : [...text]
}

// Diferença dentro de uma linha: trechos de cada lado, com os alterados marcados (adjacentes são fundidos)
export function diffInline(a: string, b: string, granularity: Granularity = "char", options: DiffOptions = {}): { a: Segment[], b: Segment[] } {
  const ta = tokenize(a, granularity)
  const tb = tokenize(b, granularity)
  const key = (token: string) => (options.ignoreCase ? token.toLowerCase() : token)
  const ops = myers(ta.map(key), tb.map(key))
  const left: Segment[] = []
  const right: Segment[] = []
  const push = (list: Segment[], text: string, changed: boolean) => {
    const last = list[list.length - 1]
    if (last && last.changed === changed) last.text += text
    else list.push({ text, changed })
  }
  for (const op of ops) {
    if (op.type === "equal") {
      push(left, ta[op.a] ?? "", false)
      push(right, tb[op.b] ?? "", false)
    } else if (op.type === "delete") push(left, ta[op.a] ?? "", true)
    else push(right, tb[op.b] ?? "", true)
  }
  return { a: left, b: right }
}

const splitLines = (text: string) => (text === "" ? [] : text.split("\n"))
const changedLength = (segments: Segment[]) => segments.reduce((sum, s) => sum + (s.changed ? s.text.length : 0), 0)

export function diffTexts(rawA: string, rawB: string, options: DiffOptions = {}): DiffResult {
  const a = transform(rawA, "a", options)
  const b = transform(rawB, "b", options)
  const linesA = splitLines(a)
  const linesB = splitLines(b)
  const ops = myers(
    linesA.map((l) => lineKey(l, options)),
    linesB.map((l) => lineKey(l, options)),
  )
  const inlineSkipped = Math.max(linesA.length, linesB.length) > INLINE_LINE_LIMIT
  const granularity = options.granularity ?? "char"

  const rows: Row[] = []
  let deletes: number[] = []
  let inserts: number[] = []
  // remoções seguidas de inserções adjacentes viram pares "modified" (linha alterada)
  const flush = () => {
    const pairs = Math.min(deletes.length, inserts.length)
    for (let i = 0; i < pairs; i++) {
      const ai = deletes[i] as number
      const bi = inserts[i] as number
      const aText = linesA[ai] ?? ""
      const bText = linesB[bi] ?? ""
      const row: Row = { type: "modified", aLine: ai + 1, bLine: bi + 1, aText, bText }
      if (!inlineSkipped) row.inline = diffInline(aText, bText, granularity, options)
      rows.push(row)
    }
    for (const ai of deletes.slice(pairs)) rows.push({ type: "delete", aLine: ai + 1, aText: linesA[ai] ?? "" })
    for (const bi of inserts.slice(pairs)) rows.push({ type: "insert", bLine: bi + 1, bText: linesB[bi] ?? "" })
    deletes = []
    inserts = []
  }
  for (const op of ops) {
    if (op.type === "equal") {
      flush()
      rows.push({ type: "equal", aLine: op.a + 1, bLine: op.b + 1, aText: linesA[op.a] ?? "", bText: linesB[op.b] ?? "" })
    } else if (op.type === "delete") deletes.push(op.a)
    else inserts.push(op.b)
  }
  flush()

  const stats: DiffStats = { linesEqual: 0, linesAdded: 0, linesRemoved: 0, linesModified: 0, linesDifferent: 0, charsAdded: 0, charsRemoved: 0, similarity: 1 }
  let equalChars = 0
  for (const row of rows) {
    if (row.type === "equal") {
      stats.linesEqual++
      equalChars += (row.aText ?? "").length
    } else if (row.type === "insert") {
      stats.linesAdded++
      stats.charsAdded += (row.bText ?? "").length
    } else if (row.type === "delete") {
      stats.linesRemoved++
      stats.charsRemoved += (row.aText ?? "").length
    } else {
      stats.linesModified++
      const added = row.inline ? changedLength(row.inline.b) : (row.bText ?? "").length
      const removed = row.inline ? changedLength(row.inline.a) : (row.aText ?? "").length
      stats.charsAdded += added
      stats.charsRemoved += removed
      equalChars += (row.aText ?? "").length - removed
    }
  }
  stats.linesDifferent = stats.linesAdded + stats.linesRemoved + stats.linesModified
  const total = linesA.join("").length + linesB.join("").length
  stats.similarity = total === 0 ? 1 : (2 * equalChars) / total
  const identical = stats.linesDifferent === 0

  // "só a ordem mudou": diferente sem ordenar, igual depois de ordenar (chaves JSON e/ou linhas)
  let onlyOrderDiffers = false
  const canSort = (options.json ?? "off") !== "off" || options.sortLines
  if (canSort) {
    const unsortedA = transform(rawA, "a", options, false)
    const unsortedB = transform(rawB, "b", options, false)
    const sortedOptions: DiffOptions = { ...options, json: (options.json ?? "off") === "off" ? "off" : "sortKeys" }
    const sortedEqual = transform(rawA, "a", sortedOptions) === transform(rawB, "b", sortedOptions) || identical
    onlyOrderDiffers = unsortedA !== unsortedB && sortedEqual
  }

  return { rows, stats, identical, onlyOrderDiffers, a, b, inlineSkipped }
}

// Patch unificado (formato do `diff -u`/git) a partir das linhas comparadas
export function unifiedPatch(result: Pick<DiffResult, "rows">, context = 3, names: [string, string] = ["a", "b"]): string {
  // expande "modified" em remoção + inserção, como no formato unificado
  type Line = { kind: " " | "-" | "+", text: string, aLine?: number, bLine?: number }
  const lines: Line[] = []
  for (const row of result.rows) {
    if (row.type === "equal") lines.push({ kind: " ", text: row.aText ?? "", aLine: row.aLine, bLine: row.bLine })
    else if (row.type === "delete") lines.push({ kind: "-", text: row.aText ?? "", aLine: row.aLine })
    else if (row.type === "insert") lines.push({ kind: "+", text: row.bText ?? "", bLine: row.bLine })
    else {
      lines.push({ kind: "-", text: row.aText ?? "", aLine: row.aLine })
      lines.push({ kind: "+", text: row.bText ?? "", bLine: row.bLine })
    }
  }
  const changed = lines.map((l, i) => (l.kind !== " " ? i : -1)).filter((i) => i >= 0)
  if (changed.length === 0) return ""

  // agrupa mudanças próximas em hunks com `context` linhas iguais em volta
  const hunks: [number, number][] = []
  for (const index of changed) {
    const start = Math.max(0, index - context)
    const end = Math.min(lines.length - 1, index + context)
    const last = hunks[hunks.length - 1]
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end)
    else hunks.push([start, end])
  }

  const out = [`--- ${names[0]}`, `+++ ${names[1]}`]
  for (const [start, end] of hunks) {
    const slice = lines.slice(start, end + 1)
    // número da linha anterior ao hunk em cada lado (para hunks que começam com inserção/remoção)
    const before = lines.slice(0, start)
    const aBefore = before.filter((l) => l.kind !== "+").length
    const bBefore = before.filter((l) => l.kind !== "-").length
    const aCount = slice.filter((l) => l.kind !== "+").length
    const bCount = slice.filter((l) => l.kind !== "-").length
    const aStart = aCount === 0 ? aBefore : aBefore + 1
    const bStart = bCount === 0 ? bBefore : bBefore + 1
    out.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`)
    for (const line of slice) out.push(`${line.kind}${line.text}`)
  }
  return `${out.join("\n")}\n`
}
