// Indicadores do Banco Central. Os dados vêm de fora (o site grava um JSON por dia no build) e são
// carregados com setMarketData antes do uso. Se a API falhou na última atualização, `stale` é true
// e o valor é o último conhecido.
export interface MarketValue {
  code: number
  name: string
  unit: string
  value: number
  date: string
  stale: boolean
}

export type MarketKey = "cdi" | "ipca12m" | "savingsMonthly" | "usd" | "eur" | "gbp" | "cad"
export type Currency = "USD" | "EUR" | "GBP" | "CAD"

export interface MarketData {
  fetchedAt: string
  source: string
  series: Record<MarketKey, MarketValue>
}

// `market` mantém a mesma referência; `marketFetchedAt` e `MARKET_SOURCE` são live bindings (ESM)
export const market = {} as Record<MarketKey, MarketValue>
export let marketFetchedAt = ""
export let MARKET_SOURCE = ""

export function setMarketData(data: MarketData) {
  Object.assign(market, data.series)
  marketFetchedAt = data.fetchedAt
  MARKET_SOURCE = data.source
}

export const sgsUrl = (code: number) => `https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarValores&optSelecionaSerie=${code}`

const value = (key: MarketKey) => {
  const series = market[key]
  if (!series) throw new Error("Dados de mercado não carregados: chame setMarketData() antes")
  return series.value
}

// Taxas em fração (0.1365 = 13,65% a.a.)
export const cdiAnnual = () => value("cdi") / 100
export const ipca12m = () => value("ipca12m") / 100
// Poupança: rendimento mensal composto para anual
export const savingsAnnual = () => Math.pow(1 + value("savingsMonthly") / 100, 12) - 1

const FX_KEY: Record<Currency, MarketKey> = { USD: "usd", EUR: "eur", GBP: "gbp", CAD: "cad" }
export const fxKey = (currency: Currency) => FX_KEY[currency]
export const fxRate = (currency: Currency) => value(FX_KEY[currency])
