import { secureRandom, type Random } from "../random/index"

// CNPJ alfanumérico (IN RFB nº 2.229/2024): raiz e ordem aceitam [0-9A-Z]; os dígitos verificadores
// seguem numéricos. Cada caractere vale (código ASCII − 48), então o cálculo é o mesmo do CNPJ numérico.
const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

function charValue(char: string): number {
  return char.charCodeAt(0) - 48
}

function checkDigit(chars: string): number {
  const weights = WEIGHTS.slice(WEIGHTS.length - chars.length)
  const sum = [...chars].reduce((acc, char, i) => acc + charValue(char) * (weights[i] ?? 0), 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function cnpjCheckDigits(base: string): string {
  const first = checkDigit(base)
  const second = checkDigit(base + first)
  return `${first}${second}`
}

export type CnpjKind = "numeric" | "alphanumeric"

export function generateCnpj({ kind = "numeric", branch = "0001", random = secureRandom }: { kind?: CnpjKind, branch?: string, random?: Random } = {}): string {
  const alphabet = kind === "alphanumeric" ? ALPHANUMERIC : ALPHANUMERIC.slice(0, 10)
  let root: string
  do {
    root = Array.from({ length: 8 }, () => alphabet[random(alphabet.length)]).join("")
    // garante ao menos uma letra no alfanumérico, senão é só um CNPJ numérico
  } while (/^(.)\1+$/.test(root) || (kind === "alphanumeric" && !/[A-Z]/.test(root)))
  const base = root + branch
  return base + cnpjCheckDigits(base)
}

export function stripCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "")
}

export function formatCnpj(value: string): string {
  const chars = stripCnpj(value)
  return chars.length === 14 ? chars.replace(/(.{2})(.{3})(.{3})(.{4})(.{2})/, "$1.$2.$3/$4-$5") : value
}

export function isValidCnpj(value: string): boolean {
  const chars = stripCnpj(value)
  if (!/^[0-9A-Z]{12}\d{2}$/.test(chars) || /^(.)\1+$/.test(chars)) return false
  return cnpjCheckDigits(chars.slice(0, 12)) === chars.slice(12)
}

export function cnpjKind(value: string): CnpjKind {
  return /[A-Z]/.test(stripCnpj(value).slice(0, 12)) ? "alphanumeric" : "numeric"
}
