import { INSS_2026, irrf } from "./clt"

// Tributação de PJ de serviços (2026). Fontes: LC 123/2006 (Anexos III e V do Simples), Res. CGSN 140/2018,
// Lei 15.270/2025 (dividendos), DAS-MEI com salário mínimo de R$ 1.621.

export const MINIMUM_WAGE_2026 = 1621
export const MEI = { annualLimit: 81_000, monthlyDas: 86.05 } // 5% do salário mínimo + R$ 5 de ISS
// Faixas por receita bruta dos últimos 12 meses (RBT12): alíquota nominal e parcela a deduzir
// cppShare: parte do DAS que é contribuição previdenciária patronal (repartição do Anexo III)
export const SIMPLES_ANEXO_III = [
  { upTo: 180_000, rate: 0.06, deduction: 0, cppShare: 0.434 },
  { upTo: 360_000, rate: 0.112, deduction: 9_360, cppShare: 0.434 },
  { upTo: 720_000, rate: 0.135, deduction: 17_640, cppShare: 0.434 },
  { upTo: 1_800_000, rate: 0.16, deduction: 35_640, cppShare: 0.434 },
  { upTo: 3_600_000, rate: 0.21, deduction: 125_640, cppShare: 0.434 },
  { upTo: 4_800_000, rate: 0.33, deduction: 648_000, cppShare: 0.305 },
]
export const SIMPLES_ANEXO_V = [
  { upTo: 180_000, rate: 0.155, deduction: 0 },
  { upTo: 360_000, rate: 0.18, deduction: 4_500 },
  { upTo: 720_000, rate: 0.195, deduction: 9_900 },
  { upTo: 1_800_000, rate: 0.205, deduction: 17_100 },
  { upTo: 3_600_000, rate: 0.23, deduction: 62_100 },
  { upTo: 4_800_000, rate: 0.305, deduction: 540_000 },
]
export const SIMPLES_LIMIT = 4_800_000
// Fator R: folha de 12 meses ÷ RBT12 ≥ 28% leva atividades do Anexo V para o Anexo III.
// A folha inclui o pró-labore E a CPP efetivamente recolhida (LC 123, art. 18, §24) — no Simples, a CPP vem dentro do DAS.
export const FATOR_R = 0.28
// Lucro Presumido, serviços: presunção de 32% para IRPJ e CSLL
export const PRESUMIDO = { presumption: 0.32, irpj: 0.15, irpjSurcharge: 0.1, surchargeMonthlyThreshold: 20_000, csll: 0.09, pis: 0.0065, cofins: 0.03, cpp: 0.2 }
// Sócio: INSS de 11% sobre o pró-labore, limitado ao teto
export const PRO_LABORE_INSS_RATE = 0.11
// Dividendos (Lei 15.270/2025): acima de R$ 50 mil/mês da mesma empresa para a mesma pessoa, 10% sobre o total
export const DIVIDENDS = { monthlyExemption: 50_000, rate: 0.1 }

type Bracket = { upTo: number, rate: number, deduction: number }

export function simplesEffectiveRate(rbt12: number, table: Bracket[]): number {
  if (rbt12 <= 0) return table[0]?.rate ?? 0
  const bracket = table.find((b) => rbt12 <= b.upTo) ?? table[table.length - 1]
  return bracket ? (rbt12 * bracket.rate - bracket.deduction) / rbt12 : 0
}

export function simplesCppShare(rbt12: number): number {
  return (SIMPLES_ANEXO_III.find((b) => rbt12 <= b.upTo) ?? SIMPLES_ANEXO_III[SIMPLES_ANEXO_III.length - 1])?.cppShare ?? 0
}

// Cooperado de cooperativa de trabalho: contribuinte individual, 20% retidos pela cooperativa até o teto
// (a alíquota de 11% acabou com o RE 595.838/STF, que derrubou a contribuição de 15% do tomador)
export const COOPERATIVE_INSS_RATE = 0.2
export function cooperativeInss(remuneration: number): number {
  const ceiling = INSS_2026[INSS_2026.length - 1]?.upTo ?? Infinity
  return Math.min(remuneration, ceiling) * COOPERATIVE_INSS_RATE
}

export function proLaboreInss(proLabore: number): number {
  const ceiling = INSS_2026[INSS_2026.length - 1]?.upTo ?? Infinity
  return Math.min(proLabore, ceiling) * PRO_LABORE_INSS_RATE
}

export type Regime = "mei" | "simples-iii" | "simples-v" | "presumido"

export interface PjInput {
  monthlyRevenue: number
  // pró-labore mensal; no Anexo III ele é ajustado para atingir o Fator R
  proLabore: number
  // ISS do município (Lucro Presumido)
  issRate: number
  accountant: number
  otherExpenses: number
}

export interface RegimeResult {
  regime: Regime
  allowed: boolean
  // tributos da empresa (DAS ou IRPJ+CSLL+PIS+COFINS+ISS+CPP)
  companyTaxes: number
  proLabore: number
  proLaboreInss: number
  proLaboreIrrf: number
  dividendsTax: number
  totalTaxes: number
  effectiveRate: number
  // o que sobra para o sócio no mês: faturamento − tributos − contador − despesas
  net: number
  // Simples: alíquota efetiva do DAS
  simplesRate?: number
}

function partner(proLabore: number) {
  const inss = proLaboreInss(proLabore)
  return { inss, irrf: irrf({ taxableIncome: proLabore, socialSecurity: inss }).tax }
}

function finish(regime: Regime, input: PjInput, companyTaxes: number, proLabore: number, allowed = true, simplesRate?: number): RegimeResult {
  const { inss, irrf: irrfTax } = partner(proLabore)
  const profit = input.monthlyRevenue - companyTaxes - proLabore - input.accountant - input.otherExpenses
  const dividendsTax = profit > DIVIDENDS.monthlyExemption ? profit * DIVIDENDS.rate : 0
  const totalTaxes = companyTaxes + inss + irrfTax + dividendsTax
  const result: RegimeResult = {
    regime,
    allowed,
    companyTaxes,
    proLabore,
    proLaboreInss: inss,
    proLaboreIrrf: irrfTax,
    dividendsTax,
    totalTaxes,
    effectiveRate: input.monthlyRevenue > 0 ? totalTaxes / input.monthlyRevenue : 0,
    net: input.monthlyRevenue - totalTaxes - input.accountant - input.otherExpenses,
  }
  if (simplesRate !== undefined) result.simplesRate = simplesRate
  return result
}

export function compareRegimes(input: PjInput): RegimeResult[] {
  const revenue = input.monthlyRevenue
  const rbt12 = revenue * 12
  const minimumProLabore = Math.max(input.proLabore, MINIMUM_WAGE_2026)

  // MEI: DAS fixo, sem pró-labore obrigatório; a maioria das atividades de TI não é permitida
  const mei = finish("mei", { ...input, accountant: 0 }, MEI.monthlyDas, 0, rbt12 <= MEI.annualLimit)

  // Anexo III via Fator R: pró-labore + CPP do DAS precisam somar 28% do faturamento
  const rateIII = simplesEffectiveRate(rbt12, SIMPLES_ANEXO_III)
  const fatorRProLabore = Math.max(minimumProLabore, revenue * FATOR_R - revenue * rateIII * simplesCppShare(rbt12))
  const simplesIII = finish("simples-iii", input, revenue * rateIII, fatorRProLabore, rbt12 <= SIMPLES_LIMIT, rateIII)

  // Anexo V: sem Fator R, pró-labore mínimo
  const rateV = simplesEffectiveRate(rbt12, SIMPLES_ANEXO_V)
  const simplesV = finish("simples-v", input, revenue * rateV, minimumProLabore, rbt12 <= SIMPLES_LIMIT, rateV)

  // Lucro Presumido: tributos sobre o faturamento + CPP de 20% sobre o pró-labore (fora do Simples)
  const p = PRESUMIDO
  const presumedProfit = revenue * p.presumption
  const irpj = presumedProfit * p.irpj + Math.max(0, presumedProfit - p.surchargeMonthlyThreshold) * p.irpjSurcharge
  const presumidoTaxes = irpj + presumedProfit * p.csll + revenue * (p.pis + p.cofins + input.issRate) + minimumProLabore * p.cpp
  const presumido = finish("presumido", input, presumidoTaxes, minimumProLabore)

  return [mei, simplesIII, simplesV, presumido]
}

export function bestRegime(results: RegimeResult[]): RegimeResult | undefined {
  return results.filter((r) => r.allowed).reduce<RegimeResult | undefined>((best, r) => (!best || r.net > best.net ? r : best), undefined)
}
