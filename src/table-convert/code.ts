// Saída como código: a tabela vira um literal pronto para colar (Python, pandas, TypeScript, Go, PHP).
// Os tipos vêm de columnKinds, os mesmos do JSON e do SQL.
import { uniqueKeys, type Scalar, type Table } from "./model"
import { columnKinds, typedRows, type ColumnKind, type SerializeOptions } from "./serialize"

const typed = (t: Table, o: SerializeOptions) => {
  const kinds = columnKinds(t, o)
  const rows = typedRows(t, o, kinds)
  const nullable = kinds.map((_, i) => rows.some((r) => r[i] === null))
  return { kinds, rows, nullable }
}

// ---------- Python ----------

const python = (v: Scalar) => (v === null ? "None" : v === true ? "True" : v === false ? "False" : typeof v === "number" ? String(v) : JSON.stringify(v))

export function toPython(t: Table, o: SerializeOptions = {}): string {
  const keys = uniqueKeys(t.columns).map((k) => JSON.stringify(k))
  const { rows } = typed(t, o)
  if (rows.length === 0) return "rows = []"
  return `rows = [\n${rows.map((r) => `    {${keys.map((k, i) => `${k}: ${python(r[i] ?? null)}`).join(", ")}},`).join("\n")}\n]`
}

export function toPandas(t: Table, o: SerializeOptions = {}): string {
  const keys = uniqueKeys(t.columns).map((k) => JSON.stringify(k))
  const { rows } = typed(t, o)
  const columns = keys.map((k, i) => `    ${k}: [${rows.map((r) => python(r[i] ?? null)).join(", ")}],`)
  return `import pandas as pd\n\ndf = pd.DataFrame({\n${columns.join("\n")}\n})`
}

// ---------- TypeScript ----------

const tsKey = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key))
const TS_TYPE: Record<ColumnKind, string> = { number: "number", integer: "number", boolean: "boolean", text: "string" }
const literal = (v: Scalar) => (v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v))

export function identifier(name: string, fallback = "Row"): string {
  const words = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  const joined = words.map((w) => w[0]?.toUpperCase() + w.slice(1)).join("")
  return !joined ? fallback : /^\d/.test(joined) ? `${fallback}${joined}` : joined
}

export function toTypeScript(t: Table, o: SerializeOptions = {}): string {
  const type = identifier(o.typeName ?? "", "Row")
  const keys = uniqueKeys(t.columns).map(tsKey)
  const { kinds, rows, nullable } = typed(t, o)
  const fields = keys.map((k, i) => `  ${k}: ${TS_TYPE[kinds[i] ?? "text"]}${nullable[i] ? " | null" : ""}`)
  const values = rows.map((r) => `  { ${keys.map((k, i) => `${k}: ${literal(r[i] ?? null)}`).join(", ")} },`)
  return `export interface ${type} {\n${fields.join("\n")}\n}\n\nexport const rows: ${type}[] = [\n${values.join("\n")}\n]`
}

// ---------- Go ----------

// Siglas em maiúsculas, como o gofmt/golint esperam (UserID, not UserId)
const INITIALISMS = new Set(["Id", "Url", "Uri", "Api", "Http", "Https", "Json", "Sql", "Uuid", "Ip", "Html", "Xml", "Cpf", "Cnpj"])
const GO_TYPE: Record<ColumnKind, string> = { number: "float64", integer: "int64", boolean: "bool", text: "string" }

function goField(name: string, used: Set<string>): string {
  const base = identifier(name, "Field").replace(/[A-Z][a-z]+|[a-z]+/g, (w) => (INITIALISMS.has(w[0]?.toUpperCase() + w.slice(1).toLowerCase()) ? w.toUpperCase() : w))
  let field = base
  for (let n = 2; used.has(field); n++) field = `${base}${n}`
  used.add(field)
  return field
}

export function toGo(t: Table, o: SerializeOptions = {}): string {
  const type = identifier(o.typeName ?? "", "Row")
  const keys = uniqueKeys(t.columns)
  const used = new Set<string>()
  const fields = keys.map((k) => goField(k, used))
  const { kinds, rows, nullable } = typed(t, o)
  // colunas com null viram ponteiro (nil = ausente); valores não nulos usam o helper ptr.
  // No literal, campos nulos ou "" ficam de fora (já são o valor zero do Go).
  const types = kinds.map((k, i) => `${nullable[i] ? "*" : ""}${GO_TYPE[k]}`)
  const nameWidth = Math.max(...fields.map((f) => f.length), 0)
  const typeWidth = Math.max(...types.map((f) => f.length), 0)
  const struct = fields.map((f, i) => `\t${f.padEnd(nameWidth)} ${(types[i] ?? "").padEnd(typeWidth)} \`json:"${(keys[i] ?? "").replace(/[`"\\]/g, "_")}"\``)
  const value = (v: Scalar, i: number) => {
    const plain = typeof v === "string" ? JSON.stringify(v) : String(v)
    return nullable[i] ? `ptr(${kinds[i] === "number" && typeof v === "number" && Number.isInteger(v) ? `float64(${plain})` : kinds[i] === "integer" ? `int64(${plain})` : plain})` : plain
  }
  const values = rows.map((r) => `\t{${fields.flatMap((f, i) => (r[i] === null || r[i] === undefined || r[i] === "" ? [] : [`${f}: ${value(r[i] as Scalar, i)}`])).join(", ")}},`)
  const helper = nullable.some(Boolean) ? "\n\nfunc ptr[T any](v T) *T { return &v }" : ""
  return `type ${type} struct {\n${struct.join("\n")}\n}\n\nvar rows = []${type}{\n${values.join("\n")}\n}${helper}`
}

// ---------- PHP ----------

const php = (v: Scalar) => (v === null ? "null" : typeof v === "boolean" ? String(v) : typeof v === "number" ? String(v) : `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`)

export function toPhp(t: Table, o: SerializeOptions = {}): string {
  const keys = uniqueKeys(t.columns).map(php)
  const { rows } = typed(t, o)
  return `<?php\n\n$rows = [\n${rows.map((r) => `    [${keys.map((k, i) => `${k} => ${php(r[i] ?? null)}`).join(", ")}],`).join("\n")}\n];`
}
