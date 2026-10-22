import { describe, expect, it } from "vitest"
import { convert, decode, encode } from "./base64"
import { ASCII_TABLE, queryDevRef } from "./dev-ref"
import { hash, hashAll } from "./hash"
import { decodeJwt, isExpired } from "./jwt"
import { entropyBits, generatePassword, strength } from "./password"
import { evaluateRegex, normalizeFlags, REGEX_PRESETS } from "./regex"
import { detectUnit, parseTimestamp, relative, toUnix } from "./timestamp"
import { inspectUuid, uuidV4, uuidV7 } from "./uuid"

describe("password", () => {
  it("respects length and includes every selected charset", () => {
    for (let i = 0; i < 100; i++) {
      const value = generatePassword({ length: 12, sets: ["lower", "upper", "digits", "symbols"] })
      expect(value).toHaveLength(12)
      expect(value).toMatch(/[a-z]/)
      expect(value).toMatch(/[A-Z]/)
      expect(value).toMatch(/\d/)
      expect(value).toMatch(/[^a-zA-Z\d]/)
    }
  })

  it("can exclude ambiguous characters", () => {
    for (let i = 0; i < 100; i++) expect(generatePassword({ length: 40, sets: ["lower", "upper", "digits"], excludeAmbiguous: true })).not.toMatch(/[Il1O0o]/)
  })

  it("estimates entropy", () => {
    expect(entropyBits({ length: 16, sets: ["lower", "upper", "digits"] })).toBe(95)
    expect(strength(40)).toBe("weak")
    expect(strength(128)).toBe("very-strong")
  })
})

describe("uuid", () => {
  it("generates v4 and v7 with the right version and variant", () => {
    expect(inspectUuid(uuidV4())).toMatchObject({ valid: true, version: 4 })
    const v7 = uuidV7(1_700_000_000_000)
    expect(inspectUuid(v7)).toMatchObject({ valid: true, version: 7 })
    expect(inspectUuid(v7).timestamp?.getTime()).toBe(1_700_000_000_000)
    expect(v7[19]).toMatch(/[89ab]/)
  })

  it("v7 sorts by time", () => {
    expect(uuidV7(1000) < uuidV7(2000)).toBe(true)
  })

  it("rejects invalid input", () => {
    expect(inspectUuid("not-a-uuid").valid).toBe(false)
  })
})

describe("hash", () => {
  it("matches known SHA digests", async () => {
    expect(await hash("abc", "SHA-256")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    expect((await hashAll(""))["SHA-1"]).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709")
  })
})

describe("base64", () => {
  it("round-trips UTF-8 text", () => {
    expect(encode("ação ✓", "base64")).toBe("YcOnw6NvIOKckw==")
    expect(decode("YcOnw6NvIOKckw==", "base64")).toBe("ação ✓")
    expect(encode("ação ✓", "base64url")).toBe("YcOnw6NvIOKckw")
    expect(decode("YcOnw6NvIOKckw", "base64url")).toBe("ação ✓")
  })

  it("url-encodes and reports invalid input", () => {
    expect(encode("a b&c", "url")).toBe("a%20b%26c")
    expect(decode("a+b%26c", "url")).toBe("a b&c")
    expect(convert("%%%", "base64", "decode").ok).toBe(false)
  })
})

describe("jwt", () => {
  // header {"alg":"HS256","typ":"JWT"} · payload {"sub":"123","name":"João","iat":1516239022,"exp":1516242622}
  const token = `${encode('{"alg":"HS256","typ":"JWT"}', "base64url")}.${encode('{"sub":"123","name":"João","iat":1516239022,"exp":1516242622}', "base64url")}.sig`

  it("decodes header, payload and dates", () => {
    const result = decodeJwt(`Bearer ${token}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.jwt.header["alg"]).toBe("HS256")
    expect(result.jwt.payload["name"]).toBe("João")
    expect(result.jwt.expiresAt?.toISOString()).toBe("2018-01-18T02:30:22.000Z")
    expect(isExpired(result.jwt, new Date("2030-01-01"))).toBe(true)
  })

  it("reports malformed tokens", () => {
    expect(decodeJwt("abc")).toEqual({ ok: false, error: "format" })
    expect(decodeJwt("a.b.c")).toEqual({ ok: false, error: "json" })
  })
})

describe("timestamp", () => {
  it("detects the unit by magnitude", () => {
    expect(detectUnit(1_700_000_000)).toBe("s")
    expect(detectUnit(1_700_000_000_000)).toBe("ms")
    expect(parseTimestamp("1700000000")?.date.toISOString()).toBe("2023-11-14T22:13:20.000Z")
    expect(parseTimestamp("abc")).toBeUndefined()
  })

  it("converts back and describes relative time", () => {
    expect(toUnix(new Date("2023-11-14T22:13:20Z"))).toEqual({ seconds: 1_700_000_000, milliseconds: 1_700_000_000_000 })
    expect(relative(new Date("2024-01-01"), "en", new Date("2024-01-04"))).toBe("3 days ago")
  })
})

describe("regex", () => {
  it("extracts named groups, replaces with templates and explains tokens", () => {
    expect(normalizeFlags("migggz")).toBe("gim")
    const res = evaluateRegex("(?<year>\\d{4})-(?<month>\\d{2})", "g", "2026-10 and 2028-04", "$<month>/$<year>", "en")
    expect(res.ok).toBe(true)
    expect(res.matches).toHaveLength(2)
    expect(res.matches[0]?.groups).toEqual({ year: "2026", month: "10" })
    expect(res.replaced).toBe("10/2026 and 04/2028")
    expect(res.tokens.some((t) => t.token.includes("?<year>"))).toBe(true)
  })

  it("handles zero-length matches and reports invalid syntax", () => {
    const zero = evaluateRegex("^", "gm", "a\nb")
    expect(zero.ok).toBe(true)
    expect(zero.matches).toHaveLength(2)

    const invalid = evaluateRegex("[unclosed", "g", "abc")
    expect(invalid.ok).toBe(false)
    expect(invalid.error).toBeTruthy()
  })

  it("matches every validator/generator preset against its sample text", () => {
    for (const preset of REGEX_PRESETS) {
      const res = evaluateRegex(preset.pattern, preset.flags, preset.text, preset.replacement, "pt")
      expect(res.ok, preset.id).toBe(true)
      expect(res.matches.length, preset.id).toBeGreaterThanOrEqual(1)
    }
    const nfe = REGEX_PRESETS.find((p) => p.id === "nfe")!
    const nfeEval = evaluateRegex(nfe.pattern, nfe.flags, nfe.text, nfe.replacement)
    expect(nfeEval.matches[0]?.groups).toMatchObject({ uf: "35", aamm: "2610", mod: "55", dv: "0" })
  })
})

describe("dev-ref", () => {
  it("filters HTTP status codes, network ports, MIME types and ASCII codes", () => {
    expect(ASCII_TABLE).toHaveLength(128)
    expect(ASCII_TABLE[27]?.hex).toBe("0x1B")
    expect(ASCII_TABLE[27]?.symbol).toBe("ESC")

    const rateLimit = queryDevRef({ section: "http", query: "429" })
    expect(rateLimit.http).toHaveLength(1)
    expect(rateLimit.http[0]?.phrase).toBe("Too Many Requests")

    const pg = queryDevRef({ section: "ports", query: "5432" })
    expect(pg.ports[0]?.service).toBe("PostgreSQL")

    const problem = queryDevRef({ section: "mime", query: "problem+json" })
    expect(problem.mime[0]?.essence).toBe("application/problem+json")
  })
})
