import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { cltYear } from "../finance/clt"
import { bestRegime, compareRegimes } from "../finance/pj"
import { convertTable } from "../table-convert"
import { execute, parseArgs } from "./main"
import { TOOLS } from "./tools"

const run = async (tool: string, query = "") => {
  const result = await execute(tool, new URLSearchParams(query))
  if (!("text" in result)) throw new Error("expected JSON")
  return JSON.parse(result.text) as { tool: string, result: Record<string, unknown> }
}

describe("argument parsing", () => {
  it("reads the tool and params from the script URL (Deno)", () => {
    const { tool, params } = parseArgs("https://thecodecodex.com/cli.js?tool=net-salary&bruto=8000", [])
    expect(tool).toBe("net-salary")
    expect(params.get("bruto")).toBe("8000")
    expect(params.has("tool")).toBe(false)
  })

  it("reads positional, key=value and --key value arguments (Node)", () => {
    const { tool, params } = parseArgs("file:///cli.js", ["cpf", "q=3", "--uf", "SP", "--mask=0", "--flag"])
    expect(tool).toBe("cpf")
    expect(Object.fromEntries(params)).toEqual({ q: "3", uf: "SP", mask: "0", flag: "1" })
  })
})

describe("cli tools", () => {
  it("runs every tool with its defaults", async () => {
    for (const name of Object.keys(TOOLS)) {
      const query = name === "jwt" ? "token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.sig" : ""
      const result = await execute(name, new URLSearchParams(query))
      expect("text" in result || "bytes" in result, name).toBe(true)
    }
  })

  it("prints help without a tool", async () => {
    const result = await execute(undefined, new URLSearchParams())
    expect("text" in result && JSON.parse(result.text).tools["net-salary"]).toBeTruthy()
  })

  it("rejects unknown tools and invalid params", async () => {
    await expect(execute("nope", new URLSearchParams())).rejects.toThrow("desconhecida")
    await expect(execute("cnpj", new URLSearchParams("kind=xyz"))).rejects.toThrow("kind=xyz")
  })
})

describe("same results as the site", () => {
  it("net salary", async () => {
    const out = await run("net-salary", "bruto=8000&dependentes=1&vt=300")
    expect(out.result["result"]).toEqual(JSON.parse(JSON.stringify(cltYear(8000, { dependents: 1, transportVoucher: 300, alimony: 0, otherDiscounts: 0, monthlyBenefits: 0, annualBonus: 0, includeFgts: true }))))
  })

  it("PJ taxes", async () => {
    const out = await run("pj-taxes", "faturamento=10000&contador=0")
    expect(out.result["best"]).toBe(bestRegime(compareRegimes({ monthlyRevenue: 10_000, proLabore: 1621, issRate: 0.02, accountant: 0, otherExpenses: 0 }))?.regime)
  })

  it("CPF validation uses the site's algorithm", async () => {
    const out = await run("cpf", "v=529.982.247-25")
    expect(out.result["validation"]).toMatchObject({ valid: true, formatted: "529.982.247-25" })
  })

  it("table converter takes the share-link params", async () => {
    const input = "id;name\n2;Bia\n1;Ana"
    const out = await run("table-convert", new URLSearchParams({ in: input, to: "sql", tbl: "users", sort: "0" }).toString())
    expect(out.result["output"]).toBe(convertTable(input, { to: "sql", tableName: "users", sortBy: 0 }).output)
    expect(out.result["detected"]).toEqual({ format: "csv", delimiter: "semicolon" })
  })

  it("table converter writes .xlsx bytes", async () => {
    const result = await execute("table-convert", new URLSearchParams({ in: "a,b\n1,2", to: "xlsx" }))
    if (!("bytes" in result)) throw new Error("expected a file")
    expect(Array.from(result.bytes.slice(0, 2))).toEqual([0x50, 0x4b])
  })

  it("invoice renders a PDF from the share-link JSON", async () => {
    const invoice = JSON.stringify({ number: "INV-9", currency: "USD", items: [{ description: "Dev", quantity: 2, unitPrice: 50 }] })
    const result = await execute("invoice", new URLSearchParams({ invoice }))
    if (!("bytes" in result)) throw new Error("expected PDF")
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(1)
    const json = await run("invoice", new URLSearchParams({ invoice, format: "json" }).toString())
    expect(json.result["totals"]).toMatchObject({ total: 100 })
  })

  it("pdf-studio filters pages, stamps watermarks and outputs PDF or JSON", async () => {
    const result = await execute("pdf-studio", new URLSearchParams({ pages: "1-2,4", wm: "DRAFT", num: "1" }))
    if (!("bytes" in result)) throw new Error("expected PDF")
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(3)
    const json = await run("pdf-studio", new URLSearchParams({ pages: "1-2", format: "json" }).toString())
    expect(json.result["inspection"]).toMatchObject({ pageCount: 2 })
  })

  it("image-to-pdf converts images into a PDF and returns layouts as JSON", async () => {
    const result = await execute("image-to-pdf", new URLSearchParams({ size: "letter", margin: "36" }))
    if (!("bytes" in result)) throw new Error("expected PDF")
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(3)
    const json = await run("image-to-pdf", new URLSearchParams({ size: "a4", format: "json" }).toString())
    expect(json.result["pageCount"]).toBe(3)
  })

  it("regex and dev-ref run from CLI params", async () => {
    const rx = await run("regex", new URLSearchParams({ p: "(\\d+)", f: "g", text: "v12 and v34", repl: "#$1" }).toString())
    expect(rx.result["matchCount"]).toBe(2)
    expect(rx.result["replaced"]).toBe("v#12 and v#34")

    const ref = await run("dev-ref", new URLSearchParams({ sec: "ports", q: "5432" }).toString())
    expect(ref.result["totalMatches"]).toBe(1)
  })
})

describe("ai skills", () => {
  it("lists the catalog, prints a file and plans an install without writing", async () => {
    const list = await run("ai-skills")
    expect((list.result["skills"] as { name: string }[]).map((s) => s.name)).toContain("terraform-review")

    const printed = await execute("ai-skills", new URLSearchParams("name=terraform-review"))
    expect("text" in printed && printed.text.startsWith("---\nname: terraform-review")).toBe(true)
    const reference = await execute("ai-skills", new URLSearchParams("name=terraform-review&file=references/checklist.md"))
    expect("text" in reference && reference.text).toContain("# Terraform review checklist")

    const install = await execute("ai-skills", new URLSearchParams("name=terraform-review&install=1&dir=tmp/skills"))
    if (!("text" in install) || !install.write) throw new Error("expected files to write")
    expect(install.write.map((f) => f.path)).toEqual(["tmp/skills/terraform-review/SKILL.md", "tmp/skills/terraform-review/references/checklist.md"])
  })

  it("rejects unknown skills and files", async () => {
    await expect(execute("ai-skills", new URLSearchParams("name=nope"))).rejects.toThrow("Skill desconhecida")
    await expect(execute("ai-skills", new URLSearchParams("name=terraform-review&file=x.md"))).rejects.toThrow("Arquivo desconhecido")
    await expect(execute("ai-skills", new URLSearchParams("name=all"))).rejects.toThrow("install=1")
  })
})
