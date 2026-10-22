import { inferValue, uniqueKeys, type Decimal, type Scalar, type Table } from "./model"
import { toGo, toPandas, toPhp, toPython, toTypeScript } from "./code"
import { DELIMITERS, type Delimiter } from "./parse"

// Formatos agrupados como aparecem na tela
export const OUTPUT_GROUPS = {
  data: ["csv", "xlsx", "json", "jsonl", "sql", "yaml", "toml", "ini", "xml"],
  docs: ["markdown", "html", "ascii", "latex", "jira", "mediawiki", "asciidoc", "rst"],
  code: ["python", "pandas", "typescript", "go", "php"],
} as const
export type OutputGroup = keyof typeof OUTPUT_GROUPS
export const OUTPUT_FORMATS = [...OUTPUT_GROUPS.data, ...OUTPUT_GROUPS.docs, ...OUTPUT_GROUPS.code] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]
export type TextFormat = Exclude<OutputFormat, "xlsx">

export const JSON_SHAPES = ["objects", "arrays", "columns", "keyed"] as const
export type JsonShape = (typeof JSON_SHAPES)[number]
export const INDENTS = ["2", "4", "tab", "min"] as const
export type Indent = (typeof INDENTS)[number]
export const SQL_DIALECTS = ["mysql", "postgres", "sqlite", "mssql"] as const
export type SqlDialect = (typeof SQL_DIALECTS)[number]
export const ALIGNS = ["none", "left", "center", "right"] as const
export type Align = (typeof ALIGNS)[number]
export const ASCII_STYLES = ["unicode", "ascii"] as const
export type AsciiStyle = (typeof ASCII_STYLES)[number]

export interface SerializeOptions {
  // a primeira linha da saída é o cabeçalho (CSV, ASCII, LaTeX, HTML); formatos com chaves sempre usam os nomes
  header?: boolean
  // números, true/false e null viram tipos de verdade (JSON, YAML, SQL)
  types?: boolean
  emptyAsNull?: boolean
  decimal?: Decimal
  outputDelimiter?: Delimiter
  jsonShape?: JsonShape
  indent?: Indent
  tableName?: string
  dialect?: SqlDialect
  multiRow?: boolean
  createTable?: boolean
  align?: Align
  pretty?: boolean
  // nome da lista/elemento raiz (XML, TOML) ou do tipo (Go, TypeScript)
  xmlRoot?: string
  xmlRow?: string
  asciiStyle?: AsciiStyle
  // nome do tipo gerado (Go, TypeScript)
  typeName?: string
}

export const EXTENSIONS: Record<OutputFormat, { ext: string, mime: string }> = {
  csv: { ext: "csv", mime: "text/csv" },
  json: { ext: "json", mime: "application/json" },
  jsonl: { ext: "jsonl", mime: "application/jsonl" },
  markdown: { ext: "md", mime: "text/markdown" },
  html: { ext: "html", mime: "text/html" },
  sql: { ext: "sql", mime: "application/sql" },
  yaml: { ext: "yaml", mime: "application/yaml" },
  xml: { ext: "xml", mime: "application/xml" },
  ascii: { ext: "txt", mime: "text/plain" },
  latex: { ext: "tex", mime: "application/x-tex" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  toml: { ext: "toml", mime: "application/toml" },
  ini: { ext: "ini", mime: "text/plain" },
  jira: { ext: "txt", mime: "text/plain" },
  mediawiki: { ext: "wiki", mime: "text/plain" },
  asciidoc: { ext: "adoc", mime: "text/asciidoc" },
  rst: { ext: "rst", mime: "text/x-rst" },
  python: { ext: "py", mime: "text/x-python" },
  pandas: { ext: "py", mime: "text/x-python" },
  typescript: { ext: "ts", mime: "text/typescript" },
  go: { ext: "go", mime: "text/x-go" },
  php: { ext: "php", mime: "application/x-php" },
}

// Largura visível (emojis e acentos combinados contam 1; CJK e emoji ocupam 2 colunas no terminal)
export function displayWidth(text: string): number {
  let width = 0
  for (const ch of text.replace(/\p{M}/gu, "")) {
    const code = ch.codePointAt(0) ?? 0
    width += (code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff00 && code <= 0xff60) || (code >= 0x1f300 && code <= 0x1faff) ? 2 : 1
  }
  return width
}

const pad = (text: string, width: number, align: Align = "left") => {
  const gap = Math.max(0, width - displayWidth(text))
  if (align === "right") return " ".repeat(gap) + text
  if (align === "center") return " ".repeat(Math.floor(gap / 2)) + text + " ".repeat(Math.ceil(gap / 2))
  return text + " ".repeat(gap)
}

export type ColumnKind = "number" | "integer" | "boolean" | "text"

// Tipos decididos por coluna, não por célula: se um valor da coluna não é número (ex.: "8500,50" com
// decimal "dot"), a coluna inteira fica como texto, para o JSON/SQL não misturar 7200 com "8500,50".
// Vazios e "null" não decidem o tipo.
export function columnKinds(t: Table, o: SerializeOptions = {}): ColumnKind[] {
  return t.columns.map((_, i) => {
    if (!(o.types ?? true)) return "text"
    const values = t.rows.map((r) => r[i] ?? "").filter((c) => c !== "" && c.toLowerCase() !== "null").map((c) => inferValue(c, false, o.decimal))
    if (values.length && values.every((v) => typeof v === "number")) return values.every((v) => Number.isInteger(v)) ? "integer" : "number"
    if (values.length && values.every((v) => typeof v === "boolean")) return "boolean"
    return "text"
  })
}

export function typedRows(t: Table, o: SerializeOptions = {}, kinds = columnKinds(t, o)): Scalar[][] {
  return t.rows.map((r) =>
    t.columns.map((_, i) => {
      const cell = r[i] ?? ""
      if (cell === "") return o.emptyAsNull ? null : kinds[i] === "text" ? "" : null
      if (kinds[i] === "text") return cell
      return cell.toLowerCase() === "null" ? null : inferValue(cell, false, o.decimal)
    }),
  )
}

const indentOf = (indent: Indent = "2") => (indent === "tab" ? "\t" : indent === "min" ? undefined : Number(indent))
const records = (t: Table, o: SerializeOptions) => {
  const keys = uniqueKeys(t.columns)
  return typedRows(t, o).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])))
}

// ---------- texto delimitado ----------

export function toCsv(t: Table, o: SerializeOptions = {}): string {
  const delimiter = DELIMITERS[o.outputDelimiter ?? "comma"]
  const quote = (cell: string) => (cell.includes(delimiter) || /["\r\n]/.test(cell) || /^\s|\s$/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const lines = (o.header ?? true ? [t.columns, ...t.rows] : t.rows).map((r) => r.map(quote).join(delimiter))
  return lines.join("\n")
}

// ---------- JSON ----------

export function toJson(t: Table, o: SerializeOptions = {}): string {
  const space = indentOf(o.indent)
  const keys = uniqueKeys(t.columns)
  let data: unknown
  switch (o.jsonShape ?? "objects") {
    case "objects":
      data = records(t, o)
      break
    case "arrays":
      data = [t.columns, ...typedRows(t, o)]
      break
    case "columns": {
      const rows = typedRows(t, o)
      data = Object.fromEntries(keys.map((k, i) => [k, rows.map((r) => r[i] ?? null)]))
      break
    }
    case "keyed": {
      // primeira coluna vira a chave do objeto
      const rows = typedRows(t, o)
      data = Object.fromEntries(t.rows.map((r, n) => [r[0] ?? "", Object.fromEntries(keys.slice(1).map((k, i) => [k, rows[n]?.[i + 1] ?? null]))]))
      break
    }
  }
  return JSON.stringify(data, null, space)
}

export const toJsonLines = (t: Table, o: SerializeOptions = {}) => records(t, o).map((r) => JSON.stringify(r)).join("\n")

// ---------- Markdown ----------

export function toMarkdown(t: Table, o: SerializeOptions = {}): string {
  const escape = (cell: string) => cell.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>")
  const head = t.columns.map(escape)
  const body = t.rows.map((r) => r.map(escape))
  const align = o.align ?? "none"
  const pretty = o.pretty ?? true
  const widths = head.map((h, i) => Math.max(3, displayWidth(h), ...body.map((r) => displayWidth(r[i] ?? ""))))
  const rule = (w: number) => {
    const dashes = pretty ? w : 3
    if (align === "left") return `:${"-".repeat(dashes - 1)}`
    if (align === "right") return `${"-".repeat(dashes - 1)}:`
    if (align === "center") return `:${"-".repeat(Math.max(1, dashes - 2))}:`
    return "-".repeat(dashes)
  }
  const line = (cells: string[]) => `| ${cells.map((c, i) => (pretty ? pad(c, widths[i] ?? 0, align === "none" ? "left" : align) : c)).join(" | ")} |`
  return [line(head), `| ${widths.map(rule).join(" | ")} |`, ...body.map(line)].join("\n")
}

// ---------- HTML ----------

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export function toHtml(t: Table, o: SerializeOptions = {}): string {
  const pretty = o.pretty ?? true
  const [nl, i1, i2, i3] = pretty ? ["\n", "  ", "    ", "      "] : ["", "", "", ""]
  const cell = (tag: string, text: string) => `${i3}<${tag}>${escapeHtml(text).replace(/\r?\n/g, "<br>")}</${tag}>`
  const row = (tag: string, cells: string[]) => `${i2}<tr>${nl}${cells.map((c) => cell(tag, c)).join(nl)}${nl}${i2}</tr>`
  const parts = ["<table>"]
  if (o.header ?? true) parts.push(`${i1}<thead>`, row("th", t.columns), `${i1}</thead>`)
  parts.push(`${i1}<tbody>`, ...t.rows.map((r) => row("td", r)), `${i1}</tbody>`, "</table>")
  return parts.join(nl)
}

// ---------- SQL ----------

const sqlIdent = (name: string, dialect: SqlDialect) => {
  if (dialect === "mysql") return `\`${name.replace(/`/g, "``")}\``
  if (dialect === "mssql") return `[${name.replace(/]/g, "]]")}]`
  return `"${name.replace(/"/g, '""')}"`
}

const sqlLiteral = (v: Scalar, dialect: SqlDialect) => {
  if (v === null) return "NULL"
  if (typeof v === "number") return String(v)
  if (typeof v === "boolean") return dialect === "mssql" ? (v ? "1" : "0") : v ? "TRUE" : "FALSE"
  return `'${v.replace(/'/g, "''")}'`
}

// Tipo de coluna inferido dos valores: inteiro, decimal, booleano ou texto (VARCHAR com folga)
export function sqlColumnType(cells: string[], dialect: SqlDialect, decimal: Decimal = "dot", infer = true): string {
  const values = infer ? cells.filter((c) => c !== "" && c.toLowerCase() !== "null").map((c) => inferValue(c, false, decimal)) : []
  const longest = Math.max(1, ...cells.map((c) => c.length))
  const text = dialect === "sqlite" ? "TEXT" : dialect === "mssql" ? `NVARCHAR(${longest > 4000 ? "MAX" : Math.min(4000, Math.ceil(longest * 1.5))})` : longest > 255 ? "TEXT" : `VARCHAR(${Math.min(255, Math.max(16, Math.ceil(longest * 1.5)))})`
  if (values.length === 0) return text
  if (values.every((v) => typeof v === "number" && Number.isInteger(v))) return dialect === "sqlite" ? "INTEGER" : values.some((v) => Math.abs(v as number) > 2_147_483_647) ? "BIGINT" : "INT"
  if (values.every((v) => typeof v === "number")) return dialect === "sqlite" ? "REAL" : "DECIMAL(18,6)"
  if (values.every((v) => typeof v === "boolean")) return dialect === "mssql" ? "BIT" : dialect === "sqlite" ? "INTEGER" : "BOOLEAN"
  return text
}

export function toSql(t: Table, o: SerializeOptions = {}): string {
  const dialect = o.dialect ?? "mysql"
  const table = sqlIdent(o.tableName?.trim() || "my_table", dialect)
  const keys = uniqueKeys(t.columns)
  const columns = keys.map((k) => sqlIdent(k, dialect)).join(", ")
  const typed = typedRows(t, o)
  const tuple = (r: Scalar[]) => `(${keys.map((_, i) => sqlLiteral(r[i] ?? null, dialect)).join(", ")})`
  const parts: string[] = []
  if (o.createTable) {
    const defs = keys.map((k, i) => `  ${sqlIdent(k, dialect)} ${sqlColumnType(t.rows.map((r) => r[i] ?? ""), dialect, o.decimal, o.types ?? true)}`)
    parts.push(`CREATE TABLE ${table} (\n${defs.join(",\n")}\n);`)
  }
  if (t.rows.length) {
    // MS SQL aceita no máximo 1000 linhas por VALUES
    const batch = o.multiRow ?? true ? (dialect === "mssql" ? 1000 : 500) : 1
    for (let i = 0; i < typed.length; i += batch) {
      const chunk = typed.slice(i, i + batch)
      parts.push(chunk.length === 1 ? `INSERT INTO ${table} (${columns}) VALUES ${tuple(chunk[0] as Scalar[])};` : `INSERT INTO ${table} (${columns}) VALUES\n${chunk.map((r) => `  ${tuple(r)}`).join(",\n")};`)
    }
  }
  return parts.join("\n\n")
}

// ---------- YAML ----------

const YAML_PLAIN_UNSAFE = /^(?:[-?:,[\]{}#&*!|>'"%@`]|\s)|[:\s]$|: | #|[\r\n\t]/
const YAML_RESERVED = /^(?:true|false|yes|no|on|off|y|n|null|~|[-+]?(?:\.inf|\.nan)|[-+]?(?:\d[\d_]*)?(?:\.\d*)?(?:e[-+]?\d+)?|0x[\da-f]+|0o[0-7]+)$/i

export function yamlScalar(v: Scalar): string {
  if (v === null) return "null"
  if (typeof v !== "string") return String(v)
  if (v === "" || YAML_PLAIN_UNSAFE.test(v) || YAML_RESERVED.test(v)) return JSON.stringify(v)
  return v
}

export function toYaml(t: Table, o: SerializeOptions = {}): string {
  if (t.rows.length === 0) return "[]"
  const keys = uniqueKeys(t.columns).map(yamlScalar)
  return typedRows(t, o).map((r) => keys.map((k, i) => `${i === 0 ? "- " : "  "}${k}: ${yamlScalar(r[i] ?? null)}`).join("\n")).join("\n")
}

// ---------- XML ----------

export function xmlName(name: string): string {
  const cleaned = name.trim().replace(/[^\p{L}\p{N}_.-]+/gu, "_")
  return !cleaned || /^[^\p{L}_]/u.test(cleaned) || /^xml/i.test(cleaned) ? `_${cleaned}` : cleaned
}

const escapeXml = (text: string) => escapeHtml(text).replace(/'/g, "&apos;")

export function toXml(t: Table, o: SerializeOptions = {}): string {
  const root = xmlName(o.xmlRoot || "rows")
  const rowName = xmlName(o.xmlRow || "row")
  const keys = uniqueKeys(t.columns).map(xmlName)
  const rows = t.rows.map((r) => `  <${rowName}>\n${keys.map((k, i) => (r[i] ? `    <${k}>${escapeXml(r[i] ?? "")}</${k}>` : `    <${k}/>`)).join("\n")}\n  </${rowName}>`)
  return [`<?xml version="1.0" encoding="UTF-8"?>`, rows.length ? `<${root}>\n${rows.join("\n")}\n</${root}>` : `<${root}/>`].join("\n")
}

// ---------- ASCII ----------

export function toAscii(t: Table, o: SerializeOptions = {}): string {
  const box = (o.asciiStyle ?? "unicode") === "unicode" ? { h: "─", v: "│", tl: "┌", tm: "┬", tr: "┐", ml: "├", mm: "┼", mr: "┤", bl: "└", bm: "┴", br: "┘" } : { h: "-", v: "|", tl: "+", tm: "+", tr: "+", ml: "+", mm: "+", mr: "+", bl: "+", bm: "+", br: "+" }
  const flat = (c: string) => c.replace(/\r?\n/g, " ")
  const grid = (o.header ?? true ? [t.columns, ...t.rows] : t.rows).map((r) => r.map(flat))
  const width = t.columns.length
  if (width === 0) return ""
  const widths = Array.from({ length: width }, (_, i) => Math.max(1, ...grid.map((r) => displayWidth(r[i] ?? ""))))
  const right = widths.map((_, i) => t.rows.length > 0 && t.rows.every((r) => /^-?[\d.,]+%?$/.test((r[i] ?? "").trim()) || !r[i]))
  const rule = (l: string, m: string, r: string) => l + widths.map((w) => box.h.repeat(w + 2)).join(m) + r
  const line = (cells: string[], head: boolean) => box.v + widths.map((w, i) => ` ${pad(cells[i] ?? "", w, right[i] && !head ? "right" : "left")} `).join(box.v) + box.v
  const out = [rule(box.tl, box.tm, box.tr)]
  grid.forEach((r, i) => {
    out.push(line(r, i === 0 && (o.header ?? true)))
    if (i === 0 && (o.header ?? true) && grid.length > 1) out.push(rule(box.ml, box.mm, box.mr))
  })
  out.push(rule(box.bl, box.bm, box.br))
  return out.join("\n")
}

// ---------- LaTeX ----------

const LATEX: Record<string, string> = { "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", $: "\\$", "#": "\\#", _: "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" }
export const escapeLatex = (text: string) => text.replace(/[\\&%$#_{}~^]/g, (ch) => LATEX[ch] ?? ch).replace(/\r?\n/g, " \\newline ")

export function toLatex(t: Table, o: SerializeOptions = {}): string {
  const align = { none: "l", left: "l", center: "c", right: "r" }[o.align ?? "none"]
  const row = (cells: string[]) => `  ${cells.map(escapeLatex).join(" & ")} \\\\`
  const lines = [`\\begin{tabular}{|${t.columns.map(() => align).join("|")}|}`, "  \\hline"]
  if (o.header ?? true) lines.push(row(t.columns), "  \\hline")
  lines.push(...t.rows.map(row), "  \\hline", "\\end{tabular}")
  return lines.join("\n")
}

// ---------- TOML ----------

const tomlKey = (key: string) => (/^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key))

// Lista de tabelas ([[rows]]). TOML não tem null: a chave é omitida.
export function toToml(t: Table, o: SerializeOptions = {}): string {
  const name = tomlKey(o.xmlRoot || "rows")
  const keys = uniqueKeys(t.columns).map(tomlKey)
  return typedRows(t, o)
    .map((r) => [`[[${name}]]`, ...keys.flatMap((k, i) => (r[i] === null || r[i] === undefined ? [] : [`${k} = ${typeof r[i] === "string" ? JSON.stringify(r[i]) : String(r[i])}`]))].join("\n"))
    .join("\n\n")
}

// ---------- INI ----------

// Uma seção por linha, com o nome tirado da primeira coluna
export function toIni(t: Table): string {
  const keys = uniqueKeys(t.columns)
  const quote = (v: string) => (/[;#="]|^\s|\s$|\n/.test(v) ? `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"` : v)
  return t.rows
    .map((r, n) => {
      const section = (r[0] ?? "").replace(/[[\]\r\n]/g, "").trim() || `row ${n + 1}`
      return [`[${section}]`, ...keys.slice(1).map((k, i) => `${k.replace(/[=\s]+/g, "_")} = ${quote(r[i + 1] ?? "")}`)].join("\n")
    })
    .join("\n\n")
}

// ---------- wikis e documentação ----------

export function toJira(t: Table, o: SerializeOptions = {}): string {
  const cell = (c: string) => c.replace(/\|/g, "\\|").replace(/\r?\n/g, " \\\\ ") || " "
  const lines = t.rows.map((r) => `|${r.map(cell).join("|")}|`)
  if (o.header ?? true) lines.unshift(`||${t.columns.map(cell).join("||")}||`)
  return lines.join("\n")
}

export function toMediaWiki(t: Table, o: SerializeOptions = {}): string {
  const cell = (c: string) => c.replace(/\|/g, "&#124;").replace(/\r?\n/g, "<br>")
  const lines = ['{| class="wikitable"']
  if (o.header ?? true) lines.push("|-", `! ${t.columns.map(cell).join(" !! ")}`)
  for (const r of t.rows) lines.push("|-", `| ${r.map(cell).join(" || ")}`)
  lines.push("|}")
  return lines.join("\n")
}

export function toAsciiDoc(t: Table, o: SerializeOptions = {}): string {
  const cell = (c: string) => c.replace(/\|/g, "\\|").replace(/\r?\n/g, " +\n")
  const row = (r: string[]) => r.map((c) => `| ${cell(c)}`).join(" ")
  const header = o.header ?? true
  const lines = [`[cols="${t.columns.map(() => "1").join(",")}"${header ? ', options="header"' : ""}]`, "|==="]
  if (header) lines.push(row(t.columns), "")
  lines.push(...t.rows.map(row), "|===")
  return lines.join("\n")
}

// reStructuredText: grid table, com "=" separando o cabeçalho
export function toRst(t: Table, o: SerializeOptions = {}): string {
  if (t.columns.length === 0) return ""
  const header = o.header ?? true
  const flat = (c: string) => c.replace(/\r?\n/g, " ")
  const grid = (header ? [t.columns, ...t.rows] : t.rows).map((r) => r.map(flat))
  const widths = t.columns.map((_, i) => Math.max(1, ...grid.map((r) => displayWidth(r[i] ?? ""))))
  const rule = (ch: string) => `+${widths.map((w) => ch.repeat(w + 2)).join("+")}+`
  const out = [rule("-")]
  grid.forEach((r, i) => {
    out.push(`|${widths.map((w, c) => ` ${pad(r[c] ?? "", w)} `).join("|")}|`)
    out.push(rule(i === 0 && header ? "=" : "-"))
  })
  return out.join("\n")
}

export function serialize(t: Table, format: TextFormat, o: SerializeOptions = {}): string {
  switch (format) {
    case "csv":
      return toCsv(t, o)
    case "json":
      return toJson(t, o)
    case "jsonl":
      return toJsonLines(t, o)
    case "markdown":
      return toMarkdown(t, o)
    case "html":
      return toHtml(t, o)
    case "sql":
      return toSql(t, o)
    case "yaml":
      return toYaml(t, o)
    case "xml":
      return toXml(t, o)
    case "ascii":
      return toAscii(t, o)
    case "latex":
      return toLatex(t, o)
    case "toml":
      return toToml(t, o)
    case "ini":
      return toIni(t)
    case "jira":
      return toJira(t, o)
    case "mediawiki":
      return toMediaWiki(t, o)
    case "asciidoc":
      return toAsciiDoc(t, o)
    case "rst":
      return toRst(t, o)
    case "python":
      return toPython(t, o)
    case "pandas":
      return toPandas(t, o)
    case "typescript":
      return toTypeScript(t, o)
    case "go":
      return toGo(t, o)
    case "php":
      return toPhp(t, o)
  }
}
