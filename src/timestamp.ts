// Detecta se o número está em segundos, milissegundos, micro ou nanossegundos pela magnitude
export type Unit = "s" | "ms" | "us" | "ns"

export function detectUnit(value: number): Unit {
  const abs = Math.abs(value)
  if (abs < 1e11) return "s"
  if (abs < 1e14) return "ms"
  if (abs < 1e17) return "us"
  return "ns"
}

const TO_MS: Record<Unit, number> = { s: 1000, ms: 1, us: 1e-3, ns: 1e-6 }

export function parseTimestamp(raw: string): { date: Date, unit: Unit } | undefined {
  const trimmed = raw.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return undefined
  const value = Number(trimmed)
  const unit = detectUnit(value)
  const date = new Date(value * TO_MS[unit])
  return Number.isNaN(date.getTime()) ? undefined : { date, unit }
}

export function toUnix(date: Date): { seconds: number, milliseconds: number } {
  return { seconds: Math.floor(date.getTime() / 1000), milliseconds: date.getTime() }
}

// "há 3 dias" / "in 2 hours" via Intl, escolhendo a maior unidade inteira
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
]

export function relative(date: Date, locale: string, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime()
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === "second") return formatter.format(Math.round(diff / ms), unit)
  }
  return ""
}

// Valor para <input type="datetime-local"> no fuso local
export function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 19)
}
