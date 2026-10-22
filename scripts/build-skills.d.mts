// Tipos de scripts/build-skills.mjs (usado pelo teste src/skills.test.ts)
import type { Skill } from "../src/skills"

export function parseFrontmatter(markdown: string): Record<string, string | Record<string, string>>
export function buildSkillsManifest(root?: string): Promise<{ skills: Skill[] }>
