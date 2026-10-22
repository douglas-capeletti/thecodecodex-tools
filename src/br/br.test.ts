import { describe, expect, it } from "vitest"
import { cnpjCheckDigits, cnpjKind, formatCnpj, generateCnpj, isValidCnpj } from "./cnpj"
import { cpfRegion, formatCpf, generateCpf, isValidCpf } from "./cpf"

describe("CPF", () => {
  it("validates known documents", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true)
    expect(isValidCpf("52998224725")).toBe(true)
    expect(isValidCpf("529.982.247-24")).toBe(false)
    expect(isValidCpf("111.111.111-11")).toBe(false)
    expect(isValidCpf("123")).toBe(false)
  })

  it("generates valid documents, optionally for a state", () => {
    for (let i = 0; i < 200; i++) expect(isValidCpf(generateCpf())).toBe(true)
    const sp = generateCpf({ uf: "SP" })
    expect(sp[8]).toBe("8")
    expect(cpfRegion(sp)).toContain("SP")
  })

  it("formats", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25")
  })
})

describe("CNPJ", () => {
  it("validates known numeric documents", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true)
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false)
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false)
  })

  it("validates the official alphanumeric example (Receita Federal)", () => {
    expect(cnpjCheckDigits("12ABC34501DE")).toBe("35")
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true)
    expect(isValidCnpj("12.abc.345/01de-35")).toBe(true)
    expect(isValidCnpj("12.ABC.345/01DE-36")).toBe(false)
    expect(cnpjKind("12.ABC.345/01DE-35")).toBe("alphanumeric")
  })

  it("generates valid numeric and alphanumeric documents", () => {
    for (let i = 0; i < 200; i++) {
      expect(isValidCnpj(generateCnpj())).toBe(true)
      const alpha = generateCnpj({ kind: "alphanumeric" })
      expect(isValidCnpj(alpha)).toBe(true)
      expect(cnpjKind(alpha)).toBe("alphanumeric")
    }
  })

  it("formats", () => {
    expect(formatCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35")
  })
})
