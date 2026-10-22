// Encargos do empregado CLT em 2026.
// INSS: Portaria Interministerial MPS/MF nº 13/2026 (teto R$ 8.475,55).
// IRRF: tabela progressiva mensal + redução da Lei nº 15.270/2025, conforme
// https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026

export interface Bracket {
  upTo: number
  rate: number
}

export const INSS_2026: Bracket[] = [
  { upTo: 1621.0, rate: 0.075 },
  { upTo: 2902.84, rate: 0.09 },
  { upTo: 4354.27, rate: 0.12 },
  { upTo: 8475.55, rate: 0.14 },
]

// Tabela progressiva mensal: alíquota e parcela a deduzir por faixa da BASE DE CÁLCULO
export const IRRF_2026 = [
  { upTo: 2428.8, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduction: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduction: 675.49 },
  { upTo: Infinity, rate: 0.275, deduction: 908.73 },
] as const

export const IRRF_DEPENDENT_2026 = 189.59
// Desconto simplificado mensal: substitui as deduções legais quando for maior
export const IRRF_SIMPLIFIED_2026 = 607.2

// Redução (Lei 15.270/2025): calculada sobre os RENDIMENTOS TRIBUTÁVEIS (salário bruto), não sobre a base
export const REDUCTION_2026 = { exemptUpTo: 5000, max: 312.89, phaseOutUpTo: 7350, constant: 978.62, factor: 0.133145 }

// Arredonda centavos "para cima no meio" como a folha (121,575 → 121,58); toFixed(10) remove o ruído binário (121,57499…)
const round2 = (value: number) => Math.round(Number(value.toFixed(10)) * 100) / 100

// INSS progressivo: cada alíquota incide só sobre a parcela dentro da sua faixa
export function inss(gross: number, table: Bracket[] = INSS_2026): number {
  let total = 0
  let floor = 0
  for (const { upTo, rate } of table) {
    if (gross <= floor) break
    total += (Math.min(gross, upTo) - floor) * rate
    floor = upTo
  }
  return round2(total)
}

export function irrfTable(base: number): number {
  if (base <= 0) return 0
  const bracket = IRRF_2026.find((b) => base <= b.upTo) ?? IRRF_2026[IRRF_2026.length - 1]
  return round2(Math.max(0, base * (bracket?.rate ?? 0) - (bracket?.deduction ?? 0)))
}

export function irrfReduction(taxableIncome: number, taxBeforeReduction: number): number {
  const { exemptUpTo, max, phaseOutUpTo, constant, factor } = REDUCTION_2026
  if (taxableIncome <= exemptUpTo) return Math.min(max, taxBeforeReduction)
  if (taxableIncome <= phaseOutUpTo) return round2(Math.min(Math.max(0, constant - factor * taxableIncome), taxBeforeReduction))
  return 0
}

export interface IrrfInput {
  // rendimentos tributáveis do mês (salário bruto)
  taxableIncome: number
  // INSS descontado no mês
  socialSecurity: number
  dependents?: number
  alimony?: number
}

export interface IrrfResult {
  base: number
  deduction: "legal" | "simplified"
  deductionAmount: number
  taxBeforeReduction: number
  reduction: number
  tax: number
}

/**
 * IRRF mensal 2026:
 * 1. deduções legais (INSS + dependentes + pensão) ou desconto simplificado, o que for maior;
 * 2. tabela progressiva sobre a base;
 * 3. redução da Lei 15.270 calculada sobre o rendimento bruto, limitada ao imposto apurado.
 * Também vale para o 13º (tributação exclusiva): a redução se aplica a ele por força do art. 3º-A, §3º, da Lei 9.250/1995,
 * incluído pela Lei 15.270/2025. As férias são rendimento do mês e seguem a regra mensal normal.
 */
export function irrf({ taxableIncome, socialSecurity, dependents = 0, alimony = 0 }: IrrfInput): IrrfResult {
  const legal = socialSecurity + dependents * IRRF_DEPENDENT_2026 + alimony
  const simplified = legal < IRRF_SIMPLIFIED_2026
  const deductionAmount = simplified ? IRRF_SIMPLIFIED_2026 : legal
  const base = round2(Math.max(0, taxableIncome - deductionAmount))
  const taxBeforeReduction = irrfTable(base)
  const reduction = irrfReduction(taxableIncome, taxBeforeReduction)
  return { base, deduction: simplified ? "simplified" : "legal", deductionAmount: round2(deductionAmount), taxBeforeReduction, reduction, tax: round2(Math.max(0, taxBeforeReduction - reduction)) }
}

// Atalho para o caso comum: salário bruto → INSS e IRRF do mês
export function payrollTaxes(gross: number, options: { dependents?: number, alimony?: number } = {}) {
  const socialSecurity = inss(gross)
  const income = irrf({ taxableIncome: gross, socialSecurity, ...options })
  return { inss: socialSecurity, irrf: income.tax, detail: income }
}

export const FGTS_RATE = 0.08
// Desconto máximo do vale-transporte: 6% do salário-base (Lei 7.418/85), limitado ao custo do benefício
export const TRANSPORT_VOUCHER_RATE = 0.06

export interface CltOptions {
  dependents?: number
  // pensão alimentícia judicial: deduz do IR e sai do líquido
  alimony?: number
  // custo mensal do vale-transporte; o empregado paga até 6% do salário
  transportVoucher?: number
  // outros descontos em folha (coparticipação de plano, empréstimo…)
  otherDiscounts?: number
  // benefícios mensais pagos pela empresa e não descontados (VR/VA, parte do plano de saúde, auxílios)
  monthlyBenefits?: number
  // PLR, bônus ou RSUs líquidos no ano
  annualBonus?: number
  includeFgts?: boolean
}

export interface CltMonth {
  gross: number
  inss: number
  irrf: IrrfResult
  transportDiscount: number
  alimony: number
  otherDiscounts: number
  net: number
}

export function cltMonth(gross: number, options: CltOptions = {}): CltMonth {
  const { dependents = 0, alimony = 0, transportVoucher = 0, otherDiscounts = 0 } = options
  const socialSecurity = inss(gross)
  const income = irrf({ taxableIncome: gross, socialSecurity, dependents, alimony })
  const transportDiscount = round2(Math.min(transportVoucher, gross * TRANSPORT_VOUCHER_RATE))
  const net = round2(gross - socialSecurity - income.tax - transportDiscount - alimony - otherDiscounts)
  return { gross, inss: socialSecurity, irrf: income, transportDiscount, alimony, otherDiscounts, net }
}

export interface CltYear {
  month: CltMonth
  // 13º líquido (tributação exclusiva, mesma tabela e redução)
  net13th: number
  // ganho líquido de férias: (salário + 1/3) tributados juntos, menos o salário líquido do mês que ele substitui
  vacationBonusNet: number
  fgtsYear: number
  // benefícios no ano: mensais × 12 + parte do VT paga pela empresa
  benefitsYear: number
  bonusYear: number
  // tudo que entra no ano (salários líquidos, 13º, 1/3 de férias, FGTS, benefícios, bônus)
  annualTotal: number
  monthlyEquivalent: number
}

export function cltYear(gross: number, options: CltOptions = {}): CltYear {
  const { dependents = 0, monthlyBenefits = 0, annualBonus = 0, includeFgts = true, transportVoucher = 0 } = options
  const month = cltMonth(gross, options)

  const tax13th = payrollTaxes(gross, { dependents })
  const net13th = round2(gross - tax13th.inss - tax13th.irrf)

  // no mês de férias o salário vem com o terço constitucional e é tributado junto
  const vacation = cltMonth(gross + gross / 3, options)
  const vacationBonusNet = round2(vacation.net - month.net)

  const fgtsYear = includeFgts ? round2(gross * FGTS_RATE * (12 + 1 + 1 / 3)) : 0
  const benefitsYear = round2(monthlyBenefits * 12 + (transportVoucher - month.transportDiscount) * 11)
  const annualTotal = round2(month.net * 12 + net13th + vacationBonusNet + fgtsYear + benefitsYear + annualBonus)
  return { month, net13th, vacationBonusNet, fgtsYear, benefitsYear, bonusYear: annualBonus, annualTotal, monthlyEquivalent: round2(annualTotal / 12) }
}

// Menor salário bruto cujo pacote anual atinge a meta (busca binária, precisão de centavos)
export function grossForAnnualTotal(target: number, options: CltOptions = {}): number {
  if (cltYear(0, options).annualTotal >= target) return 0
  let low = 0
  let high = 1_000_000
  while (high - low > 0.01) {
    const mid = (low + high) / 2
    if (cltYear(mid, options).annualTotal >= target) high = mid
    else low = mid
  }
  // menor valor em centavos que atinge a meta (evita 12.000,01 quando 12.000,00 já basta)
  const cents = Math.floor(high * 100) / 100
  return cltYear(cents, options).annualTotal >= target ? cents : Math.round((cents + 0.01) * 100) / 100
}

