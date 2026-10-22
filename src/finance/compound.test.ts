import { describe, expect, it } from "vitest"
import { monthlyRate, regressiveRate, simulate } from "./compound"

describe("compound interest", () => {
  it("converts effective annual rates to monthly", () => {
    expect(Math.pow(1 + monthlyRate(0.12), 12) - 1).toBeCloseTo(0.12, 10)
  })

  it("matches the annuity closed form", () => {
    const i = monthlyRate(0.1)
    const expected = 1000 * ((Math.pow(1 + i, 120) - 1) / i) + 5000 * Math.pow(1 + i, 120)
    const result = simulate({ initial: 5000, monthly: 1000, months: 120, annualRate: 0.1 })
    expect(result.grossBalance).toBeCloseTo(expected, 6)
    expect(result.contributed).toBe(125_000)
    expect(result.interest).toBeCloseTo(expected - 125_000, 6)
    expect(result.rows).toHaveLength(10)
    expect(result.rows.at(-1)?.balance).toBeCloseTo(expected, 6)
  })

  it("an initial deposit alone grows by the annual rate each year", () => {
    expect(simulate({ initial: 1000, monthly: 0, months: 24, annualRate: 0.1 }).grossBalance).toBeCloseTo(1210, 8)
  })

  it("uses the regressive income tax table by holding period", () => {
    expect([3, 6, 7, 12, 13, 24, 25].map(regressiveRate)).toEqual([0.225, 0.225, 0.2, 0.2, 0.175, 0.175, 0.15])
    // depósito único por 3 anos: ganho inteiro a 15%
    const single = simulate({ initial: 10_000, monthly: 0, months: 36, annualRate: 0.1, taxed: true })
    expect(single.incomeTax).toBeCloseTo((single.grossBalance - 10_000) * 0.15, 8)
  })

  it("recent contributions pay higher tax rates than old ones", () => {
    const result = simulate({ initial: 0, monthly: 1000, months: 36, annualRate: 0.1, taxed: true })
    const effective = result.incomeTax / result.interest
    expect(effective).toBeGreaterThan(0.15)
    expect(effective).toBeLessThan(0.225)
  })

  it("deflates by inflation and applies the 4% rule", () => {
    const result = simulate({ initial: 100_000, monthly: 0, months: 12, annualRate: 0.1, annualInflation: 0.1 })
    expect(result.realBalance).toBeCloseTo(100_000, 6)
    expect(result.monthlyIncome4).toBeCloseTo(100_000 * 0.04 / 12, 6)
  })
})
