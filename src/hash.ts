// Hashes via Web Crypto (nativo do navegador e do Node). MD5 não existe na Web Crypto por ser inseguro.
export const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const
export type Algorithm = (typeof ALGORITHMS)[number]

export async function hash(text: string, algorithm: Algorithm): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function hashAll(text: string): Promise<Record<Algorithm, string>> {
  const values = await Promise.all(ALGORITHMS.map((algorithm) => hash(text, algorithm)))
  return Object.fromEntries(ALGORITHMS.map((algorithm, i) => [algorithm, values[i] ?? ""])) as Record<Algorithm, string>
}
