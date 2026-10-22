// Comandos do script de terminal (thecodecodex.com/cli.js). Cada comando aceita os MESMOS parâmetros da URL
// da ferramenta no site e chama as mesmas funções desta lib — o link do site vira o comando do terminal.
import { cnpjKind, formatCnpj, generateCnpj, isValidCnpj, type CnpjKind } from "../br/cnpj"
import { CPF_REGIONS, cpfRegion, formatCpf, generateCpf, isValidCpf } from "../br/cpf"
import { cltYear } from "../finance/clt"
import { simulate } from "../finance/compound"
import { bestRegime, compareRegimes } from "../finance/pj"
import { invoiceCodec, EMPTY_INVOICE, totals } from "../invoice"
import { invoicePdf } from "../invoice-pdf"
import { cdiAnnual, fxRate, ipca12m, market, marketFetchedAt, savingsAnnual, type Currency } from "../market"
import { UFS, type Uf } from "../state-holidays"
import { codec, type UrlCodec } from "../url-codec"
import { holidaysFor, planSplit, SPLITS, suggest, type Schedule } from "../vacation"
import { diffTexts, unifiedPatch, type Granularity, type JsonMode } from "../diff"
import { convert, type Codec, type Direction } from "../base64"
import { CSS_WARNING, DEMO_IDS, demoCss, DEMOS, findDemo, normalizeValues, previewDocument, variablesCss } from "../css-playground"
import { annualTargetFromCltOffer, DEFAULT_OPTIONS, foreignAmount, generateComparison } from "../compensation-comparator"
import { HTTP_CLASSES, queryDevRef, REF_SECTIONS, type HttpClass, type RefSection } from "../dev-ref"
import { calculateAngles, DEFAULT_SETUP, gameSettings, type Setup } from "../fov"
import { hashAll } from "../hash"
import { BACKGROUNDS, createSampleImages, DEFAULT_IMAGE_PDF_OPTIONS, FIT_MODES, imagesToPdf, ORIENTATIONS, PAGE_SIZES, type FitMode, type Orientation, type PageBackground, type PageSize } from "../image-to-pdf"
import { ALIGNS, ASCII_STYLES, CASES, convertTable, DECIMALS, DELIMITER_NAMES, INDENTS, INPUT_FORMATS, JSON_SHAPES, OUTPUT_FORMATS, SQL_DIALECTS } from "../table-convert"
import { decodeJwt, isExpired } from "../jwt"
import { entropyBits, generatePassword, strength, type Charset } from "../password"
import {
  createSamplePdf,
  DEFAULT_STUDIO_OPTIONS,
  NUMBER_FORMATS,
  NUMBER_POSITIONS,
  processPdf,
  ROTATIONS,
  TABS,
  WATERMARK_COLORS,
  type NumberFormat,
  type NumberPosition,
  type PdfStudioTab,
  type Rotation,
  type WatermarkColor,
} from "../pdf-studio"
import { DEFAULT_SKILLS_DIR, findSkill, installPlan, skillFile, SKILLS } from "../skills"
import { evaluateRegex, REGEX_MODES, REGEX_PRESETS, type RegexMode } from "../regex"
import { parseTimestamp, toUnix } from "../timestamp"
import { formatUuid, inspectUuid, uuidV4, uuidV7 } from "../uuid"

export type Params = URLSearchParams

export interface ParamDoc {
  name: string
  default: string
  description: string
}

// arquivos binários (PDF, .xlsx) saem como bytes no stdout; text sai cru (ex.: um SKILL.md);
// write lista arquivos que o script grava no disco (instalação de skills), com um resumo em JSON
export type ToolOutput = { json: unknown } | { pdf: Uint8Array, filename: string } | { file: Uint8Array, filename: string } | { text: string } | { write: { path: string, content: string }[], json: unknown }

export interface CliTool {
  description: string
  params: ParamDoc[]
  run: (params: Params) => ToolOutput | Promise<ToolOutput>
}

// Lê um parâmetro com o mesmo conversor do site; valor inválido ou ausente → padrão
function read<T>(params: Params, name: string, fallback: T, urlCodec: UrlCodec<T>): T {
  const raw = params.get(name)
  if (raw === null) return fallback
  const value = urlCodec.parse(raw)
  if (value === undefined) throw new Error(`Parâmetro inválido: ${name}=${raw}`)
  return value
}
const num = (p: Params, name: string, fallback: number) => read(p, name, fallback, codec.number)
const bool = (p: Params, name: string, fallback: boolean) => read(p, name, fallback, codec.boolean)
const str = (p: Params, name: string, fallback = "") => read(p, name, fallback, codec.string)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))
// booleanos documentados como na URL: 1 / 0
const doc = (name: string, fallback: string | number | boolean, description: string): ParamDoc => ({ name, default: typeof fallback === "boolean" ? (fallback ? "1" : "0") : String(fallback), description })
const marketSnapshot = (keys: (keyof typeof market)[]) => ({ fetchedAt: marketFetchedAt, ...Object.fromEntries(keys.map((k) => [k, market[k]])) })

export const TOOLS: Record<string, CliTool> = {
  cpf: {
    description: "Gera CPFs válidos para testes e/ou valida um CPF",
    params: [doc("q", 1, "quantidade (1-50)"), doc("uf", "", "estado de emissão"), doc("mask", true, "1 = com máscara"), doc("v", "", "CPF para validar")],
    run: (p) => {
      const uf = read(p, "uf", "", codec.oneOf(["", ...Object.keys(CPF_REGIONS)]))
      const mask = bool(p, "mask", true)
      const generated = Array.from({ length: clamp(num(p, "q", 1), 1, 50) }, () => generateCpf({ uf: uf || undefined })).map((v) => (mask ? formatCpf(v) : v))
      const input = str(p, "v")
      return { json: { generated, ...(input ? { validation: { input, valid: isValidCpf(input), formatted: formatCpf(input), regions: isValidCpf(input) ? cpfRegion(input) : [] } } : {}) } }
    },
  },
  cnpj: {
    description: "Gera CNPJs (numérico ou alfanumérico) e/ou valida um CNPJ",
    params: [doc("q", 1, "quantidade (1-50)"), doc("kind", "numeric", "numeric | alphanumeric"), doc("mask", true, "1 = com máscara"), doc("v", "", "CNPJ para validar")],
    run: (p) => {
      const kind = read<CnpjKind>(p, "kind", "numeric", codec.oneOf(["numeric", "alphanumeric"] as const))
      const mask = bool(p, "mask", true)
      const generated = Array.from({ length: clamp(num(p, "q", 1), 1, 50) }, () => generateCnpj({ kind })).map((v) => (mask ? formatCnpj(v) : v))
      const input = str(p, "v")
      return { json: { generated, ...(input ? { validation: { input, valid: isValidCnpj(input), formatted: formatCnpj(input), kind: cnpjKind(input) } } : {}) } }
    },
  },
  password: {
    description: "Gera senhas com crypto.getRandomValues",
    params: [doc("len", 20, "tamanho (4-128)"), doc("sets", "lower,upper,digits,symbols", "conjuntos de caracteres"), doc("noamb", false, "1 = evita I, l, 1, O, 0"), doc("q", 5, "quantidade (1-50)")],
    run: (p) => {
      const SETS: Charset[] = ["lower", "upper", "digits", "symbols"]
      const options = { length: clamp(num(p, "len", 20), 4, 128), sets: read<Charset[]>(p, "sets", SETS, codec.list(codec.oneOf(SETS))), excludeAmbiguous: bool(p, "noamb", false) }
      const bits = entropyBits(options)
      return { json: { passwords: Array.from({ length: clamp(num(p, "q", 5), 1, 50) }, () => generatePassword(options)), entropyBits: bits, strength: strength(bits) } }
    },
  },
  uuid: {
    description: "Gera UUID v4/v7 e/ou inspeciona um UUID",
    params: [doc("ver", 4, "4 | 7"), doc("q", 5, "quantidade (1-100)"), doc("upper", false, "1 = maiúsculas"), doc("hyphens", true, "0 = sem hífens"), doc("v", "", "UUID para inspecionar")],
    run: (p) => {
      const version = read(p, "ver", 4, codec.oneOf([4, 7] as const))
      const format = { uppercase: bool(p, "upper", false), hyphens: bool(p, "hyphens", true) }
      const uuids = Array.from({ length: clamp(num(p, "q", 5), 1, 100) }, () => formatUuid(version === 7 ? uuidV7() : uuidV4(), format))
      const input = str(p, "v")
      const info = input ? inspectUuid(input) : undefined
      return { json: { uuids, ...(info ? { inspect: { input, ...info, timestamp: info.timestamp?.toISOString() } } : {}) } }
    },
  },
  hash: {
    description: "SHA-1/256/384/512 de um texto",
    params: [doc("text", "", "texto")],
    run: async (p) => ({ json: { text: str(p, "text"), hashes: await hashAll(str(p, "text")) } }),
  },
  base64: {
    description: "Codifica/decodifica Base64, Base64URL ou URL",
    params: [doc("text", "", "texto"), doc("op", "encode", "encode | decode"), doc("fmt", "base64", "base64 | base64url | url")],
    run: (p) => {
      const format = read<Codec>(p, "fmt", "base64", codec.oneOf(["base64", "base64url", "url"] as const))
      const op = read<Direction>(p, "op", "encode", codec.oneOf(["encode", "decode"] as const))
      const result = convert(str(p, "text"), format, op)
      if (!result.ok) throw new Error("Entrada inválida para decodificar neste formato")
      return { json: { op, format, output: result.value } }
    },
  },
  jwt: {
    description: "Decodifica um JWT (sem verificar a assinatura)",
    params: [doc("token", "", "token JWT")],
    run: (p) => {
      const result = decodeJwt(str(p, "token"))
      if (!result.ok) throw new Error(result.error === "format" ? "JWT precisa de três partes separadas por ponto" : "Header ou payload não são JSON válidos")
      const { jwt } = result
      return { json: { header: jwt.header, payload: jwt.payload, issuedAt: jwt.issuedAt?.toISOString(), expiresAt: jwt.expiresAt?.toISOString(), notBefore: jwt.notBefore?.toISOString(), expired: isExpired(jwt), signatureVerified: false } }
    },
  },
  timestamp: {
    description: "Converte timestamp Unix ⇄ data",
    params: [doc("t", "agora", "timestamp (s, ms, µs ou ns)"), doc("date", "", "data ISO para converter em timestamp")],
    run: (p) => {
      const raw = str(p, "t") || String(toUnix(new Date()).seconds)
      const parsed = parseTimestamp(raw)
      if (!parsed) throw new Error(`Timestamp inválido: ${raw}`)
      const date = str(p, "date")
      const fromDate = date ? new Date(date) : undefined
      return {
        json: {
          fromUnix: { input: raw, unit: parsed.unit, iso: parsed.date.toISOString(), utc: parsed.date.toUTCString() },
          ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { fromDate: { input: date, ...toUnix(fromDate), iso: fromDate.toISOString() } } : {}),
        },
      }
    },
  },
  "fov-calculator": {
    description: "FOV para simuladores de corrida a partir do seu setup",
    params: [doc("ar", "16x9", "proporção"), doc("in", 27, "diagonal (pol.)"), doc("d", 60, "distância (cm)"), doc("n", 1, "telas: 1 | 3"), doc("b", 0, "moldura (mm)"), doc("c", false, "1 = curva"), doc("r", 1800, "raio (mm)"), doc("game", "", "filtra jogos pelo nome")],
    run: (p) => {
      const [x = 16, y = 9] = (str(p, "ar") || "16x9").split("x").map(Number)
      const setup: Setup = {
        ...DEFAULT_SETUP,
        aspect: [x, y],
        diagonalIn: num(p, "in", DEFAULT_SETUP.diagonalIn),
        distanceCm: num(p, "d", DEFAULT_SETUP.distanceCm),
        screens: num(p, "n", 1) === 3 ? 3 : 1,
        bezelMm: num(p, "b", 0),
        curved: bool(p, "c", false),
        radiusMm: num(p, "r", DEFAULT_SETUP.radiusMm),
      }
      const angles = calculateAngles(setup)
      const filter = str(p, "game").toLowerCase()
      return { json: { setup, angles, games: gameSettings(setup, angles).filter((g) => g.name.toLowerCase().includes(filter)) } }
    },
  },
  "net-salary": {
    description: "Salário líquido CLT 2026 e pacote anual",
    params: [
      doc("bruto", 8000, "salário bruto"),
      doc("dependentes", 0, "dependentes no IR"),
      doc("pensao", 0, "pensão alimentícia"),
      doc("vt", 0, "custo do vale-transporte"),
      doc("descontos", 0, "outros descontos"),
      doc("beneficios", 0, "benefícios mensais"),
      doc("bonus", 0, "PLR/bônus líquido anual"),
      doc("fgts", true, "0 = sem FGTS no pacote"),
    ],
    run: (p) => {
      const input = {
        gross: num(p, "bruto", 8000),
        dependents: clamp(num(p, "dependentes", 0), 0, 99),
        alimony: num(p, "pensao", 0),
        transportVoucher: num(p, "vt", 0),
        otherDiscounts: num(p, "descontos", 0),
        monthlyBenefits: num(p, "beneficios", 0),
        annualBonus: num(p, "bonus", 0),
        includeFgts: bool(p, "fgts", true),
      }
      return { json: { input, result: cltYear(input.gross, input) } }
    },
  },
  "compensation-comparator": {
    description: "Compara CLT, PJ e Cooperado (meta anual ou proposta CLT)",
    params: [
      doc("modo", "meta", "meta | clt"),
      doc("meta", DEFAULT_OPTIONS.targetLiquidity, "meta de liquidez anual"),
      doc("clt", 8000, "bruto da proposta CLT (modo=clt)"),
      doc("pj", DEFAULT_OPTIONS.pjTaxRate, "alíquota PJ (fração)"),
      doc("taxa", DEFAULT_OPTIONS.coopAdminFeeRate, "taxa admin cooperativa (fração)"),
      doc("ferias", DEFAULT_OPTIONS.businessVacationDays, "dias de férias do cooperado"),
      doc("prolabore", DEFAULT_OPTIONS.proLaboreValue, "remuneração declarada do cooperado"),
      doc("beneficios", 0, "benefícios CLT mensais"),
      doc("bonus", 0, "PLR/bônus CLT anual"),
      doc("fgts", true, "0 = sem FGTS"),
      doc("moeda", "BRL", "BRL | USD | EUR | GBP | CAD"),
      doc("cambio", "PTAX do dia", "câmbio"),
      doc("spread", 0.01, "spread (fração)"),
    ],
    run: (p) => {
      const options = {
        targetLiquidity: num(p, "meta", DEFAULT_OPTIONS.targetLiquidity),
        pjTaxRate: num(p, "pj", DEFAULT_OPTIONS.pjTaxRate),
        coopAdminFeeRate: num(p, "taxa", DEFAULT_OPTIONS.coopAdminFeeRate),
        businessVacationDays: num(p, "ferias", DEFAULT_OPTIONS.businessVacationDays),
        proLaboreValue: num(p, "prolabore", DEFAULT_OPTIONS.proLaboreValue),
        cltBenefitsMonthly: num(p, "beneficios", 0),
        cltAnnualBonus: num(p, "bonus", 0),
        includeFgts: bool(p, "fgts", true),
      }
      const mode = read(p, "modo", "meta", codec.oneOf(["meta", "clt"] as const))
      const offer = num(p, "clt", 8000)
      const target = mode === "clt" ? annualTargetFromCltOffer(offer, options) : options.targetLiquidity
      const results = generateComparison({ ...options, targetLiquidity: target })
      const currency = read(p, "moeda", "BRL", codec.oneOf(["BRL", "USD", "EUR", "GBP", "CAD"] as const))
      const rate = currency === "BRL" ? 1 : num(p, "cambio", fxRate(currency as Currency))
      const spread = num(p, "spread", 0.01)
      const pj = results[1]
      return {
        json: {
          mode,
          annualTarget: target,
          results,
          ...(mode === "clt" && pj ? { breakeven: { cltGross: offer, pjRevenue: pj.monthlyGrossOrRevenue, aboveCltGross: (pj.monthlyGrossOrRevenue - offer) / offer } } : {}),
          ...(currency !== "BRL" && pj ? { foreign: { currency, exchangeRate: rate, spread, pjRevenue: foreignAmount(pj.monthlyGrossOrRevenue, rate, spread) } } : {}),
          ...(currency !== "BRL" ? { market: marketSnapshot([currency.toLowerCase() as keyof typeof market]) } : {}),
        },
      }
    },
  },
  "compound-interest": {
    description: "Juros compostos com IR regressivo, inflação, poupança e CDI",
    params: [
      doc("inicial", 10_000, "depósito inicial"),
      doc("aporte", 1000, "aporte mensal"),
      doc("anos", 10, "prazo em anos"),
      doc("taxa", 0.12, "rentabilidade anual efetiva (fração)"),
      doc("ir", true, "0 = sem IR"),
      doc("ipca", "IPCA 12m do BCB", "inflação anual (fração)"),
      doc("poupanca", "poupança do BCB", "poupança anual (fração)"),
      doc("cdi", "CDI do BCB", "CDI anual (fração)"),
    ],
    run: (p) => {
      const base = { initial: num(p, "inicial", 10_000), monthly: num(p, "aporte", 1000), months: Math.max(1, Math.round(num(p, "anos", 10) * 12)), annualInflation: num(p, "ipca", ipca12m()) }
      return {
        json: {
          input: base,
          yours: simulate({ ...base, annualRate: num(p, "taxa", 0.12), taxed: bool(p, "ir", true) }),
          savings: simulate({ ...base, annualRate: num(p, "poupanca", savingsAnnual()), taxed: false }),
          cdi: simulate({ ...base, annualRate: num(p, "cdi", cdiAnnual()), taxed: true }),
          market: marketSnapshot(["cdi", "ipca12m", "savingsMonthly"]),
        },
      }
    },
  },
  "pj-taxes": {
    description: "Impostos PJ: MEI, Simples III (Fator R), Simples V e Lucro Presumido",
    params: [doc("faturamento", 20_000, "faturamento mensal"), doc("prolabore", 1621, "pró-labore mínimo"), doc("iss", 0.02, "ISS (fração)"), doc("contador", 300, "contador"), doc("despesas", 0, "outras despesas")],
    run: (p) => {
      const input = { monthlyRevenue: num(p, "faturamento", 20_000), proLabore: num(p, "prolabore", 1621), issRate: num(p, "iss", 0.02), accountant: num(p, "contador", 300), otherExpenses: num(p, "despesas", 0) }
      const regimes = compareRegimes(input)
      return { json: { input, best: bestRegime(regimes)?.regime, regimes } }
    },
  },
  "vacation-planner": {
    description: "Melhores datas de férias emendando feriados (CLT)",
    params: [
      doc("ano", "ano atual", "ano"),
      doc("dias", 10, "dias de férias (modo=single)"),
      doc("modo", "single", "single | split"),
      doc("divisao", 1, `índice da divisão: ${SPLITS.map((s, i) => `${i}=${s.join("+")}`).join(", ")}`),
      doc("escala", "5x2", "5x2 | 6x1"),
      doc("facultativos", false, "1 = folga no Carnaval/Corpus Christi"),
      doc("uf", "", "estado (feriados estaduais)"),
      doc("folgas", "", "feriados locais: AAAA-MM-DD,..."),
    ],
    run: (p) => {
      const input = {
        year: num(p, "ano", new Date().getFullYear()),
        schedule: read<Schedule>(p, "escala", "5x2", codec.oneOf(["5x2", "6x1"] as const)),
        includeOptional: bool(p, "facultativos", false),
        extraDaysOff: read<string[]>(p, "folgas", [], codec.list(codec.string)),
        uf: (read(p, "uf", "", codec.oneOf(["", ...UFS] as const)) || undefined) as Uf | undefined,
      }
      const mode = read(p, "modo", "single", codec.oneOf(["single", "split"] as const))
      const holidays = holidaysFor(input)
      if (mode === "split") {
        const parts = SPLITS[clamp(num(p, "divisao", 1), 0, SPLITS.length - 1)] ?? [15, 15]
        return { json: { input: { ...input, mode, split: parts }, plan: planSplit(input, parts), holidays } }
      }
      const days = clamp(num(p, "dias", 10), 1, 30)
      return { json: { input: { ...input, mode, days }, suggestions: suggest({ ...input, days }, 5), holidays } }
    },
  },
  diff: {
    description: "Compara dois textos: linhas/caracteres diferentes, similaridade, JSON com chaves ordenadas e patch .diff",
    params: [
      doc("a", "", "texto original"),
      doc("b", "", "texto alterado"),
      doc("gran", "char", "destaque dentro da linha: char | word"),
      doc("json", "off", "off | format | sortKeys"),
      doc("ws", false, "1 = ignora espaços extras"),
      doc("case", false, "1 = ignora maiúsculas"),
      doc("eol", true, "0 = diferencia CRLF de LF"),
      doc("sort", false, "1 = ordena as linhas antes"),
    ],
    run: (p) => {
      const result = diffTexts(str(p, "a"), str(p, "b"), {
        granularity: read<Granularity>(p, "gran", "char", codec.oneOf(["char", "word"] as const)),
        json: read<JsonMode>(p, "json", "off", codec.oneOf(["off", "format", "sortKeys"] as const)),
        ignoreWhitespace: bool(p, "ws", false),
        ignoreCase: bool(p, "case", false),
        ignoreLineEndings: bool(p, "eol", true),
        sortLines: bool(p, "sort", false),
      })
      return { json: { identical: result.identical, onlyOrderDiffers: result.onlyOrderDiffers, stats: result.stats, rows: result.rows.filter((r) => r.type !== "equal"), patch: unifiedPatch(result) } }
    },
  },
  "css-playground": {
    description: "Demos do CSS Playground: variáveis dos controles, CSS da demo e o HTML completo da prévia",
    params: [
      doc("demo", DEMO_IDS[0] ?? "", `demo: ${DEMO_IDS.join(" | ")}`),
      doc("v", "", "valores dos controles, na ordem, separados por vírgula"),
      doc("css", "", "CSS editado (no site fica depois do #)"),
      doc("lang", "pt", "pt | en (comentários e textos da demo)"),
    ],
    run: (p) => {
      const demoId = read(p, "demo", DEMO_IDS[0] ?? "", codec.oneOf(DEMO_IDS))
      const lang = read(p, "lang", "pt", codec.oneOf(["pt", "en"] as const))
      const demo = findDemo(demoId)
      const values = normalizeValues(demo, p.get("v") ? read(p, "v", [], codec.list(codec.string)) : [])
      const css = str(p, "css") || demoCss(demo, lang)
      const warning = CSS_WARNING[lang]
      return {
        json: {
          demo: demo.id,
          category: demo.category,
          support: demo.support,
          demos: DEMOS.length,
          controls: demo.controls.map((control, i) => ({ name: control.name, kind: control.kind, value: values[i] })),
          variables: variablesCss(demo, values),
          css,
          html: previewDocument({ demo, css, values, lang, warning }),
        },
      }
    },
  },
  "table-convert": {
    description: "Converte tabelas entre CSV/TSV, JSON, Markdown e HTML e 22 saídas (Excel, SQL, YAML, TOML, wikis, Python, TypeScript, Go…), com ordenação, colunas e limpeza",
    params: [
      doc("in", "", "tabela de entrada (texto)"),
      doc("from", "auto", INPUT_FORMATS.join(" | ")),
      doc("delim", "auto", `separador da entrada: auto | ${DELIMITER_NAMES.join(" | ")}`),
      doc("header", true, "0 = a primeira linha é dado, não cabeçalho"),
      doc("dec", "dot", "números na entrada: dot (1234.5) | comma (1.234,5)"),
      doc("to", "json", `${OUTPUT_FORMATS.join(" | ")} (xlsx sai como arquivo: redirecione com > tabela.xlsx)`),
      doc("types", true, "0 = tudo como texto (JSON, YAML, SQL)"),
      doc("null", false, "1 = células vazias viram null"),
      doc("odelim", "comma", `separador da saída CSV: ${DELIMITER_NAMES.join(" | ")}`),
      doc("shape", "objects", `estrutura do JSON: ${JSON_SHAPES.join(" | ")}`),
      doc("indent", "2", INDENTS.join(" | ")),
      doc("tbl", "my_table", "nome da tabela SQL"),
      doc("dialect", "mysql", SQL_DIALECTS.join(" | ")),
      doc("multi", true, "0 = um INSERT por linha"),
      doc("create", false, "1 = inclui CREATE TABLE"),
      doc("align", "none", `Markdown/LaTeX: ${ALIGNS.join(" | ")}`),
      doc("pretty", true, "0 = sem alinhar colunas / indentar"),
      doc("root", "rows", "elemento raiz do XML / nome da lista no TOML"),
      doc("rowtag", "row", "elemento de cada linha do XML"),
      doc("box", "unicode", ASCII_STYLES.join(" | ")),
      doc("type", "Row", "nome do tipo (Go, TypeScript)"),
      doc("sheet", "Sheet1", "nome da aba (xlsx)"),
      doc("trim", false, "1 = remove espaços extras"),
      doc("empty", false, "1 = remove linhas e colunas vazias"),
      doc("dedupe", false, "1 = remove linhas duplicadas"),
      doc("transpose", false, "1 = transpõe"),
      doc("case", "none", CASES.join(" | ")),
      doc("find", "", "texto a localizar"),
      doc("repl", "", "substituição"),
      doc("regex", false, "1 = find é expressão regular"),
      doc("icase", false, "1 = ignora maiúsculas ao localizar"),
      doc("sort", -1, "índice (0, 1…) da coluna para ordenar"),
      doc("desc", false, "1 = ordem decrescente"),
      doc("cols", "", "colunas na ordem desejada, por índice: 2,0,1"),
    ],
    run: (p) => {
      const to = read(p, "to", "json", codec.oneOf(OUTPUT_FORMATS))
      const { parsed, result, output, file } = convertTable(str(p, "in"), {
        from: read(p, "from", "auto", codec.oneOf(INPUT_FORMATS)),
        delimiter: read(p, "delim", "auto", codec.oneOf(["auto", ...DELIMITER_NAMES] as const)),
        header: bool(p, "header", true),
        decimal: read(p, "dec", "dot", codec.oneOf(DECIMALS)),
        to,
        types: bool(p, "types", true),
        emptyAsNull: bool(p, "null", false),
        outputDelimiter: read(p, "odelim", "comma", codec.oneOf(DELIMITER_NAMES)),
        jsonShape: read(p, "shape", "objects", codec.oneOf(JSON_SHAPES)),
        indent: read(p, "indent", "2", codec.oneOf(INDENTS)),
        tableName: str(p, "tbl", "my_table"),
        dialect: read(p, "dialect", "mysql", codec.oneOf(SQL_DIALECTS)),
        multiRow: bool(p, "multi", true),
        createTable: bool(p, "create", false),
        align: read(p, "align", "none", codec.oneOf(ALIGNS)),
        pretty: bool(p, "pretty", true),
        xmlRoot: str(p, "root", "rows"),
        xmlRow: str(p, "rowtag", "row"),
        asciiStyle: read(p, "box", "unicode", codec.oneOf(ASCII_STYLES)),
        typeName: str(p, "type", "Row"),
        sheet: str(p, "sheet", "Sheet1"),
        trim: bool(p, "trim", false),
        dropEmpty: bool(p, "empty", false),
        dedupe: bool(p, "dedupe", false),
        transpose: bool(p, "transpose", false),
        caseMode: read(p, "case", "none", codec.oneOf(CASES)),
        find: str(p, "find"),
        replace: str(p, "repl"),
        regex: bool(p, "regex", false),
        ignoreCase: bool(p, "icase", false),
        sortBy: num(p, "sort", -1),
        descending: bool(p, "desc", false),
        columns: p.get("cols") ? read(p, "cols", [], codec.list(codec.number)) : [],
      })
      if (file) return { file, filename: "table.xlsx" }
      return { json: { detected: { format: parsed.format, delimiter: parsed.delimiter }, size: { rows: result.table.rows.length, columns: result.table.columns.length }, removedDuplicates: result.removedDuplicates, removedEmpty: result.removedEmpty, output } }
    },
  },
  invoice: {
    description: "Gera o PDF do invoice (mesmo JSON do link do site: #invoice=...)",
    params: [doc("invoice", "exemplo", "invoice em JSON (copie do link do site)"), doc("format", "pdf", "pdf | json")],
    run: async (p) => {
      const raw = p.get("invoice")
      const invoice = raw ? invoiceCodec.parse(raw) : EMPTY_INVOICE
      if (!invoice) throw new Error("invoice= precisa ser o JSON do invoice (o mesmo do link do site)")
      if (p.get("format") === "json") return { json: { invoice, totals: totals(invoice.items, invoice.discount, invoice.tax) } }
      return { pdf: await invoicePdf(invoice), filename: `${invoice.number || "invoice"}.pdf` }
    },
  },
  "pdf-studio": {
    description: "Mescla, divide por intervalo, gira, numera, aplica marca d'água, achata formulários e edita metadados de PDFs",
    params: [
      doc("tab", "organize", TABS.join(" | ")),
      doc("pages", "", "intervalo de páginas (ex.: 1-3,5,4-2; vazio = todas)"),
      doc("rot", DEFAULT_STUDIO_OPTIONS.rotation, ROTATIONS.join(" | ")),
      doc("num", DEFAULT_STUDIO_OPTIONS.pageNumbers, "1 = numera as páginas"),
      doc("numpos", DEFAULT_STUDIO_OPTIONS.numberPosition, NUMBER_POSITIONS.join(" | ")),
      doc("numfmt", DEFAULT_STUDIO_OPTIONS.numberFormat, NUMBER_FORMATS.join(" | ")),
      doc("numstart", DEFAULT_STUDIO_OPTIONS.numberStart, "número inicial"),
      doc("wm", "", "texto da marca d'água"),
      doc("wmsize", DEFAULT_STUDIO_OPTIONS.watermarkSize, "tamanho da fonte da marca d'água (pt)"),
      doc("wmop", DEFAULT_STUDIO_OPTIONS.watermarkOpacity, "opacidade da marca d'água (5-100%)"),
      doc("wmrot", DEFAULT_STUDIO_OPTIONS.watermarkAngle, "ângulo da marca d'água (-90 a 90°)"),
      doc("wmcolor", DEFAULT_STUDIO_OPTIONS.watermarkColor, WATERMARK_COLORS.join(" | ")),
      doc("flatten", DEFAULT_STUDIO_OPTIONS.flattenForms, "1 = achata campos de formulário"),
      doc("clearmeta", DEFAULT_STUDIO_OPTIONS.clearMetadata, "1 = limpa todos os metadados"),
      doc("title", "", "título do PDF"),
      doc("author", "", "autor do PDF"),
      doc("subject", "", "assunto do PDF"),
      doc("keywords", "", "palavras-chave separadas por vírgula"),
      doc("creator", "", "aplicação criadora"),
      doc("in", "exemplo", "PDF(s) em Base64 separados por vírgula (vazio = PDF de exemplo)"),
      doc("format", "pdf", "pdf | json"),
    ],
    run: async (p) => {
      const tab = read<PdfStudioTab>(p, "tab", "organize", codec.oneOf(TABS))
      const rawIn = str(p, "in")
      const sources = rawIn
        ? rawIn
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
        : [await createSamplePdf()]
      const { bytes, inspection } = await processPdf(sources, {
        pageRange: str(p, "pages"),
        rotation: read<Rotation>(p, "rot", DEFAULT_STUDIO_OPTIONS.rotation, codec.oneOf(ROTATIONS)),
        pageNumbers: bool(p, "num", DEFAULT_STUDIO_OPTIONS.pageNumbers),
        numberPosition: read<NumberPosition>(p, "numpos", DEFAULT_STUDIO_OPTIONS.numberPosition, codec.oneOf(NUMBER_POSITIONS)),
        numberFormat: read<NumberFormat>(p, "numfmt", DEFAULT_STUDIO_OPTIONS.numberFormat, codec.oneOf(NUMBER_FORMATS)),
        numberStart: num(p, "numstart", DEFAULT_STUDIO_OPTIONS.numberStart),
        watermarkText: str(p, "wm"),
        watermarkSize: num(p, "wmsize", DEFAULT_STUDIO_OPTIONS.watermarkSize),
        watermarkOpacity: num(p, "wmop", DEFAULT_STUDIO_OPTIONS.watermarkOpacity),
        watermarkAngle: num(p, "wmrot", DEFAULT_STUDIO_OPTIONS.watermarkAngle),
        watermarkColor: read<WatermarkColor>(p, "wmcolor", DEFAULT_STUDIO_OPTIONS.watermarkColor, codec.oneOf(WATERMARK_COLORS)),
        flattenForms: bool(p, "flatten", DEFAULT_STUDIO_OPTIONS.flattenForms),
        clearMetadata: bool(p, "clearmeta", DEFAULT_STUDIO_OPTIONS.clearMetadata),
        metadata: {
          title: str(p, "title") || undefined,
          author: str(p, "author") || undefined,
          subject: str(p, "subject") || undefined,
          keywords: str(p, "keywords") || undefined,
          creator: str(p, "creator") || undefined,
        },
      })
      const format = read(p, "format", "pdf", codec.oneOf(["pdf", "json"] as const))
      if (format === "json") return { json: { tab, inspection } }
      return { pdf: bytes, filename: "pdf-studio.pdf" }
    },
  },
  "image-to-pdf": {
    description: "Converte imagens (PNG/JPEG) em um documento PDF com controle de tamanho de folha, orientação, encaixe e margens",
    params: [
      doc("size", DEFAULT_IMAGE_PDF_OPTIONS.pageSize, PAGE_SIZES.join(" | ")),
      doc("orient", DEFAULT_IMAGE_PDF_OPTIONS.orientation, ORIENTATIONS.join(" | ")),
      doc("fit", DEFAULT_IMAGE_PDF_OPTIONS.fit, FIT_MODES.join(" | ")),
      doc("margin", DEFAULT_IMAGE_PDF_OPTIONS.margin, "margem em pt (0-144)"),
      doc("bg", DEFAULT_IMAGE_PDF_OPTIONS.background, BACKGROUNDS.join(" | ")),
      doc("title", "", "título do PDF"),
      doc("author", "", "autor do PDF"),
      doc("in", "exemplo", "imagens PNG/JPEG em Base64 separadas por vírgula (vazio = imagens de exemplo)"),
      doc("format", "pdf", "pdf | json"),
    ],
    run: async (p) => {
      const rawIn = str(p, "in")
      const images = rawIn
        ? rawIn
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((b64, i) => ({ name: `image-${i + 1}`, bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) }))
        : createSampleImages()
      const { bytes, pages } = await imagesToPdf(images, {
        pageSize: read<PageSize>(p, "size", DEFAULT_IMAGE_PDF_OPTIONS.pageSize, codec.oneOf(PAGE_SIZES)),
        orientation: read<Orientation>(p, "orient", DEFAULT_IMAGE_PDF_OPTIONS.orientation, codec.oneOf(ORIENTATIONS)),
        fit: read<FitMode>(p, "fit", DEFAULT_IMAGE_PDF_OPTIONS.fit, codec.oneOf(FIT_MODES)),
        margin: clamp(num(p, "margin", DEFAULT_IMAGE_PDF_OPTIONS.margin), 0, 144),
        background: read<PageBackground>(p, "bg", DEFAULT_IMAGE_PDF_OPTIONS.background, codec.oneOf(BACKGROUNDS)),
        title: str(p, "title"),
        author: str(p, "author"),
      })
      const format = read(p, "format", "pdf", codec.oneOf(["pdf", "json"] as const))
      if (format === "json") return { json: { pageCount: pages.length, byteLength: bytes.byteLength, pages } }
      return { pdf: bytes, filename: "image-to-pdf.pdf" }
    },
  },
  regex: {
    description: "Testa expressões regulares: ocorrências, grupos numerados e nomeados, substituição (replace) e explicação de tokens",
    params: [
      doc("p", REGEX_PRESETS[0]!.pattern, "expressão regular"),
      doc("f", REGEX_PRESETS[0]!.flags, "flags: g, i, m, s, u"),
      doc("mode", "match", REGEX_MODES.join(" | ")),
      doc("repl", REGEX_PRESETS[0]!.replacement, "texto de substituição ($&, $1, $<nome>)"),
      doc("text", REGEX_PRESETS[0]!.text, "texto de teste"),
      doc("lang", "pt", "pt | en"),
    ],
    run: (p) => {
      const preset = REGEX_PRESETS[0]!
      const pattern = p.has("p") ? str(p, "p") : preset.pattern
      const flags = p.has("f") ? str(p, "f") : preset.flags
      const mode = read<RegexMode>(p, "mode", "match", codec.oneOf(REGEX_MODES))
      const replacement = p.has("repl") ? str(p, "repl") : preset.replacement
      const text = p.has("text") ? str(p, "text") : preset.text
      const lang = read(p, "lang", "pt", codec.oneOf(["pt", "en"] as const))
      const evaluation = evaluateRegex(pattern, flags, text, replacement, lang)
      if (!evaluation.ok) throw new Error(evaluation.error ?? "Expressão regular inválida")
      return {
        json: {
          pattern: evaluation.pattern,
          flags: evaluation.flags,
          mode,
          matchCount: evaluation.matches.length,
          matches: evaluation.matches,
          replaced: evaluation.replaced,
          tokens: evaluation.tokens,
        },
      }
    },
  },
  "dev-ref": {
    description: "Consulta rápida de códigos HTTP (RFC 9110), portas TCP/UDP, tipos MIME e tabela ASCII (dec/hex/oct/bin)",
    params: [
      doc("sec", "all", REF_SECTIONS.join(" | ")),
      doc("q", "", "termo de busca (ex.: 429, 5432, postgres, problem+json, 0x1B)"),
      doc("http", "all", HTTP_CLASSES.join(" | ")),
    ],
    run: (p) => {
      const section = read<RefSection>(p, "sec", "all", codec.oneOf(REF_SECTIONS))
      const query = str(p, "q")
      const httpClass = read<HttpClass>(p, "http", "all", codec.oneOf(HTTP_CLASSES))
      const res = queryDevRef({ section, query, httpClass, onlyCommonAscii: section === "all" && !query.trim() })
      return { json: { section, query, httpClass, ...res } }
    },
  },
  "ai-skills": {
    description: "Catálogo de skills de IA (formato Agent Skills): lista as skills, imprime um arquivo ou instala a pasta da skill",
    params: [
      doc("name", "", `skill a imprimir ou instalar; vazio lista o catálogo; all instala todas (${SKILLS.map((s) => s.name).join(" | ")})`),
      doc("file", "SKILL.md", "arquivo da skill a imprimir (ex.: references/checklist.md)"),
      doc("install", false, "1 grava todos os arquivos em <dir>/<name>/ em vez de imprimir"),
      doc("dir", DEFAULT_SKILLS_DIR, "pasta de destino da instalação (Claude Code no projeto: .claude/skills; para todos os projetos: dir=$HOME/.claude/skills)"),
    ],
    run: (p) => {
      const name = str(p, "name")
      const install = bool(p, "install", false)
      const dir = str(p, "dir", DEFAULT_SKILLS_DIR)
      if (!name) {
        return { json: { skills: SKILLS.map((s) => ({ name: s.name, description: s.description, version: s.version, files: s.files.map((f) => f.path) })), next: "name=<skill> imprime o SKILL.md; name=<skill> install=1 instala a pasta" } }
      }
      const selected = name === "all" ? SKILLS : [findSkill(name)].filter((s) => s !== undefined)
      if (selected.length === 0) throw new Error(`Skill desconhecida: ${name}. Disponíveis: ${SKILLS.map((s) => s.name).join(", ")}`)
      if (install) {
        const files = installPlan(selected, dir)
        return { write: files, json: { installed: selected.map((s) => s.name), dir, files: files.map((f) => f.path) } }
      }
      if (name === "all") throw new Error("name=all só funciona com install=1")
      const skill = selected[0] as (typeof SKILLS)[number]
      const path = str(p, "file", "SKILL.md")
      const file = skillFile(skill, path)
      if (!file) throw new Error(`Arquivo desconhecido: ${path}. Arquivos de ${skill.name}: ${skill.files.map((f) => f.path).join(", ")}`)
      return { text: file.content }
    },
  },
}
