// ZIP mínimo para o .xlsx: grava sem compressão (STORE) e lê STORE ou DEFLATE.
// A descompressão usa o DecompressionStream nativo (navegadores atuais e Node 18+), sem dependências.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  name: string
  data: Uint8Array
}

// Data fixa (1980-01-01) para o mesmo conteúdo gerar sempre os mesmos bytes
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1

export function zip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // nomes em UTF-8
    lv.setUint16(8, 0, true) // STORE
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, entry.data.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local, entry.data)
    centrals.push(central)
    offset += local.length + entry.data.length
  }
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + end.length)
  let position = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, position)
    position += part.length
  }
  return out
}

export class ZipError extends Error {}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Índice do arquivo: nome → função que devolve o conteúdo (só descompacta o que for pedido)
export function unzip(bytes: Uint8Array): Map<string, () => Promise<Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new ZipError("not a ZIP file")
  const count = view.getUint16(end + 10, true)
  let position = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const files = new Map<string, () => Promise<Uint8Array>>()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(position, true) !== 0x02014b50) throw new ZipError("corrupted central directory")
    const method = view.getUint16(position + 10, true)
    const compressed = view.getUint32(position + 20, true)
    const nameLength = view.getUint16(position + 28, true)
    const extraLength = view.getUint16(position + 30, true)
    const commentLength = view.getUint16(position + 32, true)
    const local = view.getUint32(position + 42, true)
    const name = decoder.decode(bytes.subarray(position + 46, position + 46 + nameLength))
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const data = bytes.subarray(start, start + compressed)
    files.set(name, async () => {
      if (method === 0) return data
      if (method === 8) return inflateRaw(data)
      throw new ZipError(`unsupported compression method ${method}`)
    })
    position += 46 + nameLength + extraLength + commentLength
  }
  return files
}
