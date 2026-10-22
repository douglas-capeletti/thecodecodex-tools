import { describe, expect, it } from "vitest"
import { bestRegime, compareRegimes, proLaboreInss, simplesEffectiveRate, SIMPLES_ANEXO_III, SIMPLES_ANEXO_V } from "./pj"

const input = (monthlyRevenue: number) => ({ monthlyRevenue, proLabore: 0, issRate: 0.02, accountant: 0, otherExpenses: 0 })
const find = (revenue: number, regime: string) => compareRegimes(input(revenue)).find((r) => r.regime === regime)

describe("Simples Nacional effective rate", () => {
  it("first bracket is the nominal rate", () => {
    expect(simplesEffectiveRate(120_000, SIMPLES_ANEXO_III)).toBeCloseTo(0.06, 10)
    expect(simplesEffectiveRate(120_000, SIMPLES_ANEXO_V)).toBeCloseTo(0.155, 10)
  })

  it("applies (RBT12 × nominal − deduction) ÷ RBT12", () => {
    // 240 mil no Anexo III: (240.000 × 11,2% − 9.360) ÷ 240.000 = 7,3%
    expect(simplesEffectiveRate(240_000, SIMPLES_ANEXO_III)).toBeCloseTo(0.073, 10)
    // 480 mil no Anexo V: (480.000 × 19,5% − 9.900) ÷ 480.000 = 17,4375%
    expect(simplesEffectiveRate(480_000, SIMPLES_ANEXO_V)).toBeCloseTo(0.174375, 10)
  })

  // da 1ª à 5ª faixa a alíquota efetiva é contínua; na 6ª (acima de R$ 3,6 mi) o ISS sai do DAS e ela cai de propósito
  it("brackets 1–5 are continuous at the boundaries", () => {
    for (const table of [SIMPLES_ANEXO_III, SIMPLES_ANEXO_V]) {
      for (const { upTo } of table.slice(0, -2)) expect(simplesEffectiveRate(upTo + 0.01, table)).toBeCloseTo(simplesEffectiveRate(upTo, table), 4)
    }
  })
})

describe("regime comparison", () => {
  it("Fator R counts the CPP inside the DAS as payroll (LC 123, art. 18, §24)", () => {
    // 20 mil: DAS 1.460 × 43,4% = 633,64 de CPP → pró-labore = 5.600 − 633,64
    expect(find(20_000, "simples-iii")?.proLabore).toBeCloseTo(4966.36, 2)
    expect(find(20_000, "simples-v")?.proLabore).toBe(1621)
  })

  it("pro-labore INSS is 11% capped at the ceiling", () => {
    expect(proLaboreInss(5000)).toBeCloseTo(550, 10)
    expect(proLaboreInss(20_000)).toBeCloseTo(8475.55 * 0.11, 10)
  })

  it("matches nagringa.dev's published results (R$ 10k, 20k, 40k)", () => {
    expect(bestRegime(compareRegimes(input(10_000)))?.totalTaxes).toBeCloseTo(879, 0)
    expect(bestRegime(compareRegimes(input(20_000)))?.totalTaxes).toBeCloseTo(2006, 0)
    expect(bestRegime(compareRegimes(input(40_000)))?.totalTaxes).toBeCloseTo(5835, 0)
  })

  it("R$ 10 mil: Anexo III via Fator R beats Anexo V", () => {
    const iii = find(10_000, "simples-iii")
    const v = find(10_000, "simples-v")
    expect(iii?.net).toBeGreaterThan(v?.net ?? Infinity)
    expect(bestRegime(compareRegimes(input(10_000)))?.regime).toBe("simples-iii")
  })

  it("MEI only below R$ 81 mil per year", () => {
    expect(find(6000, "mei")?.allowed).toBe(true)
    expect(find(7000, "mei")?.allowed).toBe(false)
  })

  it("Lucro Presumido adds the 10% IRPJ surcharge above R$ 20 mil of presumed profit", () => {
    const low = find(50_000, "presumido")
    const high = find(100_000, "presumido")
    // presunção 32%: 100 mil → 32 mil, 12 mil acima do limite → +1.200 de adicional
    const withoutSurcharge = (r: number) => r * 0.32 * (0.15 + 0.09) + r * (0.0065 + 0.03 + 0.02) + 1621 * 0.2
    expect(low?.companyTaxes).toBeCloseTo(withoutSurcharge(50_000), 2)
    expect(high?.companyTaxes).toBeCloseTo(withoutSurcharge(100_000) + 1200, 2)
  })

  it("taxes dividends above R$ 50 mil per month at 10% of the whole amount", () => {
    expect(find(200_000, "presumido")?.dividendsTax).toBeGreaterThan(0)
    expect(find(20_000, "presumido")?.dividendsTax).toBe(0)
  })
})
