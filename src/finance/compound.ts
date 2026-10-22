// Juros compostos com aportes mensais, IR regressivo da renda fixa e correção pela inflação.
// Taxas anuais são EFETIVAS (como CDI, poupança e Tesouro são cotados): mensal = (1 + anual)^(1/12) − 1.

export interface CompoundInput {
  initial: number
  monthly: number
  months: number
  // taxa anual efetiva, ex.: 0.1 = 10% a.a.
  annualRate: number
  // inflação anual esperada, para o valor real (poder de compra de hoje)
  annualInflation?: number
  // aplica o IR regressivo sobre o rendimento no resgate (CDB, Tesouro…); poupança é isenta
  taxed?: boolean
}

export interface YearRow {
  year: number
  contributed: number
  interest: number
  balance: number
}

export interface CompoundResult {
  rows: YearRow[]
  contributed: number
  interest: number
  grossBalance: number
  incomeTax: number
  netBalance: number
  // saldo líquido em reais de hoje
  realBalance: number
  // renda mensal sustentável pela regra dos 4% ao ano, em reais de hoje
  monthlyIncome4: number
}

export const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1

// Tabela regressiva da renda fixa (Lei 11.033/2004), pelo prazo de cada aporte
export function regressiveRate(monthsHeld: number): number {
  if (monthsHeld <= 6) return 0.225
  if (monthsHeld <= 12) return 0.2
  if (monthsHeld <= 24) return 0.175
  return 0.15
}

export function simulate({ initial, monthly, months, annualRate, annualInflation = 0, taxed = false }: CompoundInput): CompoundResult {
  const r = monthlyRate(annualRate)
  const n = Math.max(0, Math.round(months))
  let balance = initial
  let contributed = initial
  const rows: YearRow[] = []
  // aporte no fim de cada mês, depois do rendimento do mês
  for (let m = 1; m <= n; m++) {
    balance = balance * (1 + r) + monthly
    contributed += monthly
    if (m % 12 === 0 || m === n) rows.push({ year: Math.ceil(m / 12), contributed, interest: balance - contributed, balance })
  }

  // IR: cada aporte tem o próprio prazo; o ganho de cada um paga a alíquota do seu prazo
  let incomeTax = 0
  if (taxed) {
    const lots = [{ amount: initial, held: n }, ...Array.from({ length: n }, (_, k) => ({ amount: monthly, held: n - (k + 1) }))]
    for (const { amount, held } of lots) incomeTax += amount * (Math.pow(1 + r, held) - 1) * regressiveRate(held)
  }

  const netBalance = balance - incomeTax
  const realBalance = netBalance / Math.pow(1 + annualInflation, n / 12)
  return {
    rows,
    contributed,
    interest: balance - contributed,
    grossBalance: balance,
    incomeTax,
    netBalance,
    realBalance,
    monthlyIncome4: (realBalance * 0.04) / 12,
  }
}
