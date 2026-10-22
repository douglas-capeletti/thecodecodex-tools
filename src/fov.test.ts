import { describe, expect, it } from "vitest"
import { calculateAngles, DEFAULT_SETUP, gameSettings, screenSizeCm } from "./fov"
import { REFERENCE_CASES } from "./fov.fixture"

const find = (name: string, results = gameSettings(DEFAULT_SETUP)) => results.find((r) => r.name.startsWith(name))

describe("FOV calculator", () => {
  it("computes the physical size of a 27'' 16:9 screen", () => {
    const { width, height } = screenSizeCm(27, [16, 9])
    expect(width).toBeCloseTo(59.77, 1)
    expect(height).toBeCloseTo(33.62, 1)
  })

  it("matches trigonometry for a single flat screen", () => {
    const angles = calculateAngles(DEFAULT_SETUP)
    // 2·atan(29.89 / 60) ≈ 52.97°
    expect(angles.hFov).toBeCloseTo(52.96, 1)
    expect(angles.vFov).toBeCloseTo(31.3, 1)
  })

  it("multiplies horizontal FOV by the number of screens and counts bezels", () => {
    const single = calculateAngles(DEFAULT_SETUP)
    const triple = calculateAngles({ ...DEFAULT_SETUP, screens: 3 })
    expect(triple.hFov).toBeCloseTo(single.hFov * 3, 5)
    const withBezel = calculateAngles({ ...DEFAULT_SETUP, screens: 3, bezelMm: 10 })
    expect(withBezel.hFovSingle).toBeGreaterThan(single.hFovSingle)
  })

  it("a curved screen with radius equal to the distance covers width/radius radians", () => {
    const angles = calculateAngles({ ...DEFAULT_SETUP, curved: true, radiusMm: 600 })
    const width = screenSizeCm(27, [16, 9]).width
    expect(angles.hFov).toBeCloseTo((width / 60) * (180 / Math.PI), 3)
  })

  it("formats per-game values with each game's units and limits", () => {
    expect(find("Assetto")?.value).toBe("31.3")
    expect(find("DiRT")?.value).toBe("63")
    expect(find("RaceRoom")).toMatchObject({ value: "53.0", unit: "°" })
    // F1 2021+: round((52.97 − 77) / 2) × 1 = −12
    expect(find("F1 2021+")).toMatchObject({ value: "-12", unit: "" })
    expect(find("GTR2")).toMatchObject({ value: "0.5", unit: "x", clamped: false })
    // a 2 m da tela o FOV ideal (~17°) fica abaixo do mínimo do RaceRoom (35°)
    expect(find("RaceRoom", gameSettings({ ...DEFAULT_SETUP, distanceCm: 200 }))).toMatchObject({ value: "35.0", clamped: true })
  })

  it.each(REFERENCE_CASES)("matches the original calculator for $setup.diagonalIn'' $setup.aspect", ({ setup, hFov, vFov, sideAngle, games }) => {
    const angles = calculateAngles(setup)
    expect(angles.hFov).toBeCloseTo(hFov, 9)
    expect(angles.vFov).toBeCloseTo(vFov, 9)
    expect(`${(Math.round(angles.sideScreenAngle * 100) / 100).toFixed(2)}°`).toBe(sideAngle)
    for (const result of gameSettings(setup, angles)) expect(`${result.value}${result.unit}`, result.name).toBe(games[result.name as keyof typeof games])
  })
})
