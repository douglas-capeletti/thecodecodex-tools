import { describe, expect, it } from "vitest"
import { convertTable, detectDelimiter, detectFormat, parseDelimited, parseHtml, parseJson, parseMarkdown, parseTable, SAMPLE, serialize, sqlColumnType, transformTable, yamlScalar, type Table } from "./index"

const people: Table = { columns: ["name", "age", "city"], rows: [["Ana", "30", "São Paulo"], ["Bruno", "25", "Recife"]] }

describe("parsing", () => {
  it("reads RFC 4180 CSV with quotes, escaped quotes, newlines and CRLF", () => {
    expect(parseDelimited('a,b\r\n"x, y","say ""hi"""\n"multi\nline",z\n', ",")).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", "z"]])
  })

  it("detects the delimiter: tab from Excel/Sheets, semicolon from Excel pt-BR, comma, pipe", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("tab")
    expect(detectDelimiter("nome;valor\nAna;1,50\nBia;2,75")).toBe("semicolon")
    expect(detectDelimiter('name,note\nAna,"a; b"\nBia,c')).toBe("comma")
    expect(detectDelimiter("a|b\n1|2")).toBe("pipe")
  })

  it("detects the input format", () => {
    expect(detectFormat('  [{"a":1}]')).toBe("json")
    expect(detectFormat("<table><tr><td>1</td></tr></table>")).toBe("html")
    expect(detectFormat("| a | b |\n|---|---|\n| 1 | 2 |")).toBe("markdown")
    expect(detectFormat("a,b\n1,2")).toBe("csv")
  })

  it("reads Markdown, including escaped pipes and <br>", () => {
    expect(parseMarkdown("| a | b |\n| :-- | --: |\n| x \\| y | 1<br>2 |")).toEqual([["a", "b"], ["x | y", "1\n2"]])
  })

  it("reads the first HTML table with entities, nested tags, <br> and colspan", () => {
    const html = `<p>x</p><table><thead><tr><th>Name</th><th colspan="2">Contact</th></tr></thead>
      <tbody><tr><td><b>Ana</b> &amp; Co</td><td>a@x.com<br>b@x.com</td><td>&#128512;</td></tr>
      <tr><td>Bia<td>no close<td>x</tbody></table><table><tr><td>ignored</td></tr></table>`
    expect(parseHtml(html)).toEqual([["Name", "Contact", ""], ["Ana & Co", "a@x.com\nb@x.com", "😀"], ["Bia", "no close", "x"]])
  })

  it("reads every JSON shape", () => {
    expect(parseJson('[{"a":1,"b":{"c":2}},{"a":null,"d":true}]')).toEqual({ columns: ["a", "b", "d"], rows: [["1", '{"c":2}', ""], ["", "", "true"]] })
    expect(parseJson('[["a","b"],[1,2]]')).toEqual({ columns: ["a", "b"], rows: [["1", "2"]] })
    expect(parseJson('{"a":[1,2],"b":["x"]}')).toEqual({ columns: ["a", "b"], rows: [["1", "x"], ["2", ""]] })
    expect(parseJson('{"u1":{"name":"Ana"},"u2":{"name":"Bia"}}')).toEqual({ columns: ["key", "name"], rows: [["u1", "Ana"], ["u2", "Bia"]] })
    expect(parseJson('{"total":2,"data":[{"id":1},{"id":2}]}')).toEqual({ columns: ["id"], rows: [["1"], ["2"]] })
    expect(parseJson('{"id":1}\n{"id":2}')).toEqual({ columns: ["id"], rows: [["1"], ["2"]] })
    expect(() => parseJson("{oops")).toThrow()
  })

  it("pads ragged rows and names blank or missing headers", () => {
    expect(parseTable("a,,c\n1,2\n1,2,3,4", { from: "csv" }).table).toEqual({ columns: ["a", "column2", "c", "column4"], rows: [["1", "2", "", ""], ["1", "2", "3", "4"]] })
    expect(parseTable("1,2\n3,4", { header: false }).table.columns).toEqual(["column1", "column2"])
  })
})

describe("transformations", () => {
  const messy: Table = { columns: ["Name", "Score"], rows: [["  ana  maria ", "10"], ["", ""], ["BIA", "9"], ["BIA", "9"], ["carlos", "100"]] }

  it("trims, drops empty rows, changes case and dedupes", () => {
    const { table, removedDuplicates, removedEmpty } = transformTable(messy, { trim: true, dropEmpty: true, caseMode: "title", dedupe: true })
    expect(table.rows).toEqual([["Ana Maria", "10"], ["Bia", "9"], ["Carlos", "100"]])
    expect([removedDuplicates, removedEmpty]).toEqual([1, 1])
  })

  it("drops empty columns that have no header", () => {
    const t = parseTable("a,,b\n1,,2", { from: "csv" }).table
    const { table, source } = transformTable(t, { dropEmpty: true })
    expect(table).toEqual({ columns: ["a", "b"], rows: [["1", "2"]] })
    expect(source).toEqual([0, 2])
  })

  it("sorts numbers as numbers, text naturally, empties last", () => {
    const t: Table = { columns: ["v"], rows: [["10"], [""], ["9"], ["100"]] }
    expect(transformTable(t, { sortBy: 0 }).table.rows.flat()).toEqual(["9", "10", "100", ""])
    expect(transformTable(t, { sortBy: 0, descending: true }).table.rows.flat()).toEqual(["100", "10", "9", ""])
    expect(transformTable({ columns: ["f"], rows: [["item10"], ["item2"]] }, { sortBy: 0 }).table.rows.flat()).toEqual(["item2", "item10"])
  })

  it("picks and reorders columns by source index", () => {
    const { table, source } = transformTable(people, { columns: [2, 0, 99] })
    expect(table.columns).toEqual(["city", "name"])
    expect(source).toEqual([2, 0])
  })

  it("finds and replaces, literal by default and with regex groups", () => {
    expect(transformTable(people, { find: "a.", replace: "$1" }).table.rows[0]).toEqual(["Ana", "30", "São Paulo"])
    expect(transformTable(people, { find: "(\\S+) (\\S+)", replace: "$2 $1", regex: true }).table.rows[0]?.[2]).toBe("Paulo São")
    expect(transformTable(people, { find: "ana", replace: "X", ignoreCase: true }).table.rows[0]?.[0]).toBe("X")
    expect(() => transformTable(people, { find: "(", regex: true })).toThrow()
  })

  it("transposes", () => {
    expect(transformTable(people, { transpose: true }).table).toEqual({ columns: ["name", "Ana", "Bruno"], rows: [["age", "30", "25"], ["city", "São Paulo", "Recife"]] })
  })
})

describe("serializers", () => {
  it("CSV quotes only when needed and honours the delimiter", () => {
    const t: Table = { columns: ["a", "b"], rows: [["x,y", 'say "hi"'], [" pad", "ok"]] }
    expect(serialize(t, "csv")).toBe('a,b\n"x,y","say ""hi"""\n" pad",ok')
    expect(serialize(t, "csv", { outputDelimiter: "semicolon", header: false })).toBe('x,y;"say ""hi"""\n" pad";ok')
  })

  it("JSON in four shapes with type inference that keeps leading zeros as text", () => {
    const t: Table = { columns: ["id", "zip", "ok", "note"], rows: [["1", "01310", "true", ""]] }
    expect(JSON.parse(serialize(t, "json"))).toEqual([{ id: 1, zip: "01310", ok: true, note: "" }])
    expect(JSON.parse(serialize(t, "json", { types: false, emptyAsNull: true }))).toEqual([{ id: "1", zip: "01310", ok: "true", note: null }])
    expect(JSON.parse(serialize(t, "json", { jsonShape: "arrays" }))).toEqual([["id", "zip", "ok", "note"], [1, "01310", true, ""]])
    expect(JSON.parse(serialize(t, "json", { jsonShape: "columns" }))).toEqual({ id: [1], zip: ["01310"], ok: [true], note: [""] })
    expect(JSON.parse(serialize(t, "json", { jsonShape: "keyed" }))).toEqual({ 1: { zip: "01310", ok: true, note: "" } })
    expect(serialize(t, "json", { indent: "min" })).not.toContain("\n")
    expect(serialize(t, "jsonl")).toBe('{"id":1,"zip":"01310","ok":true,"note":""}')
  })

  it("types are decided per column, so one non-number keeps the whole column as text", () => {
    const t: Table = { columns: ["salary", "n"], rows: [["7200", "1"], ["8500,50", "null"], ["", "2"]] }
    expect(JSON.parse(serialize(t, "json"))).toEqual([{ salary: "7200", n: 1 }, { salary: "8500,50", n: null }, { salary: "", n: 2 }])
    expect(serialize(t, "sql", { emptyAsNull: true })).toContain("('7200', 1),\n  ('8500,50', NULL),\n  (NULL, 2)")
  })

  it("JSON keeps duplicate column names apart", () => {
    expect(JSON.parse(serialize({ columns: ["a", "a"], rows: [["1", "2"]] }, "json"))).toEqual([{ a: 1, a_2: 2 }])
  })

  it("Markdown: aligned columns, escaping and alignment markers", () => {
    expect(serialize({ columns: ["a", "long"], rows: [["x|y", "1\n2"]] }, "markdown")).toBe("| a    | long   |\n| ---- | ------ |\n| x\\|y | 1<br>2 |")
    expect(serialize(people, "markdown", { align: "center", pretty: false }).split("\n")[1]).toBe("| :-: | :-: | :-: |")
  })

  it("SQL: dialect quoting, escaping, NULL, batching and CREATE TABLE", () => {
    const t: Table = { columns: ["id", "name", "active"], rows: [["1", "O'Neil", "true"], ["2", "", "false"]] }
    expect(serialize(t, "sql", { tableName: "users", emptyAsNull: true })).toBe("INSERT INTO `users` (`id`, `name`, `active`) VALUES\n  (1, 'O''Neil', TRUE),\n  (2, NULL, FALSE);")
    expect(serialize(t, "sql", { dialect: "postgres", multiRow: false }).split("\n")[0]).toBe(`INSERT INTO "my_table" ("id", "name", "active") VALUES (1, 'O''Neil', TRUE);`)
    expect(serialize(t, "sql", { dialect: "mssql", createTable: true })).toContain("CREATE TABLE [my_table] (\n  [id] INT,\n  [name] NVARCHAR(9),\n  [active] BIT\n);")
    expect(sqlColumnType(["1.5", "2"], "postgres")).toBe("DECIMAL(18,6)")
    expect(sqlColumnType(["3000000000"], "mysql")).toBe("BIGINT")
  })

  it("YAML quotes values that would change meaning", () => {
    expect(["yes", "01310", "a: b", "", "#x", "plain text", "null"].map(yamlScalar)).toEqual(['"yes"', '"01310"', '"a: b"', '""', '"#x"', "plain text", '"null"'])
    expect(serialize(people, "yaml")).toBe("- name: Ana\n  age: 30\n  city: São Paulo\n- name: Bruno\n  age: 25\n  city: Recife")
  })

  it("XML: valid element names and escaping", () => {
    const out = serialize({ columns: ["first name", "1st", "x"], rows: [["<A&B>", "", "ok"]] }, "xml")
    expect(out).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n  <row>\n    <first_name>&lt;A&amp;B&gt;</first_name>\n    <_1st/>\n    <x>ok</x>\n  </row>\n</rows>')
  })

  it("ASCII box table right-aligns numeric columns and handles wide characters", () => {
    expect(serialize({ columns: ["k", "n"], rows: [["日本", "5"], ["a", "10"]] }, "ascii", { asciiStyle: "ascii" })).toBe(["+------+----+", "| k    | n  |", "+------+----+", "| 日本 |  5 |", "| a    | 10 |", "+------+----+"].join("\n"))
  })

  it("HTML and LaTeX escape special characters", () => {
    expect(serialize({ columns: ["a"], rows: [["<b>"]] }, "html", { pretty: false })).toBe("<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>&lt;b&gt;</td></tr></tbody></table>")
    expect(serialize({ columns: ["50%"], rows: [["a_b & c"]] }, "latex")).toBe("\\begin{tabular}{|l|}\n  \\hline\n  50\\% \\\\\n  \\hline\n  a\\_b \\& c \\\\\n  \\hline\n\\end{tabular}")
  })
})

describe("round trips", () => {
  const formats = ["csv", "json", "markdown", "html"] as const
  it.each(formats)("SAMPLE → %s → table is lossless", (format) => {
    const original = parseTable(SAMPLE).table
    const text = serialize(original, format, { types: false })
    expect(parseTable(text).table).toEqual(original)
  })

  it("convertTable wires parse, transform and serialize", () => {
    const { parsed, output } = convertTable("a;b\n2;x\n1;y", { to: "csv", sortBy: 0 })
    expect(parsed).toMatchObject({ format: "csv", delimiter: "semicolon" })
    expect(output).toBe("a,b\n1,y\n2,x")
    expect(convertTable("", { to: "sql" }).output).toBe("")
  })
})
