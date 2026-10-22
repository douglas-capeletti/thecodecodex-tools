import { secureRandom, type Random } from "./random/index"

export const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%&*()-_=+[]{};:,.?/",
} as const

export type Charset = keyof typeof CHARSETS
// Caracteres fáceis de confundir ao ler/digitar
const AMBIGUOUS = /[Il1O0o]/g

export interface PasswordOptions {
  length: number
  sets: Charset[]
  excludeAmbiguous?: boolean
}

function alphabetFor(set: Charset, excludeAmbiguous: boolean): string {
  return excludeAmbiguous ? CHARSETS[set].replace(AMBIGUOUS, "") : CHARSETS[set]
}

export function generatePassword({ length, sets, excludeAmbiguous = false }: PasswordOptions, random: Random = secureRandom): string {
  const active = sets.length > 0 ? sets : (["lower"] as Charset[])
  const alphabets = active.map((set) => alphabetFor(set, excludeAmbiguous))
  const all = alphabets.join("")
  const size = Math.max(length, alphabets.length)
  // um caractere de cada conjunto escolhido, o resto aleatório, depois embaralha (Fisher–Yates)
  const chars = [...alphabets.map((a) => a[random(a.length)] ?? ""), ...Array.from({ length: size - alphabets.length }, () => all[random(all.length)] ?? "")]
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1)
    ;[chars[i], chars[j]] = [chars[j] ?? "", chars[i] ?? ""]
  }
  return chars.join("")
}

// Entropia em bits assumindo escolha uniforme no alfabeto completo
export function entropyBits({ length, sets, excludeAmbiguous = false }: PasswordOptions): number {
  const size = (sets.length > 0 ? sets : (["lower"] as Charset[])).reduce((acc, set) => acc + alphabetFor(set, excludeAmbiguous).length, 0)
  return Math.round(length * Math.log2(size))
}

export type Strength = "weak" | "fair" | "strong" | "very-strong"

export function strength(bits: number): Strength {
  if (bits < 50) return "weak"
  if (bits < 70) return "fair"
  if (bits < 100) return "strong"
  return "very-strong"
}
