// Conversor de tabelas: entrada (CSV/TSV, Excel, JSON, Markdown, HTML) → modelo único → transformações → saída.
// Funções puras, usadas igualmente pela página e pelo comando de terminal.
import { parseTable, type ParseOptions, type Parsed } from "./parse"
import { serialize, type OutputFormat, type SerializeOptions } from "./serialize"
import { transformTable, type TransformOptions, type Transformed } from "./transform"
import { toXlsx } from "./xlsx"

export * from "./model"
export * from "./parse"
export * from "./serialize"
export * from "./transform"
export * from "./code"
export * from "./xlsx"

export interface ConvertOptions extends ParseOptions, TransformOptions, SerializeOptions {
  to?: OutputFormat
  sheet?: string
}

export interface Conversion {
  parsed: Parsed
  result: Transformed
  // texto da saída; para xlsx fica vazio e o arquivo vem em `file`
  output: string
  file?: Uint8Array
}

export function convertTable(text: string, options: ConvertOptions = {}): Conversion {
  const parsed = parseTable(text, options)
  const result = transformTable(parsed.table, options)
  const to = options.to ?? "json"
  if (!result.table.columns.length) return { parsed, result, output: "" }
  if (to === "xlsx") return { parsed, result, output: "", file: toXlsx(result.table, options) }
  return { parsed, result, output: serialize(result.table, to, options) }
}

export const SAMPLE = `id,name,email,city,salary,active
1,Ana Souza,ana@example.com,São Paulo,8500.50,true
2,Bruno Lima,bruno@example.com,Porto Alegre,7200,false
3,Carla Dias,carla@example.com,Recife,9100,true
4,"Diego, Jr.",diego@example.com,Curitiba,,true`

