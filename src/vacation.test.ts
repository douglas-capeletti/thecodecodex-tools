import { describe, expect, it } from "vitest"
import { addDays, canStart, easter, isValidSplit, makeDayOff, nationalHolidays, planSplit, suggest } from "./vacation"

describe("holidays", () => {
  it("computes Easter", () => {
    expect(easter(2024)).toBe("2024-03-31")
    expect(easter(2025)).toBe("2025-04-20")
    expect(easter(2026)).toBe("2026-04-05")
    expect(easter(2027)).toBe("2027-03-28")
  })

  it("derives movable holidays from Easter (2026)", () => {
    const byName = Object.fromEntries(nationalHolidays(2026).map((h) => [h.name, h.date]))
    expect(byName["Sexta-feira Santa"]).toBe("2026-04-03")
    expect(byName["Carnaval (terça)"]).toBe("2026-02-17")
    expect(byName["Corpus Christi"]).toBe("2026-06-04")
    expect(byName["Consciência Negra"]).toBe("2026-11-20")
  })
})

describe("CLT start rule", () => {
  const { isOff, isPaidRestOrHoliday } = makeDayOff({ schedule: "5x2" }, nationalHolidays(2026))
  const can = (iso: string) => canStart(iso, isOff, isPaidRestOrHoliday)

  it("cannot start in the two days before the paid weekly rest (Sunday)", () => {
    // 2026-03-09 é segunda; quinta (12) ok (sábado não é DSR); sexta (13) não; sábado (14) é folga
    expect(can("2026-03-09")).toBe(true)
    expect(can("2026-03-12")).toBe(true)
    expect(can("2026-03-13")).toBe(false)
    expect(can("2026-03-14")).toBe(false)
  })

  it("cannot start in the two days before a holiday", () => {
    // Tiradentes 2026 é terça (21/04): segunda (20) inválida; quarta (22) ok
    expect(can("2026-04-20")).toBe(false)
    expect(can("2026-04-22")).toBe(true)
  })
})

describe("suggestions", () => {
  const input = { year: 2026, days: 10, schedule: "5x2" as const, includeOptional: false, extraDaysOff: [] }

  it("returns valid, non-overlapping suggestions sorted by rest", () => {
    const list = suggest(input)
    expect(list.length).toBe(5)
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.restDays).toBeGreaterThanOrEqual(list[i]!.restDays)
    for (const s of list) {
      expect(addDays(s.start, 9)).toBe(s.end)
      expect(s.restDays).toBeGreaterThanOrEqual(10)
    }
  })

  it("bridges weekends and holidays beyond the 10 requested days", () => {
    // sem feriado, segunda→quarta dá 2 + 10 = 12; com feriado colado dá mais
    const best = suggest(input)[0]!
    expect(best.restDays).toBeGreaterThan(12)
    expect(best.holidays.length).toBeGreaterThan(0)
  })

  it("extra local days off extend the rest", () => {
    const base = suggest(input)[0]!
    const extended = suggest({ ...input, extraDaysOff: [addDays(base.restEnd, 1)] })[0]!
    expect(extended.restDays).toBeGreaterThan(base.restDays)
  })
})

describe("split", () => {
  it("follows CLT: up to 3 parts, one with 14+, others with 5+", () => {
    expect(isValidSplit([30])).toBe(true)
    expect(isValidSplit([14, 8, 8])).toBe(true)
    expect(isValidSplit([10, 10, 10])).toBe(false)
    expect(isValidSplit([20, 6, 2, 2])).toBe(false)
    expect(isValidSplit([25, 4])).toBe(false)
  })

  it("plans non-overlapping periods", () => {
    const plan = planSplit({ year: 2026, schedule: "5x2", includeOptional: false, extraDaysOff: [] }, [14, 8, 8])
    expect(plan?.parts).toHaveLength(3)
    const [a, b, c] = plan!.parts
    expect(a!.end < b!.start && b!.end < c!.start).toBe(true)
  })
})
