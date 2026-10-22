import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { diffInline, diffTexts, JsonInputError, myers, unifiedPatch } from "./diff"

// aplica as operações de Myers e confere que transformam a em b
const apply = (a: string[], b: string[]) =>
  myers(a, b)
    .filter((op) => op.type !== "delete")
    .map((op) => (op.type === "equal" ? a[op.a] : b[op.b]))

describe("myers", () => {
  it.each([
    [[], []],
    [["a"], []],
    [[], ["a"]],
    [["a", "b", "c"], ["a", "b", "c"]],
    ["ABCABBA".split(""), "CBABAC".split("")],
    [["x", "y"], ["y", "x"]],
  ])("rebuilds b from %j → %j", (a, b) => {
    expect(apply(a, b)).toEqual(b)
  })

  it("is minimal on the classic example (D = 5)", () => {
    const ops = myers("ABCABBA".split(""), "CBABAC".split(""))
    expect(ops.filter((op) => op.type !== "equal")).toHaveLength(5)
  })
})

describe("diffInline", () => {
  it("marks only the changed characters", () => {
    const { a, b } = diffInline("const total = 10", "const total = 12")
    expect(a.filter((s) => s.changed).map((s) => s.text)).toEqual(["0"])
    expect(b.filter((s) => s.changed).map((s) => s.text)).toEqual(["2"])
  })

  it("can work by words", () => {
    const { a, b } = diffInline("the quick brown fox", "the slow brown fox", "word")
    expect(a.filter((s) => s.changed).map((s) => s.text)).toEqual(["quick"])
    expect(b.filter((s) => s.changed).map((s) => s.text)).toEqual(["slow"])
  })
})

describe("diffTexts", () => {
  it("counts lines and characters", () => {
    const result = diffTexts("one\ntwo\nthree", "one\n2wo\nthree\nfour")
    expect(result.stats).toMatchObject({ linesEqual: 2, linesModified: 1, linesAdded: 1, linesRemoved: 0, linesDifferent: 2, charsAdded: 1 + 4, charsRemoved: 1 })
    expect(result.rows.map((r) => r.type)).toEqual(["equal", "modified", "equal", "insert"])
    expect(result.stats.similarity).toBeGreaterThan(0.6)
  })

  it("identical texts have similarity 1", () => {
    const result = diffTexts("a\nb", "a\nb")
    expect(result.identical).toBe(true)
    expect(result.stats.similarity).toBe(1)
  })

  it("can ignore whitespace, case and line endings", () => {
    expect(diffTexts("Hello  World", "hello world").identical).toBe(false)
    expect(diffTexts("Hello  World", "hello world", { ignoreCase: true, ignoreWhitespace: true }).identical).toBe(true)
    expect(diffTexts("a\r\nb", "a\nb", { ignoreLineEndings: true }).identical).toBe(true)
  })

  it("detects JSON that only differs in key order", () => {
    const a = '{"name":"Ana","age":30,"address":{"city":"POA","zip":"90000"}}'
    const b = '{"age":30,"address":{"zip":"90000","city":"POA"},"name":"Ana"}'
    const formatted = diffTexts(a, b, { json: "format" })
    expect(formatted.identical).toBe(false)
    expect(formatted.onlyOrderDiffers).toBe(true)
    const sorted = diffTexts(a, b, { json: "sortKeys" })
    expect(sorted.identical).toBe(true)
    expect(sorted.onlyOrderDiffers).toBe(true)
    // diferença real continua aparecendo com as chaves ordenadas
    const real = diffTexts(a, b.replace("30", "31"), { json: "sortKeys" })
    expect(real.onlyOrderDiffers).toBe(false)
    expect(real.stats.linesModified).toBe(1)
  })

  it("detects lines that only differ in order", () => {
    expect(diffTexts("b=2\na=1", "a=1\nb=2", { sortLines: true })).toMatchObject({ identical: true, onlyOrderDiffers: true })
  })

  it("reports which side has invalid JSON", () => {
    expect(() => diffTexts("{}", "{oops", { json: "format" })).toThrow(JsonInputError)
    try {
      diffTexts("{}", "{oops", { json: "format" })
    } catch (error) {
      expect((error as JsonInputError).side).toBe("b")
    }
  })
})

describe("unifiedPatch", () => {
  it("produces a patch that `patch` applies to get B back", () => {
    const a = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n"
    const bLines = a.trimEnd().split("\n")
    bLines.splice(2, 1, "line three")
    bLines.splice(15, 0, "inserted")
    bLines.splice(27, 1)
    const b = bLines.join("\n") + "\n"
    const patch = unifiedPatch(diffTexts(a.trimEnd(), b.trimEnd()), 3, ["a.txt", "b.txt"])
    expect(patch).toContain("@@ -1,6 +1,6 @@")
    const dir = mkdtempSync(join(tmpdir(), "diff-"))
    writeFileSync(join(dir, "a.txt"), a)
    writeFileSync(join(dir, "fix.diff"), patch)
    execFileSync("patch", ["-s", join(dir, "a.txt"), join(dir, "fix.diff")])
    expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe(b)
  })

  it("is empty for identical texts", () => {
    expect(unifiedPatch(diffTexts("x", "x"))).toBe("")
  })
})
