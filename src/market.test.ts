import { describe, expect, it } from "vitest"
import { cdiAnnual, fxRate, market, savingsAnnual } from "./market"

describe("market data", () => {
  it("has every series with a value and an ISO date", () => {
    for (const value of Object.values(market)) {
      expect(Number.isFinite(value.value)).toBe(true)
      expect(value.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("converts rates to fractions", () => {
    expect(cdiAnnual()).toBeCloseTo(market.cdi.value / 100, 10)
    expect(savingsAnnual()).toBeCloseTo(Math.pow(1 + market.savingsMonthly.value / 100, 12) - 1, 10)
    expect(fxRate("USD")).toBe(market.usd.value)
  })
})
