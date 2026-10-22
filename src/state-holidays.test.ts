import { describe, expect, it } from "vitest"
import { STATE_HOLIDAYS, stateHolidaysFor, UFS } from "./state-holidays"
import { easter, suggest } from "./vacation"

describe("state holidays", () => {
  it("every entry cites a law and an https source", () => {
    for (const h of STATE_HOLIDAYS) {
      expect(h.law.length, h.name).toBeGreaterThan(3)
      expect(h.source, h.name).toMatch(/^https:\/\//)
      expect(UFS).toContain(h.uf)
    }
  })

  it("computes movable state holidays", () => {
    const date = (uf: (typeof UFS)[number], name: string, year = 2026) => stateHolidaysFor(uf, year).find((h) => h.name.startsWith(name))?.date
    // ES: segunda-feira 8 dias após a Páscoa (05/04/2026)
    expect(date("ES", "Nossa Senhora da Penha")).toBe("2026-04-13")
    expect(easter(2026)).toBe("2026-04-05")
    // SC: 11/08/2026 é terça → domingo 16/08; em 2024 o 11/08 já era domingo
    expect(date("SC", "Data Magna")).toBe("2026-08-16")
    expect(date("SC", "Data Magna", 2024)).toBe("2024-08-11")
    // RJ: terça de Carnaval
    expect(date("RJ", "Carnaval")).toBe("2026-02-17")
    // AC: transferência publicada para 2026
    expect(date("AC", "Dia do Católico")).toBe("2026-01-22")
    expect(date("AC", "Dia do Católico", 2027)).toBe("2027-01-20")
  })

  it("the planner uses the chosen state's holidays", () => {
    const base = { year: 2026, days: 5, schedule: "5x2" as const, includeOptional: false, extraDaysOff: [] }
    const sp = suggest({ ...base, uf: "SP" }, 20)
    expect(sp.some((s) => s.holidays.some((h) => h.name.startsWith("Revolução Constitucionalista")))).toBe(true)
    const none = suggest(base, 20)
    expect(none.some((s) => s.holidays.some((h) => h.name.startsWith("Revolução Constitucionalista")))).toBe(false)
  })
})
