import { describe, expect, it } from "vitest"
import { cltMonth, cltYear, grossForAnnualTotal, inss, irrf, irrfReduction, irrfTable, payrollTaxes } from "./clt"

describe("INSS 2026", () => {
  it("is progressive and capped at R$ 988,09", () => {
    expect(inss(1000)).toBe(75)
    expect(inss(1621)).toBe(121.58)
    expect(inss(8475.55)).toBe(988.09)
    expect(inss(30_000)).toBe(988.09)
  })
})

describe("IRRF 2026 progressive table (Receita Federal)", () => {
  it("applies each bracket with its deduction", () => {
    expect(irrfTable(2428.8)).toBe(0)
    expect(irrfTable(3392.8)).toBe(114.76)
    expect(irrfTable(4392.8)).toBe(312.89)
    expect(irrfTable(7000)).toBe(1016.27)
  })
})

describe("IRRF 2026 reduction (Lei 15.270/2025)", () => {
  it("zeroes the tax up to R$ 5.000 of taxable income", () => {
    expect(irrfReduction(5000, 312.89)).toBe(312.89)
    expect(irrfReduction(4000, 114.76)).toBe(114.76)
  })

  it("phases out linearly between R$ 5.000,01 and R$ 7.350", () => {
    // 978,62 − 0,133145 × 5.096,02 = 300,11 (exemplo citado pela Banesprev)
    expect(irrfReduction(5096.02, 1000)).toBe(300.11)
    expect(irrfReduction(6000, 1000)).toBe(179.75)
    expect(irrfReduction(7350, 1000)).toBe(0)
    expect(irrfReduction(7350.01, 1000)).toBe(0)
  })
})

describe("IRRF 2026 monthly (examples from B3 Bora Investir, IR part)", () => {
  it("R$ 5.000 with the simplified discount pays no tax", () => {
    // base 5.000 − 607,20 = 4.392,80 → 312,89 pela tabela → redução 312,89
    expect(irrf({ taxableIncome: 5000, socialSecurity: 0 })).toMatchObject({ base: 4392.8, deduction: "simplified", taxBeforeReduction: 312.89, reduction: 312.89, tax: 0 })
  })

  it("uses gross salary for the reduction, not the base (salário R$ 7.607,20)", () => {
    // base 7.000 → 1.016,27; salário acima de 7.350 → sem redução
    expect(irrf({ taxableIncome: 7607.2, socialSecurity: 0 })).toMatchObject({ base: 7000, taxBeforeReduction: 1016.27, reduction: 0, tax: 1016.27 })
  })

  it("prefers legal deductions when they are larger (R$ 6.000, INSS R$ 649,60)", () => {
    // base 5.350,40 → 562,63; redução 978,62 − 0,133145 × 6.000 = 179,75 → 382,88
    expect(irrf({ taxableIncome: 6000, socialSecurity: 649.6 })).toMatchObject({ base: 5350.4, deduction: "legal", taxBeforeReduction: 562.63, reduction: 179.75, tax: 382.88 })
  })

  it("subtracts R$ 189,59 per dependent", () => {
    const none = irrf({ taxableIncome: 10_000, socialSecurity: 988.09 })
    const two = irrf({ taxableIncome: 10_000, socialSecurity: 988.09, dependents: 2 })
    expect(none.base - two.base).toBeCloseTo(379.18, 2)
  })
})

describe("payrollTaxes", () => {
  it("combines INSS and IRRF from the gross salary", () => {
    const result = payrollTaxes(8000)
    // 121,58 + 115,37 + 174,17 + 510,40
    expect(result.inss).toBe(921.51)
    // base 7.078,49 × 27,5% − 908,73 = 1.037,85; acima de 7.350 → sem redução
    expect(result.irrf).toBe(1037.85)
  })
})

describe("cltMonth", () => {
  it("discounts at most 6% of the salary for the transport voucher", () => {
    expect(cltMonth(5000, { transportVoucher: 500 }).transportDiscount).toBe(300)
    expect(cltMonth(5000, { transportVoucher: 200 }).transportDiscount).toBe(200)
  })

  it("alimony reduces the IR base and the net salary", () => {
    const plain = cltMonth(10_000)
    const withAlimony = cltMonth(10_000, { alimony: 1000 })
    expect(withAlimony.irrf.base).toBeCloseTo(plain.irrf.base - 1000, 2)
    expect(withAlimony.net).toBeCloseTo(plain.net - 1000 + (plain.irrf.tax - withAlimony.irrf.tax), 2)
  })

  it("R$ 5.000 has no income tax", () => {
    const month = cltMonth(5000)
    expect(month.irrf.tax).toBe(0)
    expect(month.net).toBe(round(5000 - month.inss))
  })
})

describe("cltYear", () => {
  it("adds 13th, vacation bonus, FGTS, benefits and bonus", () => {
    const year = cltYear(8000, { monthlyBenefits: 1000, annualBonus: 5000 })
    expect(year.fgtsYear).toBeCloseTo(8000 * 0.08 * (13 + 1 / 3), 1)
    expect(year.benefitsYear).toBe(12_000)
    expect(year.vacationBonusNet).toBeGreaterThan(0)
    expect(year.vacationBonusNet).toBeLessThan(8000 / 3)
    expect(year.annualTotal).toBeCloseTo(year.month.net * 12 + year.net13th + year.vacationBonusNet + year.fgtsYear + 12_000 + 5000, 1)
  })

  it("FGTS is optional", () => {
    expect(cltYear(8000, { includeFgts: false }).fgtsYear).toBe(0)
  })

  it("finds the gross salary that reaches an annual total", () => {
    const gross = grossForAnnualTotal(100_000)
    expect(cltYear(gross).annualTotal).toBeGreaterThanOrEqual(100_000)
    expect(cltYear(gross - 1).annualTotal).toBeLessThan(100_000)
  })

  it("round-trips an exact salary without an extra cent", () => {
    expect(grossForAnnualTotal(cltYear(12_000).annualTotal)).toBe(12_000)
  })
})

const round = (value: number) => Math.round(value * 100) / 100
