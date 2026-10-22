// Codificação de texto UTF-8 (acentos e emojis) — btoa/atob puros só aceitam Latin-1
export type Codec = "base64" | "base64url" | "url"
export type Direction = "encode" | "decode"

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function encode(text: string, codec: Codec): string {
  if (codec === "url") return encodeURIComponent(text)
  const base64 = bytesToBase64(new TextEncoder().encode(text))
  return codec === "base64url" ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : base64
}

export function decode(text: string, codec: Codec): string {
  if (codec === "url") return decodeURIComponent(text.replace(/\+/g, " "))
  let value = text.trim().replace(/\s/g, "")
  if (codec === "base64url") value = value.replace(/-/g, "+").replace(/_/g, "/")
  value = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=")
  return new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(value))
}

export function convert(text: string, codec: Codec, direction: Direction): { ok: true, value: string } | { ok: false } {
  try {
    return { ok: true, value: direction === "encode" ? encode(text, codec) : decode(text, codec) }
  } catch {
    return { ok: false }
  }
}
