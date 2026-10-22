// Fonte de aleatoriedade injetável: usa crypto no navegador e permite valores fixos nos testes
export type Random = (max: number) => number

// Inteiro uniforme em [0, max) sem viés de módulo (rejection sampling sobre Uint32)
export const secureRandom: Random = (max) => {
  if (max <= 0) return 0
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0] ?? 0
  } while (value >= limit)
  return value % max
}

export function pick<T>(items: readonly T[], random: Random = secureRandom): T {
  return items[random(items.length)] as T
}
