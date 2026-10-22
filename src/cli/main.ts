// Ponto de entrada de thecodecodex.com/cli.js. Uso:
//   deno run "https://thecodecodex.com/cli.js?tool=net-salary&bruto=8000"
//   curl -s https://thecodecodex.com/cli.js | node --input-type=module - net-salary bruto=8000
// Parâmetros: da query string da URL do script (Deno) e/ou argumentos (`tool chave=valor` ou `--chave valor`).
import { TOOLS, type Params } from "./tools"

declare const Deno: { args: string[], stdout: { write(data: Uint8Array): Promise<number> }, exit(code: number): never } | undefined
declare const process: { argv: string[], stdout: { write(data: Uint8Array | string): boolean }, exitCode?: number } | undefined

export const SITE = "https://thecodecodex.com"

export function parseArgs(url: string, args: string[]): { tool: string | undefined, params: Params } {
  const params = new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "")
  let tool = params.get("tool") ?? undefined
  params.delete("tool")
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ""
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split(/=(.*)/s)
      const value = inline ?? (args[i + 1] && !args[i + 1]?.startsWith("--") ? args[++i] : "1")
      if (key === "tool") tool = value
      else if (key) params.set(key, value ?? "")
    } else if (arg.includes("=")) {
      const [key = "", value = ""] = arg.split(/=(.*)/s)
      if (key === "tool") tool = value
      else params.set(key, value)
    } else if (!tool) tool = arg
  }
  return { tool, params }
}

export function help(): unknown {
  return {
    usage: [`deno run "${SITE}/cli.js?tool=<ferramenta>&<parametro>=<valor>"`, `curl -s ${SITE}/cli.js | node --input-type=module - <ferramenta> <parametro>=<valor>`],
    note: "Os parâmetros são os mesmos da URL da ferramenta no site: copie o link de compartilhamento e troque o endereço.",
    tools: Object.fromEntries(Object.entries(TOOLS).map(([name, tool]) => [name, { description: tool.description, params: Object.fromEntries(tool.params.map((p) => [p.name, `${p.description} (padrão: ${p.default || "—"})`])) }])),
  }
}

export type ExecuteResult = { text: string, write?: FileToWrite[] } | { bytes: Uint8Array }
export interface FileToWrite {
  path: string
  content: string
}

export async function execute(tool: string | undefined, params: Params): Promise<ExecuteResult> {
  if (!tool || tool === "help") return { text: JSON.stringify(help(), null, 2) }
  const definition = TOOLS[tool]
  if (!definition) throw new Error(`Ferramenta desconhecida: ${tool}. Rode sem parâmetros para ver a lista.`)
  const output = await definition.run(params)
  if ("pdf" in output) return { bytes: output.pdf }
  if ("file" in output) return { bytes: output.file }
  if ("text" in output) return { text: output.text }
  const text = JSON.stringify({ tool, input: Object.fromEntries(params), result: output.json }, null, 2)
  return "write" in output ? { text, write: output.write } : { text }
}

// Grava arquivos com node:fs (Node, Bun e Deno entendem o prefixo node:; no Deno exige --allow-write).
// Import dinâmico com especificador em variável: o bundle "neutral" não tenta resolver módulos do Node.
interface NodeFs {
  mkdir(path: string, options: { recursive: boolean }): Promise<unknown>
  writeFile(path: string, data: string): Promise<void>
}
async function writeFiles(files: FileToWrite[]) {
  const fsModule = "node:fs/promises"
  const fs = (await import(/* @vite-ignore */ fsModule)) as NodeFs
  for (const file of files) {
    const folder = file.path.slice(0, Math.max(file.path.lastIndexOf("/"), 0))
    if (folder) await fs.mkdir(folder, { recursive: true })
    await fs.writeFile(file.path, file.content)
  }
}

export async function main() {
  const isDeno = typeof Deno !== "undefined"
  const args = isDeno ? Deno.args : (process?.argv.slice(2) ?? []).filter((a) => a !== "-")
  const write = async (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? new TextEncoder().encode(`${data}\n`) : data
    if (isDeno) await Deno.stdout.write(bytes)
    else process?.stdout.write(bytes)
  }
  try {
    const { tool, params } = parseArgs(import.meta.url, args)
    const result = await execute(tool, params)
    if ("write" in result && result.write) await writeFiles(result.write)
    await write("text" in result ? result.text : result.bytes)
  } catch (error) {
    await write(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2))
    if (isDeno) Deno.exit(1)
    else if (process) process.exitCode = 1
  }
}

