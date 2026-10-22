// Planejador de férias CLT: feriados nacionais, regra de início (CLT art. 134, §3º) e fracionamento (art. 134, §1º).
// Datas são tratadas como dias do calendário em UTC ("YYYY-MM-DD") para não sofrer com fuso/horário de verão.

import { stateHolidaysFor, type Uf } from "./state-holidays"

export type Iso = string

const DAY = 86_400_000
export const toIso = (date: Date): Iso => date.toISOString().slice(0, 10)
export const fromIso = (iso: Iso): Date => new Date(`${iso}T00:00:00Z`)
export const addDays = (iso: Iso, days: number): Iso => toIso(new Date(fromIso(iso).getTime() + days * DAY))
const weekday = (iso: Iso) => fromIso(iso).getUTCDay() // 0 = domingo

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)
export function easter(year: number): Iso {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export type HolidayKind = "national" | "optional" | "state" | "custom"

export interface Holiday {
  date: Iso
  name: string
  kind: HolidayKind
  // feriados estaduais: lei e fonte
  law?: string
  source?: string
}

// Feriados nacionais (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023) e pontos facultativos usuais
export function nationalHolidays(year: number): Holiday[] {
  const e = easter(year)
  const fixed: [string, string][] = [
    ["01-01", "Confraternização Universal"],
    ["04-21", "Tiradentes"],
    ["05-01", "Dia do Trabalho"],
    ["09-07", "Independência"],
    ["10-12", "Nossa Senhora Aparecida"],
    ["11-02", "Finados"],
    ["11-15", "Proclamação da República"],
    ["11-20", "Consciência Negra"],
    ["12-25", "Natal"],
  ]
  return [
    ...fixed.map(([md, name]) => ({ date: `${year}-${md}`, name, kind: "national" as const })),
    { date: addDays(e, -2), name: "Sexta-feira Santa", kind: "national" as const },
    { date: addDays(e, -48), name: "Carnaval (segunda)", kind: "optional" as const },
    { date: addDays(e, -47), name: "Carnaval (terça)", kind: "optional" as const },
    { date: addDays(e, 60), name: "Corpus Christi", kind: "optional" as const },
  ].sort((a, b) => a.date.localeCompare(b.date))
}

// 5x2: folga sábado e domingo (repouso semanal no domingo). 6x1: folga só no domingo.
export type Schedule = "5x2" | "6x1"

export interface PlannerInput {
  year: number
  days: number
  schedule: Schedule
  // pontos facultativos (Carnaval, Corpus Christi) contam como folga?
  includeOptional: boolean
  // feriados locais ou folgas já combinadas
  extraDaysOff: Iso[]
  // estado para incluir os feriados estaduais
  uf?: Uf | undefined
}

export interface Suggestion {
  start: Iso
  end: Iso
  // descanso contínuo, incluindo fins de semana e feriados colados
  restStart: Iso
  restEnd: Iso
  restDays: number
  holidays: Holiday[]
}

export function holidaysFor(input: Pick<PlannerInput, "year" | "includeOptional" | "extraDaysOff" | "uf">): Holiday[] {
  const base = [...nationalHolidays(input.year), ...nationalHolidays(input.year + 1).filter((h) => h.date.endsWith("-01-01"))]
  const state = input.uf ? stateHolidaysFor(input.uf, input.year).map((h) => ({ ...h, kind: "state" as const })) : []
  return [
    ...base.filter((h) => input.includeOptional || h.kind !== "optional"),
    ...state,
    ...input.extraDaysOff.map((date) => ({ date, name: "Folga local", kind: "custom" as const })),
  ]
}

export function makeDayOff(input: Pick<PlannerInput, "schedule">, holidays: Holiday[]) {
  const set = new Set(holidays.map((h) => h.date))
  const isWeeklyRest = (iso: Iso) => (input.schedule === "5x2" ? [0, 6].includes(weekday(iso)) : weekday(iso) === 0)
  // repouso semanal REMUNERADO é o domingo nas duas escalas (no 5x2 o sábado é folga compensada, não DSR)
  const isPaidRestOrHoliday = (iso: Iso) => weekday(iso) === 0 || set.has(iso)
  return { isOff: (iso: Iso) => isWeeklyRest(iso) || set.has(iso), isWeeklyRest, isPaidRestOrHoliday, isHoliday: (iso: Iso) => set.has(iso) }
}

// CLT art. 134, §3º: as férias não podem começar nos 2 dias que antecedem feriado ou repouso semanal remunerado;
// também não faz sentido começar num dia que já é folga
export function canStart(iso: Iso, isOff: (iso: Iso) => boolean, isPaidRestOrHoliday: (iso: Iso) => boolean): boolean {
  return !isOff(iso) && !isPaidRestOrHoliday(addDays(iso, 1)) && !isPaidRestOrHoliday(addDays(iso, 2))
}

export function suggest(input: PlannerInput, limit = 5, exclude: { start: Iso, end: Iso }[] = []): Suggestion[] {
  const holidays = holidaysFor(input)
  const { isOff, isHoliday, isPaidRestOrHoliday } = makeDayOff(input, holidays)
  const days = Math.min(30, Math.max(1, Math.round(input.days)))
  const results: Suggestion[] = []
  for (let start = `${input.year}-01-01`; start <= `${input.year}-12-31`; start = addDays(start, 1)) {
    if (!canStart(start, isOff, isPaidRestOrHoliday)) continue
    const end = addDays(start, days - 1)
    // não pode sobrepor períodos já escolhidos (com 1 dia de folga entre eles)
    if (exclude.some((p) => !(end < addDays(p.start, -1) || start > addDays(p.end, 1)))) continue
    let restStart = start
    while (isOff(addDays(restStart, -1))) restStart = addDays(restStart, -1)
    let restEnd = end
    while (isOff(addDays(restEnd, 1))) restEnd = addDays(restEnd, 1)
    const restDays = Math.round((fromIso(restEnd).getTime() - fromIso(restStart).getTime()) / DAY) + 1
    const inside = holidays.filter((h) => h.date >= restStart && h.date <= restEnd && isHoliday(h.date))
    results.push({ start, end, restStart, restEnd, restDays, holidays: inside })
  }
  // mais descanso primeiro; empate: mais feriados aproveitados, depois a data mais cedo
  results.sort((a, b) => b.restDays - a.restDays || b.holidays.length - a.holidays.length || a.start.localeCompare(b.start))
  // evita sugestões quase iguais (mesmo bloco de descanso)
  const picked: Suggestion[] = []
  for (const s of results) {
    if (picked.some((p) => !(s.restEnd < p.restStart || s.restStart > p.restEnd))) continue
    picked.push(s)
    if (picked.length === limit) break
  }
  return picked
}

// Fracionamento (CLT art. 134, §1º): até 3 períodos, um com 14+ dias e os demais com 5+ dias
export function isValidSplit(parts: number[]): boolean {
  if (parts.length < 1 || parts.length > 3) return false
  if (parts.some((p) => p < 5)) return false
  return parts.length === 1 || parts.some((p) => p >= 14)
}

export const SPLITS: number[][] = [[30], [15, 15], [20, 10], [14, 8, 8], [14, 11, 5], [20, 5, 5], [14, 6, 10]].filter(isValidSplit)

export interface SplitPlan {
  parts: Suggestion[]
  restDays: number
}

// Escolhe o melhor período para cada parte, da maior para a menor, sem sobreposição
export function planSplit(input: Omit<PlannerInput, "days">, parts: number[]): SplitPlan | undefined {
  if (!isValidSplit(parts)) return undefined
  const chosen: Suggestion[] = []
  for (const days of [...parts].sort((a, b) => b - a)) {
    const best = suggest({ ...input, days }, 1, chosen)[0]
    if (!best) return undefined
    chosen.push(best)
  }
  chosen.sort((a, b) => a.start.localeCompare(b.start))
  return { parts: chosen, restDays: chosen.reduce((sum, s) => sum + s.restDays, 0) }
}
