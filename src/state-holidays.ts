// Feriados estaduais com base legal. Cada entrada cita a lei e a fonte consultada; só entram datas com folga
// (pontos facultativos e datas comemorativas ficam de fora). Datas móveis usam `rule`.

export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"] as const
export type Uf = (typeof UFS)[number]

export interface StateHoliday {
  uf: Uf
  name: string
  // "MM-DD" para datas fixas
  date?: string
  // datas móveis: devolve "YYYY-MM-DD" para o ano
  rule?: (year: number) => string
  // transferências pontuais publicadas por decreto/portaria para um ano específico
  overrides?: Record<number, string>
  law: string
  source: string
  note?: string
}

// Estados sem feriado estadual com folga além dos nacionais (verificado): MG, MT, PR.
// Ainda sem documento oficial verificado (não incluídos): AP, RN, RO e o 05/10 de TO.
const sundayOnOrAfter = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7))
  return date.toISOString().slice(0, 10)
}
const plusDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const TJAC = "https://webdev.tjac.jus.br/wp-content/uploads/2025/12/Portaria_PRESI_TJAC_6569_2025.pdf"
const JFAL = "https://www.jfal.jus.br/noticias/6685/Portaria%20n.%20199-2025-feriados-2026.pdf"

export const STATE_HOLIDAYS: StateHoliday[] = [
  { uf: "AC", date: "01-20", overrides: { 2026: "2026-01-22" }, name: "Dia do Católico", law: "Lei 3.137/2016", source: TJAC, note: "A Lei 2.126/2009 transfere alguns feriados do AC; em 2026 foi para 22/01." },
  { uf: "AC", date: "01-23", name: "Dia do Evangélico", law: "Lei 1.538/2004", source: TJAC },
  { uf: "AC", date: "03-08", name: "Dia Internacional da Mulher", law: "Lei 1.411/2001", source: TJAC },
  { uf: "AC", date: "06-15", name: "Aniversário do Estado do Acre", law: "Lei 14/1964", source: TJAC },
  { uf: "AC", date: "09-05", name: "Dia da Amazônia", law: "Lei 243/1968", source: TJAC },
  { uf: "AL", date: "06-24", name: "São João", law: "Lei 5.508/1993", source: JFAL },
  { uf: "AL", date: "06-29", name: "São Pedro", law: "Lei 5.509/1993", source: JFAL },
  { uf: "AL", date: "09-16", name: "Emancipação Política de Alagoas", law: "Decreto 106.093/2025", source: JFAL },
  { uf: "AM", date: "09-05", name: "Elevação do Amazonas à categoria de Província", law: "Calendário oficial TJAM 2026", source: "https://www.tjam.jus.br/images/2026/CalendarioJudicial2026_alterado.pdf" },
  { uf: "BA", date: "07-02", name: "Independência da Bahia", law: "Constituição da Bahia, art. 6º, §3º", source: "https://www.tjba.jus.br/portal/wp-content/uploads/2025/12/Decreto-1050-25_-expediente-forense-2026.pdf" },
  { uf: "CE", date: "03-25", name: "Data Magna do Ceará", law: "EC estadual 73/2011", source: "https://portal.tjce.jus.br/uploads/2026/04/PORT-FERIADOS-E-PONTO-FACULTATIVO-2026-1776690769.pdf" },
  { uf: "DF", date: "11-30", name: "Dia do Evangélico", law: "Lei distrital 963/1995", source: "https://www.lex.com.br/feriado-do-dia-do-evangelico-instituido-por-lei-distrital-nao-se-aplica-a-orgaos-publicos-federais-com-sede-no-df/", note: "Não vale para órgãos federais; há divergência no TST para o setor privado." },
  { uf: "ES", rule: (year) => plusDays(easterSunday(year), 8), name: "Nossa Senhora da Penha (Data Magna)", law: "Lei 11.010/2019", source: "https://www.folhavitoria.com.br/geral/dia-de-nossa-senhora-da-penha-se-torna-feriado-em-todo-o-espirito-santo/", note: "Segunda-feira, 8 dias após a Páscoa." },
  { uf: "GO", date: "07-26", name: "Fundação da Cidade de Goiás (Data Magna)", law: "Lei 20.756/2020, art. 269", source: "https://www.tjgo.jus.br/files/2026/01%20-%20Janeiro/Calendario%20do%20TJGO_2026_publicado-2.pdf", note: "Já foi transferido por decreto em anos anteriores." },
  { uf: "MA", date: "07-28", name: "Adesão do Maranhão à Independência", law: "Lei 2.457/1964", source: "https://novogerenciador.tjma.jus.br/storage/portalweb/medida_provisoria_313_08_05_2020_26052020_1240.pdf" },
  { uf: "MS", date: "10-11", name: "Criação do Estado de Mato Grosso do Sul", law: "Lei 10/1979", source: "https://web.trf3.jus.br/atos-normativos/atos-normativos-dir/Conselho%20da%20Justi%C3%A7a/Portarias/2020/Portaria0431.htm" },
  { uf: "PA", date: "08-15", name: "Adesão do Pará à Independência", law: "Portaria MPF PR/PA 2/2026", source: "https://biblioteca.mpf.mp.br/repositorio/bitstreams/4b2d53d1-112c-4958-a8f6-3b318d7bcef7/download" },
  { uf: "PB", date: "08-05", name: "Data Magna da Paraíba", law: "Lei 10.601/2015", source: "https://www.tjpb.jus.br/sites/default/files/legislacao/ATO_CONJUNTO_No_04_16102025.pdf" },
  { uf: "PE", date: "03-06", name: "Data Magna de Pernambuco (Revolução de 1817)", law: "Lei 16.241/2017, art. 49", source: "https://portal.tjpe.jus.br/documents/d/portal/feriados-2026-pdf" },
  { uf: "PI", date: "10-19", name: "Dia do Piauí", law: "Lei 176/1937", source: "https://www.legisweb.com.br/legislacao/?id=454668" },
  { uf: "RJ", rule: (year) => plusDays(easterSunday(year), -47), name: "Carnaval (terça-feira)", law: "Lei 5.243/2008", source: "https://www.conjur.com.br/2008-set-02/confederacao_questiona_lei_amplia_feriado_rio", note: "Questionado em ADI no STF; cumprido na prática." },
  { uf: "RJ", date: "04-23", name: "Dia de São Jorge", law: "Lei 5.198/2008", source: "https://www.coad.com.br/home/noticias-detalhe/12754/dia-de-sao-jorge-passa-a-ser-feriado-estadual", note: "Questionado em ADI no STF; cumprido na prática." },
  { uf: "RR", date: "10-05", name: "Aniversário do Estado de Roraima", law: "Portaria TJRR/PR 1558/2025", source: "https://diario.tjrr.jus.br/dpj/dpj-20251222.pdf" },
  { uf: "RS", date: "09-20", name: "Revolução Farroupilha (Data Magna)", law: "Constituição do RS, art. 6º, parágrafo único", source: "https://www.mprs.mp.br/legislacao/provimentos/12970/" },
  { uf: "SC", rule: (year) => sundayOnOrAfter(`${year}-08-11`), name: "Data Magna de Santa Catarina", law: "Lei 18.531/2022", source: "https://www.nsctotal.com.br/noticias/data-magna-santa-catarina", note: "Celebrada no domingo seguinte ao 11/08 (ou no próprio dia, se for domingo)." },
  { uf: "SE", date: "07-08", name: "Independência de Sergipe", law: "Constituição de Sergipe, art. 269", source: "https://www.gov.br/hubrasil/pt-br/hospitais-universitarios/regiao-nordeste/hu-ufs/acesso-a-informacao/boletim-de-servico/2026/boletim-servico-no-464-de-15-de-janeiro-de-2026.pdf" },
  { uf: "SP", date: "07-09", name: "Revolução Constitucionalista de 1932", law: "Lei 9.497/1997", source: "https://www.al.sp.gov.br/repositorio/legislacao/lei/1997/lei-9497-05.03.1997.html" },
  { uf: "TO", date: "09-08", name: "Nossa Senhora da Natividade", law: "Lei 627/1993", source: "https://trf1.jus.br/sjto/conteudo/files/FERIADOS%20SUBSE__O%20JUDICI_RIA%20DE%20GURUPI.pdf" },
]

export function stateHolidaysFor(uf: Uf, year: number): { date: string, name: string, law: string, source: string }[] {
  return STATE_HOLIDAYS.filter((h) => h.uf === uf).map((h) => ({
    date: h.overrides?.[year] ?? (h.rule ? h.rule(year) : `${year}-${h.date}`),
    name: h.name,
    law: h.law,
    source: h.source,
  }))
}

// Páscoa (Meeus/Jones/Butcher) — duplicada de vacation.ts para evitar import circular
function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
