import { describe, expect, it } from "vitest"
import { DEMOS, DEMO_IDS, demoCss, findDemo, initialValues, localizeComments, normalizeValues, previewDocument, variablesCss } from "./css-playground"

describe("css playground demos", () => {
  it("have unique ids", () => {
    expect(new Set(DEMO_IDS).size).toBe(DEMOS.length)
  })

  it("use every control as a CSS variable", () => {
    for (const demo of DEMOS) for (const control of demo.controls) expect(demo.css, `${demo.id} --${control.name}`).toContain(`var(--${control.name})`)
  })

  it("start with valid control values", () => {
    for (const demo of DEMOS) expect(normalizeValues(demo, initialValues(demo))).toEqual(initialValues(demo))
  })

  it("translate every comment and leave no separator behind", () => {
    for (const demo of DEMOS) {
      for (const lang of ["pt", "en"] as const) expect(demoCss(demo, lang)).not.toContain("||")
    }
    expect(localizeComments("a { } /* oi || hi */", "en")).toBe("a { } /* hi */")
    expect(localizeComments("a { } /* oi || hi */", "pt")).toBe("a { } /* oi */")
  })
})

describe("control values", () => {
  const flexbox = findDemo("flexbox")

  it("falls back to the first demo for unknown ids", () => {
    expect(findDemo("nope").id).toBe(DEMOS[0]?.id)
  })

  it("replaces invalid or missing values with the defaults", () => {
    expect(normalizeValues(flexbox, ["column", "bogus", "center", "wrap", "999"])).toEqual(["column", "flex-start", "center", "wrap", "12"])
    expect(normalizeValues(flexbox, [])).toEqual(initialValues(flexbox))
    expect(normalizeValues(findDemo("color-mix"), ["red", "dark"])).toEqual(["#0e7490", "dark"])
  })

  it("writes the variables with units", () => {
    expect(variablesCss(flexbox, ["row", "center", "stretch", "nowrap", "24"])).toContain("--gap: 24px;")
    expect(variablesCss(findDemo("container"), [])).toBe("")
  })
})

describe("preview document", () => {
  it("contains the html, the variables and the css", () => {
    const demo = findDemo("grid")
    const doc = previewDocument({ demo, css: ".x { color: red; }", values: ["200", "8"], lang: "en", warning: "w" })
    expect(doc).toContain('<div class="cards">')
    expect(doc).toContain("--min: 200px;")
    expect(doc).toContain(".x { color: red; }")
    expect(doc).not.toContain("css-playground-warning\">")
  })

  it("adds the unsupported warning only for demos with a feature check", () => {
    const doc = previewDocument({ demo: findDemo("field-sizing"), css: "", values: [], lang: "pt", warning: "sem suporte" })
    expect(doc).toContain("@supports not (field-sizing: content)")
    expect(doc).toContain("sem suporte")
  })

  it("does not let edited css close the style tag", () => {
    const doc = previewDocument({ demo: findDemo("flexbox"), css: "</style><script>alert(1)</script>", values: [], lang: "en", warning: "" })
    expect(doc).not.toContain("</style><script>")
  })
})
