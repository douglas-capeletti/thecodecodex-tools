import { decode } from "./base64"

// Apenas decodifica: a assinatura NÃO é verificada (isso exige a chave do emissor)
export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  issuedAt?: Date
  expiresAt?: Date
  notBefore?: Date
}

export type JwtResult = { ok: true, jwt: DecodedJwt } | { ok: false, error: "format" | "json" }

function part(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(decode(value, "base64url"))
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new SyntaxError("not an object")
  return parsed as Record<string, unknown>
}

const date = (value: unknown) => (typeof value === "number" ? new Date(value * 1000) : undefined)

export function decodeJwt(token: string): JwtResult {
  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".")
  if (parts.length !== 3 || parts.some((p, i) => i < 2 && !p)) return { ok: false, error: "format" }
  try {
    const header = part(parts[0] ?? "")
    const payload = part(parts[1] ?? "")
    const jwt: DecodedJwt = { header, payload, signature: parts[2] ?? "" }
    const iat = date(payload["iat"])
    const exp = date(payload["exp"])
    const nbf = date(payload["nbf"])
    if (iat) jwt.issuedAt = iat
    if (exp) jwt.expiresAt = exp
    if (nbf) jwt.notBefore = nbf
    return { ok: true, jwt }
  } catch {
    return { ok: false, error: "json" }
  }
}

export function isExpired(jwt: DecodedJwt, now: Date = new Date()): boolean | undefined {
  return jwt.expiresAt ? jwt.expiresAt.getTime() < now.getTime() : undefined
}
