export const REGEX_FLAGS = ["g", "i", "m", "s", "u"] as const
export type RegexFlag = (typeof REGEX_FLAGS)[number]

export const REGEX_MODES = ["match", "replace", "cheatsheet"] as const
export type RegexMode = (typeof REGEX_MODES)[number]

export interface RegexPreset {
  id: string
  category: "documents" | "dev"
  label: { pt: string, en: string }
  note: { pt: string, en: string }
  pattern: string
  flags: string
  text: string
  replacement: string
}

export const REGEX_PRESETS: RegexPreset[] = [
  {
    id: "iso-date",
    category: "dev",
    label: { pt: "Data ISO", en: "ISO Date" },
    note: { pt: "Captura ano, mês e dia no formato AAAA-MM-DD e converte para DD/MM/AAAA.", en: "Captures year, month, and day in YYYY-MM-DD format and converts to DD/MM/YYYY." },
    pattern: "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})",
    flags: "g",
    text: "Release 2026-10-21 and LTS support until 2028-04-30.",
    replacement: "$<day>/$<month>/$<year>",
  },
  {
    id: "cpf",
    category: "documents",
    label: { pt: "CPF", en: "CPF (Brazil)" },
    note: { pt: "Aceita com ou sem máscara, isola o 9º dígito (região fiscal) e aplica formatação padrão.", en: "Matches formatted or unformatted CPF, isolates the 9th digit (tax region) and formats." },
    pattern: "\\b(?<b1>\\d{3})\\.?((?<b2>\\d{3}))\\.?((?<b3>\\d{2})(?<regiao>\\d))-?(?<dv>\\d{2})\\b",
    flags: "g",
    text: "CPFs de teste: 529.982.247-25 (RJ/ES) e sem máscara 11144477735.",
    replacement: "$<b1>.$<b2>.$<b3>$<regiao>-$<dv>",
  },
  {
    id: "cnpj",
    category: "documents",
    label: { pt: "CNPJ (Num/Alfa)", en: "CNPJ (Num/Alpha)" },
    note: { pt: "Compatível com o CNPJ numérico tradicional e o novo CNPJ alfanumérico (IN RFB 2.229/2024).", en: "Matches both classic numeric CNPJ and the new alphanumeric CNPJ (IN RFB 2.229/2024)." },
    pattern: "\\b(?<r1>[0-9A-Z]{2})\\.?(?<r2>[0-9A-Z]{3})\\.?(?<r3>[0-9A-Z]{3})\\/?(?<filial>[0-9A-Z]{4})-?(?<dv>\\d{2})\\b",
    flags: "g",
    text: "Matriz numérica 11.222.333/0001-81 e novo alfanumérico 12.ABC.345/01DE-35 (ou 12ABC34501DE35).",
    replacement: "$<r1>.$<r2>.$<r3>/$<filial>-$<dv>",
  },
  {
    id: "nfe",
    category: "documents",
    label: { pt: "Chave NF-e (44 díg.)", en: "NF-e Access Key (44d)" },
    note: { pt: "Decompõe os 44 dígitos da NF-e (55), CT-e (57) ou NFC-e (65): UF, AAMM, CNPJ, modelo, série, número, emissão, código e DV.", en: "Parses all 44 characters of Brazilian NF-e/NFC-e/CT-e keys into UF, YYMM, CNPJ, model, series, number, and check digit." },
    pattern: "\\b(?<uf>\\d{2})(?<aamm>\\d{4})(?<cnpj>[0-9A-Z]{14})(?<mod>55|57|65)(?<serie>\\d{3})(?<nnf>\\d{9})(?<tpEmis>[1-9])(?<cnf>\\d{8})(?<dv>\\d)\\b",
    flags: "g",
    text: "NF-e SP: 35261011222333000181550010000123451087654320 e NFC-e RS: 43261012ABC34501DE35650010000009871123456789.",
    replacement: "UF:$<uf> AAMM:$<aamm> CNPJ:$<cnpj> Mod:$<mod> Nº:$<nnf>-$<dv>",
  },
  {
    id: "cep",
    category: "documents",
    label: { pt: "CEP", en: "Postal Code (CEP)" },
    note: { pt: "Reconhece CEP de 8 dígitos com ou sem hífen e aplica a máscara 00000-000.", en: "Matches 8-digit Brazilian postal codes with or without hyphen and formats as 00000-000." },
    pattern: "\\b(?<setor>\\d{5})-?(?<sufixo>\\d{3})\\b",
    flags: "g",
    text: "Endereços: 01310-100 (São Paulo) e sem hífen 90010150 (Porto Alegre).",
    replacement: "$<setor>-$<sufixo>",
  },
  {
    id: "phone-br",
    category: "documents",
    label: { pt: "Telefone / Celular BR", en: "Phone BR (+55)" },
    note: { pt: "Extrai DDD e número fixo (8 dígitos) ou móvel (9 dígitos), com DDI +55 opcional.", en: "Extracts area code (DDD) and 8- or 9-digit Brazilian phone numbers with optional +55." },
    pattern: "(?:\\+?55\\s?)?\\(?(?<ddd>[1-9]{2})\\)?[\\s-]?(?<prefixo>9?\\d{4})-?(?<final>\\d{4})\\b",
    flags: "g",
    text: "Contatos: +55 (11) 98765-4321, (51) 3210-9988 e direto 21999887766.",
    replacement: "($<ddd>) $<prefixo>-$<final>",
  },
  {
    id: "placa-mercosul",
    category: "documents",
    label: { pt: "Placa Mercosul/Antiga", en: "Vehicle Plate (BR)" },
    note: { pt: "Valida placas brasileiras tanto no padrão Mercosul (ABC1D23) quanto no antigo (ABC-1234).", en: "Matches both Mercosul (ABC1D23) and legacy (ABC-1234) Brazilian license plates." },
    pattern: "\\b(?<letras>[A-Z]{3})-?(?<n1>\\d)(?<meio>[A-Z0-9])(?<n2>\\d{2})\\b",
    flags: "g",
    text: "Frota: BRA2E19 (Mercosul) e ABC-1234 (padrão cinza antigo).",
    replacement: "$<letras>-$<n1>$<meio>$<n2>",
  },
  {
    id: "email",
    category: "dev",
    label: { pt: "E-mail", en: "Email" },
    note: { pt: "Separa usuário (incluindo alias +tag) e domínio.", en: "Extracts local username (including +tag alias) and domain." },
    pattern: "(?<user>[a-zA-Z0-9._%+-]+)@(?<domain>[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})",
    flags: "gi",
    text: "Reach out to dev@thecodecodex.com or financeiro+nfe@empresa.com.br.",
    replacement: "$<user> [at] $<domain>",
  },
  {
    id: "uuid",
    category: "dev",
    label: { pt: "UUID / PIX EVP", en: "UUID / PIX Key" },
    note: { pt: "Identifica UUIDs (v1 a v8, incluindo v4 usado em chaves PIX aleatórias e v7 ordenável por tempo).", en: "Matches UUIDs (v1–v8, including v4 random PIX keys and time-ordered v7)." },
    pattern: "\\b(?<low>[0-9a-f]{8})-(?<mid>[0-9a-f]{4})-(?<ver>[1-8])(?<hi>[0-9a-f]{3})-(?<var>[89ab][0-9a-f]{3})-(?<node>[0-9a-f]{12})\\b",
    flags: "gi",
    text: "PIX EVP (v4): 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d e UUID v7: 018f4a7c-8d10-7b2a-9f11-3c4d5e6f7a8b.",
    replacement: "v$<ver>:$<low>…$<node>",
  },
  {
    id: "jwt",
    category: "dev",
    label: { pt: "JWT Token", en: "JWT Token" },
    note: { pt: "Separa header, payload (ambos JSON em Base64URL iniciando com eyJ) e assinatura.", en: "Splits Base64URL-encoded JSON header, payload (starting with eyJ), and signature." },
    pattern: "\\b(?<header>eyJ[A-Za-z0-9_-]+)\\.(?<payload>eyJ[A-Za-z0-9_-]+)\\.(?<signature>[A-Za-z0-9_-]+)\\b",
    flags: "g",
    text: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    replacement: "$<header>.$<payload>.[REDACTED_SIG]",
  },
  {
    id: "semver",
    category: "dev",
    label: { pt: "SemVer", en: "SemVer" },
    note: { pt: "Extrai major, minor, patch e sufixo de pré-lançamento opcional.", en: "Extracts major, minor, patch, and optional pre-release tag." },
    pattern: "\\bv?(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<pre>[0-9A-Za-z.-]+))?\\b",
    flags: "g",
    text: "Upgrading runtime from v1.14.2-beta.1 to v2.0.0 (legacy 0.9.4).",
    replacement: "v$<major>.$<minor>.$<patch>",
  },
  {
    id: "ipv4",
    category: "dev",
    label: { pt: "IPv4", en: "IPv4" },
    note: { pt: "Valida cada octeto entre 0 e 255 (rejeita números como 999.1.1.1).", en: "Validates each octet within 0–255 (rejects out-of-range values like 999.1.1.1)." },
    pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b",
    flags: "g",
    text: "Nodes: 10.0.0.1, 192.168.1.254, loopback 127.0.0.1 (invalid: 999.1.1.1).",
    replacement: "[REDACTED_IP]",
  },
  {
    id: "log-line",
    category: "dev",
    label: { pt: "Linha de log", en: "Log line" },
    note: { pt: "Extrai severidade, horário e mensagem linha a linha com a flag m.", en: "Extracts severity level, timestamp, and message per line using the m flag." },
    pattern: "^\\[(?<level>INFO|WARN|ERROR)\\]\\s+(?<time>\\d{2}:\\d{2}:\\d{2})\\s+(?<msg>.+)$",
    flags: "gm",
    text: "[INFO] 14:02:10 Server listening on :8080\n[WARN] 14:02:12 High memory usage (84%)\n[ERROR] 14:02:15 Upstream timeout after 5000ms",
    replacement: "$<time> ($<level>) -> $<msg>",
  },
  {
    id: "url",
    category: "dev",
    label: { pt: "URL HTTP/HTTPS", en: "HTTP/HTTPS URL" },
    note: { pt: "Decompõe protocolo, host, caminho e query string.", en: "Splits scheme, host, path, and query string." },
    pattern: "https?:\\/\\/(?<host>[\\w.-]+)(?<path>\\/[^\\s?#]*)?(?:\\?(?<query>[^\\s#]*))?",
    flags: "gi",
    text: "Visit https://thecodecodex.com/pt/tools?cat=dev or http://localhost:4321/en.",
    replacement: "$<host>$<path>",
  },
]

export interface RegexMatchItem {
  index: number
  length: number
  match: string
  line: number
  column: number
  captures: (string | null)[]
  groups: Record<string, string>
}

export interface TextSegment {
  text: string
  matchIndex: number | null
}

export interface TokenExplanation {
  token: string
  description: string
}

export interface RegexEvaluation {
  ok: boolean
  error?: string
  pattern: string
  flags: string
  matches: RegexMatchItem[]
  segments: TextSegment[]
  replaced: string
  tokens: TokenExplanation[]
}

export function normalizeFlags(raw: string): string {
  const seen = new Set<RegexFlag>()
  for (const ch of raw) {
    if ((REGEX_FLAGS as readonly string[]).includes(ch)) {
      seen.add(ch as RegexFlag)
    }
  }
  return REGEX_FLAGS.filter((f) => seen.has(f)).join("")
}

function lineAndColumn(text: string, offset: number): { line: number, column: number } {
  let line = 1
  let lastNewline = -1
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      line++
      lastNewline = i
    }
  }
  return { line, column: offset - lastNewline }
}

const TOKEN_RULES: { regex: RegExp, pt: string, en: string }[] = [
  { regex: /\(\?<([a-zA-Z0-9_]+)>/g, pt: "Grupo de captura nomeado (?<nome>…)", en: "Named capture group (?<name>…)" },
  { regex: /\(\?:/g, pt: "Grupo sem captura (?:…)", en: "Non-capturing group (?:…)" },
  { regex: /\(\?=/g, pt: "Lookahead positivo (?=…)", en: "Positive lookahead (?=…)" },
  { regex: /\(\?!/g, pt: "Lookahead negativo (?!…)", en: "Negative lookahead (?!…)" },
  { regex: /\(\?<=/g, pt: "Lookbehind positivo (?<=…)", en: "Positive lookbehind (?<=…)" },
  { regex: /\(\?<!/g, pt: "Lookbehind negativo (?<!…)", en: "Negative lookbehind (?<!…)" },
  { regex: /\\d/g, pt: "Dígito numérico [0-9]", en: "Digit character [0-9]" },
  { regex: /\\D/g, pt: "Qualquer caractere não numérico [^0-9]", en: "Non-digit character [^0-9]" },
  { regex: /\\w/g, pt: "Caractere de palavra [A-Za-z0-9_]", en: "Word character [A-Za-z0-9_]" },
  { regex: /\\W/g, pt: "Caractere que não é de palavra", en: "Non-word character" },
  { regex: /\\s/g, pt: "Espaço em branco (espaço, tab, quebra de linha)", en: "Whitespace (space, tab, newline)" },
  { regex: /\\S/g, pt: "Caractere que não é espaço em branco", en: "Non-whitespace character" },
  { regex: /\\b/g, pt: "Fronteira de palavra (início ou fim de palavra)", en: "Word boundary" },
  { regex: /\^/g, pt: "Início da string (ou da linha com flag m)", en: "Start of string (or line with m flag)" },
  { regex: /\$/g, pt: "Fim da string (ou da linha com flag m)", en: "End of string (or line with m flag)" },
  { regex: /\{\d+(?:,\d*)?\}/g, pt: "Quantificador de repetição exata ou intervalo {n,m}", en: "Exact or range repetition quantifier {n,m}" },
  { regex: /\[\^[^\]]+\]/g, pt: "Classe de caracteres negada [^…]", en: "Negated character class [^…]" },
  { regex: /\[[^\^\]][^\]]*\]/g, pt: "Classe de caracteres […]", en: "Character class […]" },
  { regex: /\+/g, pt: "Quantificador: 1 ou mais vezes (+)", en: "Quantifier: 1 or more times (+)" },
  { regex: /\*/g, pt: "Quantificador: 0 ou mais vezes (*)", en: "Quantifier: 0 or more times (*)" },
  { regex: /\?/g, pt: "Opcional (0 ou 1 vez) ou quantificador preguiçoso", en: "Optional (0 or 1 time) or lazy quantifier" },
  { regex: /\|/g, pt: "Alternância lógica (OU)", en: "Alternation (OR)" },
]

export function explainPattern(pattern: string, lang: "pt" | "en" = "pt"): TokenExplanation[] {
  if (!pattern) return []
  const found: TokenExplanation[] = []
  const seen = new Set<string>()
  for (const rule of TOKEN_RULES) {
    const matches = pattern.match(rule.regex)
    if (matches) {
      for (const m of matches) {
        if (!seen.has(m)) {
          seen.add(m)
          found.push({ token: m, description: rule[lang] })
        }
      }
    }
  }
  return found
}

export function evaluateRegex(pattern: string, rawFlags: string, text: string, replacement = "", lang: "pt" | "en" = "pt"): RegexEvaluation {
  const flags = normalizeFlags(rawFlags)
  const tokens = explainPattern(pattern, lang)

  if (!pattern) {
    return {
      ok: true,
      pattern,
      flags,
      matches: [],
      segments: text ? [{ text, matchIndex: null }] : [],
      replaced: text,
      tokens,
    }
  }

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      pattern,
      flags,
      matches: [],
      segments: text ? [{ text, matchIndex: null }] : [],
      replaced: text,
      tokens,
    }
  }

  const matches: RegexMatchItem[] = []
  const MAX_MATCHES = 1000

  if (flags.includes("g")) {
    let execResult: RegExpExecArray | null
    while ((execResult = regex.exec(text)) !== null && matches.length < MAX_MATCHES) {
      const idx = execResult.index
      const val = execResult[0] ?? ""
      const pos = lineAndColumn(text, idx)
      const groups: Record<string, string> = {}
      if (execResult.groups) {
        for (const [k, v] of Object.entries(execResult.groups)) {
          if (v !== undefined) groups[k] = v
        }
      }
      matches.push({
        index: idx,
        length: val.length,
        match: val,
        line: pos.line,
        column: pos.column,
        captures: execResult.slice(1).map((c) => c ?? null),
        groups,
      })
      if (val.length === 0) {
        regex.lastIndex++
        if (regex.lastIndex > text.length) break
      }
    }
  } else {
    const execResult = regex.exec(text)
    if (execResult) {
      const idx = execResult.index
      const val = execResult[0] ?? ""
      const pos = lineAndColumn(text, idx)
      const groups: Record<string, string> = {}
      if (execResult.groups) {
        for (const [k, v] of Object.entries(execResult.groups)) {
          if (v !== undefined) groups[k] = v
        }
      }
      matches.push({
        index: idx,
        length: val.length,
        match: val,
        line: pos.line,
        column: pos.column,
        captures: execResult.slice(1).map((c) => c ?? null),
        groups,
      })
    }
  }

  const segments: TextSegment[] = []
  let cursor = 0
  matches.forEach((m, idx) => {
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index), matchIndex: null })
    }
    if (m.length > 0) {
      segments.push({ text: text.slice(m.index, m.index + m.length), matchIndex: idx })
      cursor = m.index + m.length
    }
  })
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matchIndex: null })
  }

  let replaced = text
  try {
    replaced = text.replace(new RegExp(pattern, flags), replacement)
  } catch {
    replaced = text
  }

  return {
    ok: true,
    pattern,
    flags,
    matches,
    segments,
    replaced,
    tokens,
  }
}

export interface CheatsheetCategory {
  id: string
  title: { pt: string, en: string }
  items: { syntax: string, pt: string, en: string }[]
}

export const REGEX_CHEATSHEET: CheatsheetCategory[] = [
  {
    id: "classes",
    title: { pt: "Classes de Caracteres", en: "Character Classes" },
    items: [
      { syntax: ".", pt: "Qualquer caractere exceto quebra de linha", en: "Any character except newline" },
      { syntax: "\\d / \\D", pt: "Dígito [0-9] / Não dígito [^0-9]", en: "Digit [0-9] / Non-digit [^0-9]" },
      { syntax: "\\w / \\W", pt: "Alfanumérico [A-Za-z0-9_] / Não palavra", en: "Word char [A-Za-z0-9_] / Non-word" },
      { syntax: "\\s / \\S", pt: "Espaço em branco / Não espaço", en: "Whitespace / Non-whitespace" },
      { syntax: "[abc] / [^abc]", pt: "Qualquer um da lista / Nenhum da lista", en: "Any of a, b, c / Not a, b, c" },
      { syntax: "[a-z0-9]", pt: "Intervalo de caracteres", en: "Character range" },
    ],
  },
  {
    id: "quantifiers",
    title: { pt: "Quantificadores", en: "Quantifiers" },
    items: [
      { syntax: "*", pt: "0 ou mais repetições (guloso)", en: "0 or more repetitions (greedy)" },
      { syntax: "+", pt: "1 ou mais repetições", en: "1 or more repetitions" },
      { syntax: "?", pt: "0 ou 1 repetição (opcional)", en: "0 or 1 repetition (optional)" },
      { syntax: "{n} / {n,m}", pt: "Exatamente n / Entre n e m vezes", en: "Exactly n / Between n and m times" },
      { syntax: "*? / +?", pt: "Quantificador preguiçoso (menor match)", en: "Lazy quantifier (shortest match)" },
    ],
  },
  {
    id: "anchors",
    title: { pt: "Âncoras e Fronteiras", en: "Anchors & Boundaries" },
    items: [
      { syntax: "^", pt: "Início do texto (ou da linha com flag m)", en: "Start of input (or line with m)" },
      { syntax: "$", pt: "Fim do texto (ou da linha com flag m)", en: "End of input (or line with m)" },
      { syntax: "\\b / \\B", pt: "Fronteira de palavra / Fora de fronteira", en: "Word boundary / Non-word boundary" },
    ],
  },
  {
    id: "groups",
    title: { pt: "Grupos, Lookaround e Substituição", en: "Groups, Lookaround & Replacement" },
    items: [
      { syntax: "(abc)", pt: "Grupo de captura numerado ($1, $2…)", en: "Numbered capture group ($1, $2…)" },
      { syntax: "(?<name>abc)", pt: "Grupo nomeado (use $<name> no replace)", en: "Named capture group ($<name> in replace)" },
      { syntax: "(?:abc)", pt: "Grupo de agrupamento sem captura", en: "Non-capturing group" },
      { syntax: "a(?=b) / a(?!b)", pt: "Lookahead: 'a' seguido / não seguido de 'b'", en: "Lookahead: 'a' followed / not followed by 'b'" },
      { syntax: "(?<=a)b / (?<!a)b", pt: "Lookbehind: 'b' precedido / não precedido de 'a'", en: "Lookbehind: 'b' preceded / not preceded by 'a'" },
      { syntax: "$& / $1 / $<name>", pt: "No replace: match inteiro / grupo 1 / grupo nomeado", en: "In replace: full match / group 1 / named group" },
    ],
  },
]
