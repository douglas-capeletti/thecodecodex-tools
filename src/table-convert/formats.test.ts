import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { columnKinds, convertTable, excelDate, identifier, inferValue, parseNumber, parseTable, readXlsx, SAMPLE, serialize, sheetName, toXlsx, transformTable, type Table } from "./index"
import { crc32, unzip, zip } from "./zip"

const t: Table = { columns: ["id", "user name", "score", "active"], rows: [["1", "Ana", "9.5", "true"], ["2", "O'Neil \"Bob\"", "", "false"]] }

describe("decimal comma", () => {
  it("parses 1.234,56 only when asked, and keeps ambiguous text as text", () => {
    expect(parseNumber("1.234,56", "comma")).toBe(1234.56)
    expect(parseNumber("8500,5", "comma")).toBe(8500.5)
    expect(parseNumber("-0,25", "comma")).toBe(-0.25)
    expect(parseNumber("1.234", "comma")).toBe(1234)
    expect(parseNumber("1.23", "comma")).toBeUndefined()
    expect(parseNumber("1,234.5", "comma")).toBeUndefined()
    expect(parseNumber("8500,5")).toBeUndefined()
    expect(inferValue("01310", false, "comma")).toBe("01310")
  })

  it("types whole columns and sorts with the chosen decimal", () => {
    const br: Table = { columns: ["valor"], rows: [["1.000,50"], ["99,9"], ["7"]] }
    expect(columnKinds(br, { decimal: "comma" })).toEqual(["number"])
    expect(columnKinds(br)).toEqual(["text"])
    expect(JSON.parse(serialize(br, "json", { decimal: "comma" }))).toEqual([{ valor: 1000.5 }, { valor: 99.9 }, { valor: 7 }])
    expect(transformTable(br, { sortBy: 0, decimal: "comma" }).table.rows.flat()).toEqual(["7", "99,9", "1.000,50"])
    expect(serialize(br, "sql", { decimal: "comma", createTable: true })).toContain("`valor` DECIMAL(18,6)")
  })

  it("empty cells in a typed column become null instead of mixing types", () => {
    expect(JSON.parse(serialize(t, "json"))[1].score).toBeNull()
  })
})

describe("data and document formats", () => {
  it("TOML: array of tables, quoted keys, nulls omitted", () => {
    expect(serialize(t, "toml")).toBe('[[rows]]\nid = 1\n"user name" = "Ana"\nscore = 9.5\nactive = true\n\n[[rows]]\nid = 2\n"user name" = "O\'Neil \\"Bob\\""\nactive = false')
  })

  it("INI: one section per row named by the first column", () => {
    expect(serialize(t, "ini")).toBe('[1]\nuser_name = Ana\nscore = 9.5\nactive = true\n\n[2]\nuser_name = "O\'Neil \\"Bob\\""\nscore = \nactive = false')
  })

  it("Jira, MediaWiki and AsciiDoc escape the cell separator", () => {
    const pipe: Table = { columns: ["a", "b"], rows: [["x|y", ""]] }
    expect(serialize(pipe, "jira")).toBe("||a||b||\n|x\\|y| |")
    expect(serialize(pipe, "mediawiki")).toBe('{| class="wikitable"\n|-\n! a !! b\n|-\n| x&#124;y || \n|}')
    expect(serialize(pipe, "asciidoc")).toBe('[cols="1,1", options="header"]\n|===\n| a | b\n\n| x\\|y | \n|===')
  })

  it("reStructuredText grid table", () => {
    expect(serialize({ columns: ["k", "value"], rows: [["a", "1"]] }, "rst")).toBe("+---+-------+\n| k | value |\n+===+=======+\n| a | 1     |\n+---+-------+")
  })
})

describe("code formats", () => {
  it("builds identifiers for types and Go fields", () => {
    expect(identifier("user name")).toBe("UserName")
    expect(identifier("ação_rápida")).toBe("AcaoRapida")
    expect(identifier("2fa")).toBe("Row2fa")
    expect(identifier("")).toBe("Row")
  })

  it("Python and pandas literals", () => {
    expect(serialize(t, "python")).toBe('rows = [\n    {"id": 1, "user name": "Ana", "score": 9.5, "active": True},\n    {"id": 2, "user name": "O\'Neil \\"Bob\\"", "score": None, "active": False},\n]')
    expect(serialize(t, "pandas")).toBe('import pandas as pd\n\ndf = pd.DataFrame({\n    "id": [1, 2],\n    "user name": ["Ana", "O\'Neil \\"Bob\\""],\n    "score": [9.5, None],\n    "active": [True, False],\n})')
  })

  it("TypeScript interface marks nullable columns", () => {
    expect(serialize(t, "typescript", { typeName: "player" })).toBe(
      'export interface Player {\n  id: number\n  "user name": string\n  score: number | null\n  active: boolean\n}\n\nexport const rows: Player[] = [\n  { id: 1, "user name": "Ana", score: 9.5, active: true },\n  { id: 2, "user name": "O\'Neil \\"Bob\\"", score: null, active: false },\n]',
    )
  })

  it("Go struct with initialisms, aligned fields, json tags and pointers for nullable columns", () => {
    const out = serialize(t, "go")
    expect(out).toContain("type Row struct {\n\tID       int64    `json:\"id\"`\n\tUserName string   `json:\"user name\"`\n\tScore    *float64 `json:\"score\"`\n\tActive   bool     `json:\"active\"`\n}")
    expect(out).toContain('\t{ID: 1, UserName: "Ana", Score: ptr(9.5), Active: true},\n\t{ID: 2, UserName: "O\'Neil \\"Bob\\"", Active: false},')
    expect(out).toContain("func ptr[T any](v T) *T { return &v }")
    expect(serialize({ columns: ["n"], rows: [["1"]] }, "go")).not.toContain("ptr")
  })

  it("PHP array escapes single quotes", () => {
    expect(serialize(t, "php")).toBe("<?php\n\n$rows = [\n    ['id' => 1, 'user name' => 'Ana', 'score' => 9.5, 'active' => true],\n    ['id' => 2, 'user name' => 'O\\'Neil \"Bob\"', 'score' => null, 'active' => false],\n];")
  })
})

describe("zip", () => {
  it("computes CRC-32 and reads back what it writes", async () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926)
    const files = unzip(zip([{ name: "a/ç.txt", data: new TextEncoder().encode("olá") }]))
    expect(new TextDecoder().decode(await files.get("a/ç.txt")?.())).toBe("olá")
  })
})

describe("xlsx", () => {
  it("converts Excel serial numbers to ISO dates", () => {
    expect(excelDate(46316)).toBe("2026-10-21")
    expect(excelDate(46024.572916666664)).toBe("2026-01-02 13:45:00")
    expect(excelDate(0.5)).toBe("12:00:00")
    expect(excelDate(44491, true)).toBe("2025-10-23")
    expect(sheetName("a/b:c")).toBe("a b c")
  })

  it("reads a real workbook saved by LibreOffice: shared strings, formulas, dates, merges, sheets", async () => {
    const sheets = await readXlsx(new Uint8Array(readFileSync(new URL("./fixtures/libreoffice.xlsx", import.meta.url))))
    expect(sheets.map((s) => s.name)).toEqual(["Vendas", "Outra"])
    const [head, first, second, third] = sheets[0]?.rows ?? []
    expect(head).toEqual(["Produto", "Qtd", "Preço", "Total", "Data", "Ativo", "Obs", "Mesclado", "Mesclado"])
    expect(first).toEqual(["Café & Cia", "3", "12.5", "37.5", "2026-10-21", "true", "linha 1\nlinha 2"])
    expect(second?.slice(0, 6)).toEqual(["Pão <francês>", "10", "0.75", "7.5", "2026-01-02 13:45:00", "false"])
    expect(third?.at(-1)).toBe("01310-100")
  })

  it("round-trips through its own writer with typed cells, header style, frozen pane and filter", async () => {
    const table = parseTable(SAMPLE).table
    const bytes = toXlsx(table, { sheet: "Pessoas" })
    const files = unzip(bytes)
    const sheet = new TextDecoder().decode(await files.get("xl/worksheets/sheet1.xml")?.())
    expect(sheet).toContain('<c r="E2"><v>8500.5</v></c>')
    expect(sheet).toContain('<c r="F2" t="b"><v>1</v></c>')
    expect(sheet).toContain('state="frozen"')
    expect(sheet).toContain('<autoFilter ref="A1:F5"/>')
    const [read] = await readXlsx(bytes)
    expect(read?.name).toBe("Pessoas")
    expect(read?.rows).toEqual([table.columns, ...table.rows.map((r) => r.map((c) => (c === "8500.50" ? "8500.5" : c)))])
  })

  it("writes ISO dates as real Excel dates and reads them back", async () => {
    const dated: Table = { columns: ["day", "at", "bad"], rows: [["2026-10-21", "2026-01-02 13:45:00", "2026-02-30"]] }
    const bytes = toXlsx(dated)
    const sheet = new TextDecoder().decode(await unzip(bytes).get("xl/worksheets/sheet1.xml")?.())
    expect(sheet).toContain('<c r="A2" s="2"><v>46316</v></c>')
    expect(sheet).toContain('<c r="B2" s="3"><v>46024.57291666667</v></c>')
    expect(sheet).toContain('<c r="C2" t="inlineStr">')
    expect((await readXlsx(bytes))[0]?.rows[1]).toEqual(["2026-10-21", "2026-01-02 13:45:00", "2026-02-30"])
  })

  it("convertTable returns the workbook as a file", () => {
    const { output, file } = convertTable("a,b\n1,2", { to: "xlsx" })
    expect(output).toBe("")
    expect(file?.slice(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
  })

  it("rejects files that are not workbooks", async () => {
    await expect(readXlsx(new TextEncoder().encode("hello"))).rejects.toThrow("ZIP")
  })
})
