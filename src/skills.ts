// Catálogo de skills de IA (formato Agent Skills). Os arquivos vivem em skills/<nome>/ e o manifesto
// src/skills.json é gerado por scripts/build-skills.mjs — o site e o cli.js leem o mesmo manifesto.
import manifest from "./skills.json"

export interface SkillFile {
  path: string
  content: string
}

export interface Skill {
  name: string
  description: string
  descriptionPt: string
  license: string
  version: string
  files: SkillFile[]
}

export const SKILLS: Skill[] = manifest.skills

// o cli.js é publicado pelo site
export const SITE_URL = "https://thecodecodex.com"

// Pasta lida pelo Claude Code no projeto; outros agentes aceitam o mesmo formato em outra pasta (parâmetro dir)
export const DEFAULT_SKILLS_DIR = ".claude/skills"
export const SKILLS_TOOL = "ai-skills"

export const findSkill = (name: string): Skill | undefined => SKILLS.find((skill) => skill.name === name)

export const skillFile = (skill: Skill, path = "SKILL.md"): SkillFile | undefined => skill.files.find((file) => file.path === path)

// URL do arquivo cru publicado pelo site (src/pages/skills/[...path].ts)
export const skillFileUrl = (name: string, path: string): string => `/skills/${name}/${path}`

// Corpo do SKILL.md sem o frontmatter, para a prévia
export const skillBody = (content: string): string => content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim()

export function installPlan(skills: Skill[], dir = DEFAULT_SKILLS_DIR): SkillFile[] {
  const base = dir.trim().replace(/[\\/]+$/, "") || "."
  if (base.split(/[\\/]/).includes("..")) throw new Error(`Pasta inválida: ${dir} (não use "..")`)
  return skills.flatMap((skill) => skill.files.map((file) => ({ path: `${base}/${skill.name}/${file.path}`, content: file.content })))
}

export function installCommands(name: string, dir = DEFAULT_SKILLS_DIR): { deno: string, node: string } {
  const script = `${SITE_URL}/cli.js`
  const dirParam = dir === DEFAULT_SKILLS_DIR ? "" : ` dir=${dir}`
  const root = dir.split(/[\\/]/)[0] || dir
  return {
    deno: `deno run -q --allow-write=${root} "${script}?tool=${SKILLS_TOOL}&name=${name}&install=1${dirParam ? `&dir=${encodeURIComponent(dir)}` : ""}"`,
    node: `curl -s ${script} | node --input-type=module - ${SKILLS_TOOL} name=${name} install=1${dirParam}`,
  }
}
