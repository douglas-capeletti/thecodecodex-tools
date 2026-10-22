// Os testes usam um retrato fixo dos indicadores do Banco Central (no site, o JSON é atualizado todo dia)
import { setMarketData, type MarketData } from "./market"
import data from "./market.fixture.json"

setMarketData(data as MarketData)
