import { describe, expect, it } from "vitest"
import { buildSkillsManifest, parseFrontmatter } from "../scripts/build-skills.mjs"
import manifest from "./skills.json"
import { DEFAULT_SKILLS_DIR, findSkill, installCommands, installPlan, SKILLS, skillBody } from "./skills"

describe("skills manifest", () => {
  it("is in sync with skills/ (run `pnpm skills:build` after editing a skill)", async () => {
    expect(await buildSkillsManifest()).toEqual(manifest)
  })

  it("follows the Agent Skills spec", () => {
    expect(SKILLS.length).toBeGreaterThan(0)
    for (const skill of SKILLS) {
      expect(skill.name, skill.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(skill.description.length, skill.name).toBeLessThanOrEqual(1024)
      expect(skill.files[0]?.path, skill.name).toBe("SKILL.md")
      expect(skill.descriptionPt, skill.name).not.toBe("")
    }
  })

  it("parses nested metadata and quoted values", () => {
    const data = parseFrontmatter('---\nname: x\ndescription: "a: b"\nmetadata:\n  version: "1.0"\n---\nbody')
    expect(data).toEqual({ name: "x", description: "a: b", metadata: { version: "1.0" } })
  })
})

describe("install", () => {
  it("writes every file under <dir>/<name>/", () => {
    const skill = findSkill("terraform-review")
    if (!skill) throw new Error("missing skill")
    expect(installPlan([skill]).map((f) => f.path)).toEqual([`${DEFAULT_SKILLS_DIR}/terraform-review/SKILL.md`, `${DEFAULT_SKILLS_DIR}/terraform-review/references/checklist.md`])
    expect(installPlan([skill], "skills/").map((f) => f.path)[0]).toBe("skills/terraform-review/SKILL.md")
  })

  it("rejects directories that escape the working folder", () => {
    expect(() => installPlan(SKILLS, "../x")).toThrow("..")
  })

  it("builds commands with the same params as the CLI", () => {
    expect(installCommands("a").node).toBe("curl -s https://thecodecodex.com/cli.js | node --input-type=module - ai-skills name=a install=1")
    expect(installCommands("a").deno).toContain("--allow-write=.claude ")
    expect(installCommands("a", ".agents/skills").deno).toContain("&dir=.agents%2Fskills")
  })

  it("strips the frontmatter for previews", () => {
    expect(skillBody("---\nname: x\n---\n\n# Title")).toBe("# Title")
  })
})
