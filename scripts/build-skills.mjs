// Gera src/skills.json a partir de skills/<nome>/ (formato Agent Skills: https://agentskills.io/specification).
// O site (catálogo e arquivos em /skills/) e o cli.js leem o mesmo manifesto; o teste src/skills.test.ts
// falha se o JSON ficar desatualizado em relação às pastas.
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/

const unquote = (value) => {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

// Frontmatter mínimo: chaves de primeiro nível com valor numa linha e um nível de mapa (metadata)
export function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown)
  if (!match) throw new Error("SKILL.md sem frontmatter YAML")
  const data = {}
  let map = null
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue
    const nested = /^\s+([\w.-]+):\s*(.*)$/.exec(line)
    if (nested && map) {
      map[nested[1]] = unquote(nested[2])
      continue
    }
    const top = /^([\w-]+):\s*(.*)$/.exec(line)
    if (!top) throw new Error(`Linha de frontmatter não suportada: ${line}`)
    if (top[2] === "") data[top[1]] = map = {}
    else {
      data[top[1]] = unquote(top[2])
      map = null
    }
  }
  return data
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)])))
  return nested.flat()
}

export async function buildSkillsManifest(root = fileURLToPath(new URL("../skills", import.meta.url))) {
  const dirs = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  const skills = []
  for (const dir of dirs) {
    const base = join(root, dir)
    const paths = (await listFiles(base)).map((p) => relative(base, p).split(sep).join("/")).filter((p) => !p.split("/").some((part) => part.startsWith(".")))
    if (!paths.includes("SKILL.md")) throw new Error(`${dir}: falta o SKILL.md`)
    paths.sort((a, b) => (a === "SKILL.md" ? -1 : b === "SKILL.md" ? 1 : a.localeCompare(b)))
    const files = await Promise.all(paths.map(async (path) => ({ path, content: await readFile(join(base, path), "utf8") })))
    const meta = parseFrontmatter(files[0].content)
    const { name, description, license, metadata = {} } = meta
    if (!name || !NAME.test(name) || name.length > 64) throw new Error(`${dir}: name inválido (${name}); use minúsculas, números e hífens`)
    if (name !== dir) throw new Error(`${dir}: name (${name}) precisa ser igual ao nome da pasta`)
    if (!description || description.length > 1024) throw new Error(`${dir}: description obrigatória, até 1024 caracteres`)
    skills.push({ name, description, descriptionPt: metadata.description_pt ?? description, license: license ?? "", version: metadata.version ?? "", files })
  }
  return { skills }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = await buildSkillsManifest()
  await writeFile(fileURLToPath(new URL("../src/skills.json", import.meta.url)), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`[skills] ${manifest.skills.length} skills em src/skills.json`)
}
