import { describe, expect, it } from "vitest"
import { DEFAULT_OPTIONS, generateComparison } from "./compensation-comparator"

describe("generateComparison", () => {
  const [clt, pj, coop] = generateComparison(DEFAULT_OPTIONS)

  it("returns the three models with the same annual target", () => {
    for (const result of [clt, pj, coop]) {
      expect(result?.annualLiquidity).toBe(DEFAULT_OPTIONS.targetLiquidity)
      expect(result?.monthlyAverageReal).toBeCloseTo(DEFAULT_OPTIONS.targetLiquidity / 12)
    }
  })

  it("grosses up PJ revenue by the tax rate", () => {
    expect(pj?.monthlyGrossOrRevenue).toBeCloseTo(DEFAULT_OPTIONS.targetLiquidity / 12 / (1 - DEFAULT_OPTIONS.pjTaxRate))
  })

  it("takes vacation days and pro-labore into account for cooperatives", () => {
    const [, , moreVacation] = generateComparison({ ...DEFAULT_OPTIONS, businessVacationDays: 20 })
    const [, , higherProLabore] = generateComparison({ ...DEFAULT_OPTIONS, proLaboreValue: 5000 })
    expect(moreVacation?.monthlyGrossOrRevenue).toBeLessThan(coop?.monthlyGrossOrRevenue ?? 0)
    expect(higherProLabore?.monthlyTaxesAndFees).toBeGreaterThan(coop?.monthlyTaxesAndFees ?? 0)
  })
})
