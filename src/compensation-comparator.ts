import { cltYear, grossForAnnualTotal, irrf, type CltOptions } from "./finance/clt"
import { cooperativeInss } from "./finance/pj"

// --- 1. ENCARGOS CLT ---
// INSS, IRRF 2026 (tabela + redução da Lei 15.270/2025) e o pacote anual CLT vêm de src/finance/clt.ts

// --- 3. HIRING MODELS ---

export interface ComparisonResult {
  model: string
  monthlyGrossOrRevenue: number
  monthlyLiquidity: number
  annualLiquidity: number
  monthlyAverageReal: number
  monthlyTaxesAndFees: number
}

function calculateFullClt(targetAnnualLiquidity: number, modelName: string = "CLT", options: CltOptions = {}): ComparisonResult {
  const cltFullGross = grossForAnnualTotal(targetAnnualLiquidity, options)
  const year = cltYear(cltFullGross, options)

  return {
    model: modelName,
    monthlyGrossOrRevenue: cltFullGross,
    monthlyLiquidity: year.month.net,
    annualLiquidity: targetAnnualLiquidity,
    monthlyAverageReal: targetAnnualLiquidity / 12,
    monthlyTaxesAndFees: year.month.inss + year.month.irrf.tax,
  }
}

function calculateSimplePj(targetAnnualLiquidity: number, pjTaxRate: number = 0.06, modelName: string = "PJ (Simples Nacional)"): ComparisonResult {
  const pjTargetNetMonthly = targetAnnualLiquidity / 12
  const pjRevenue = pjTargetNetMonthly / (1 - pjTaxRate)
  const pjMonthlyTax = pjRevenue * pjTaxRate
  const monthlyLiquidity = pjRevenue - pjMonthlyTax

  return {
    model: modelName,
    monthlyGrossOrRevenue: pjRevenue,
    monthlyLiquidity: monthlyLiquidity, // No PJ sem provisão, a liquidez mensal é igual à média
    annualLiquidity: targetAnnualLiquidity,
    monthlyAverageReal: targetAnnualLiquidity / 12,
    monthlyTaxesAndFees: pjMonthlyTax
  }
}

function calculateCooperative(
  targetAnnualLiquidity: number,
  coopAdminFeeRate: number = 0.03,
  businessVacationDays: number = 10,
  proLaboreValue: number = 2500.00,
  modelName: string = "Cooperado"
): ComparisonResult {
  const coopMonthsFactorWithVacation = 12 + (businessVacationDays / 22)
  const coopTargetNetMonthly = targetAnnualLiquidity / coopMonthsFactorWithVacation

  // cooperado é contribuinte individual: 20% de INSS retidos pela cooperativa (não a tabela do empregado)
  const proLaboreInss = cooperativeInss(proLaboreValue)
  const proLaboreIrrf = irrf({ taxableIncome: proLaboreValue, socialSecurity: proLaboreInss }).tax
  const totalTaxesProLabore = proLaboreInss + proLaboreIrrf

  const cooperativeRevenue = (coopTargetNetMonthly + totalTaxesProLabore) / (1 - coopAdminFeeRate)
  const coopMonthlyAdminFee = cooperativeRevenue * coopAdminFeeRate
  const monthlyLiquidity = cooperativeRevenue - coopMonthlyAdminFee - totalTaxesProLabore

  return {
    model: modelName,
    monthlyGrossOrRevenue: cooperativeRevenue,
    monthlyLiquidity: monthlyLiquidity,
    annualLiquidity: targetAnnualLiquidity,
    monthlyAverageReal: targetAnnualLiquidity / 12,
    monthlyTaxesAndFees: coopMonthlyAdminFee + totalTaxesProLabore
  }
}


// --- 4. EXECUTION ---

export interface ComparatorOptions {
  targetLiquidity: number
  pjTaxRate?: number
  coopAdminFeeRate?: number
  businessVacationDays?: number
  proLaboreValue?: number
  // benefícios e bônus do lado CLT entram no pacote anual (reduzem o bruto necessário)
  cltBenefitsMonthly?: number
  cltAnnualBonus?: number
  includeFgts?: boolean
  modelNames?: {
    clt: string
    pj: string
    coop: string
  }
}

export function generateComparison(options: ComparatorOptions): ComparisonResult[] {
  const modelNames = options.modelNames || { clt: "CLT", pj: "PJ (Simples Nacional)", coop: "Cooperado" }
  return [
    calculateFullClt(options.targetLiquidity, modelNames.clt, { monthlyBenefits: options.cltBenefitsMonthly ?? 0, annualBonus: options.cltAnnualBonus ?? 0, includeFgts: options.includeFgts ?? true }),
    calculateSimplePj(options.targetLiquidity, options.pjTaxRate, modelNames.pj),
    calculateCooperative(options.targetLiquidity, options.coopAdminFeeRate, options.businessVacationDays, options.proLaboreValue, modelNames.coop)
  ]
}
export const DEFAULT_OPTIONS: Required<Omit<ComparatorOptions, "modelNames" | "includeFgts">> = {
  targetLiquidity: 100_000,
  pjTaxRate: 0.06,
  coopAdminFeeRate: 0.03,
  businessVacationDays: 10,
  proLaboreValue: 1_000,
  cltBenefitsMonthly: 0,
  cltAnnualBonus: 0,
}

// Modo "tenho uma proposta CLT": o pacote anual dessa proposta vira a meta que PJ e Cooperado precisam igualar
export function annualTargetFromCltOffer(gross: number, options: Pick<ComparatorOptions, "cltBenefitsMonthly" | "cltAnnualBonus" | "includeFgts"> = {}): number {
  return cltYear(gross, { monthlyBenefits: options.cltBenefitsMonthly ?? 0, annualBonus: options.cltAnnualBonus ?? 0, includeFgts: options.includeFgts ?? true }).annualTotal
}

// Faturamento em moeda estrangeira: quanto cobrar para receber `brl` em reais, descontado o spread da conversão
export function foreignAmount(brl: number, exchangeRate: number, spread: number): number {
  const effectiveRate = exchangeRate * (1 - spread)
  return effectiveRate > 0 ? brl / effectiveRate : 0
}
