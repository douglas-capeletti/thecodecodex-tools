import { secureRandom, type Random } from "../random/index"

// O 9º dígito do CPF indica a região fiscal de emissão
export const CPF_REGIONS: Record<string, number> = {
  RS: 0,
  DF: 1, GO: 1, MS: 1, MT: 1, TO: 1,
  AC: 2, AM: 2, AP: 2, PA: 2, RO: 2, RR: 2,
  CE: 3, MA: 3, PI: 3,
  AL: 4, PB: 4, PE: 4, RN: 4,
  BA: 5, SE: 5,
  MG: 6,
  ES: 7, RJ: 7,
  SP: 8,
  PR: 9, SC: 9,
}

function checkDigit(digits: number[]): number {
  const weightStart = digits.length + 1
  const sum = digits.reduce((acc, digit, i) => acc + digit * (weightStart - i), 0)
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

export function cpfCheckDigits(base: string): string {
  const digits = [...base].map(Number)
  const first = checkDigit(digits)
  const second = checkDigit([...digits, first])
  return `${first}${second}`
}

export function generateCpf({ uf, random = secureRandom }: { uf?: string | undefined, random?: Random } = {}): string {
  const region = uf ? CPF_REGIONS[uf] : undefined
  let base: string
  do {
    base = Array.from({ length: 8 }, () => random(10)).join("") + String(region ?? random(10))
  } while (/^(\d)\1+$/.test(base))
  return base + cpfCheckDigits(base)
}

export function stripCpf(value: string): string {
  return value.replace(/\D/g, "")
}

export function formatCpf(value: string): string {
  const digits = stripCpf(value)
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : value
}

export function isValidCpf(value: string): boolean {
  const digits = stripCpf(value)
  // sequências repetidas (111.111.111-11) passam no cálculo mas são inválidas
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  return cpfCheckDigits(digits.slice(0, 9)) === digits.slice(9)
}

export function cpfRegion(value: string): string[] {
  const digits = stripCpf(value)
  if (digits.length < 9) return []
  const region = Number(digits[8])
  return Object.entries(CPF_REGIONS).filter(([, r]) => r === region).map(([uf]) => uf)
}
