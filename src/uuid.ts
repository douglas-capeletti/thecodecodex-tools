// UUID v4 (aleatório) e v7 (ordenável por tempo, RFC 9562)
export type UuidVersion = 4 | 7

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function format(raw: string): string {
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
}

export function uuidV4(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(16))): string {
  const b = Uint8Array.from(bytes)
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80
  return format(hex(b))
}

export function uuidV7(timestamp: number = Date.now(), bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(10))): string {
  const b = new Uint8Array(16)
  // 48 bits de milissegundos desde a época Unix
  let ms = timestamp
  for (let i = 5; i >= 0; i--) {
    b[i] = ms % 256
    ms = Math.floor(ms / 256)
  }
  b.set(bytes.slice(0, 10), 6)
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80
  return format(hex(b))
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface UuidInfo {
  valid: boolean
  version?: number
  timestamp?: Date
}

export function inspectUuid(value: string): UuidInfo {
  const uuid = value.trim()
  if (!UUID_PATTERN.test(uuid)) return { valid: false }
  const version = parseInt(uuid[14] ?? "0", 16)
  const info: UuidInfo = { valid: true, version }
  if (version === 7) info.timestamp = new Date(parseInt(uuid.replace(/-/g, "").slice(0, 12), 16))
  return info
}

export function formatUuid(uuid: string, { uppercase = false, hyphens = true } = {}): string {
  const value = hyphens ? uuid : uuid.replace(/-/g, "")
  return uppercase ? value.toUpperCase() : value
}
