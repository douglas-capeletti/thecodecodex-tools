// Conversão de parâmetros de URL compartilhada pelo site (useUrlState) e pelo script de terminal (src/cli)
// Converte um valor de estado de/para texto na URL; `parse` devolve undefined para valores inválidos
export interface UrlCodec<T> {
  parse: (raw: string) => T | undefined
  format: (value: T) => string
}

export const codec = {
  string: { parse: (raw) => raw, format: (value) => value } satisfies UrlCodec<string>,
  number: { parse: (raw) => (raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : undefined), format: String } satisfies UrlCodec<number>,
  boolean: { parse: (raw) => (raw === "1" ? true : raw === "0" ? false : undefined), format: (value) => (value ? "1" : "0") } satisfies UrlCodec<boolean>,
  oneOf<T extends string | number>(options: readonly T[]): UrlCodec<T> {
    return { parse: (raw) => options.find((option) => String(option) === raw), format: String }
  },
  // listas: valores separados por vírgula
  list<T>(item: UrlCodec<T>): UrlCodec<T[]> {
    return {
      parse: (raw) => {
        const items = raw.split(",").map((part) => item.parse(part))
        return items.every((value) => value !== undefined) ? (items as T[]) : undefined
      },
      format: (values) => values.map(item.format).join(","),
    }
  },
}
