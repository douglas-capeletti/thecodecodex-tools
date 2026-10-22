// Calculadora de FOV para simuladores — porte da lógica de https://github.com/dinex86/FOV-Calculator (MIT)
// Ideia: o campo de visão "correto" é o ângulo que a tela realmente ocupa na sua visão,
// assim os objetos no jogo aparecem em escala real.

export interface Setup {
  aspect: [number, number]
  // diagonal de UMA tela, em polegadas
  diagonalIn: number
  // distância dos olhos até a tela, em cm
  distanceCm: number
  screens: 1 | 3
  // espessura da moldura (bezel) de cada tela, em mm — só conta com 3 telas
  bezelMm: number
  curved: boolean
  // raio da curvatura em mm (ex.: "1800R" = 1800)
  radiusMm: number
}

export const DEFAULT_SETUP: Setup = { aspect: [16, 9], diagonalIn: 27, distanceCm: 60, screens: 1, bezelMm: 0, curved: false, radiusMm: 1800 }

export const ASPECTS: [number, number][] = [[16, 9], [16, 10], [21, 9], [24, 10], [32, 9], [32, 10], [5, 4], [4, 3]]

const DEG = 180 / Math.PI

export function screenSizeCm(diagonalIn: number, [x, y]: [number, number]) {
  const diagonalCm = diagonalIn * 2.54
  const unit = Math.sqrt((diagonalCm * diagonalCm) / (x * x + y * y))
  return { width: x * unit, height: y * unit }
}

function flatAngle(widthCm: number, distanceCm: number): number {
  return Math.atan2(widthCm / 2, distanceCm) * 2
}

// Tela curva: usa a corda entre as bordas da tela e a "profundidade" da curva
function curvedAngle(widthCm: number, radiusMm: number, distanceCm: number): number {
  const radius = radiusMm / 10
  const arcAngle = widthCm / radius
  const depth = radius * (1 - Math.cos(arcAngle / 2))
  const halfChord = Math.sqrt(2 * radius * depth - depth * depth)
  return 2 * Math.atan2(halfChord, distanceCm - depth)
}

export interface Angles {
  // FOV horizontal de UMA tela, em graus
  hFovSingle: number
  // FOV horizontal total (todas as telas), em graus
  hFov: number
  // FOV vertical, em graus
  vFov: number
  // ângulo para girar cada tela lateral (igual ao hFOV de uma tela)
  sideScreenAngle: number
  widthCm: number
  heightCm: number
}

export function calculateAngles(setup: Setup): Angles {
  const [x, y] = setup.aspect
  const { width, height } = screenSizeCm(setup.diagonalIn, setup.aspect)
  // a moldura entre telas "rouba" campo de visão: soma 2 bezels (em cm) à largura
  const effectiveWidth = width + (setup.screens > 1 ? (setup.bezelMm / 10) * 2 : 0)
  const h = setup.curved ? curvedAngle(effectiveWidth, setup.radiusMm, setup.distanceCm) : flatAngle(effectiveWidth, setup.distanceCm)
  const v = 2 * Math.atan2(Math.tan(h / 2) * y, x)
  return { hFovSingle: h * DEG, hFov: h * DEG * setup.screens, vFov: v * DEG, sideScreenAngle: h * DEG, widthCm: width, heightCm: height }
}

type Kind = "hfov" | "hfov-rad" | "hfov-step" | "vfov" | "vfov-multiplier" | "vfov-step"

interface GameConfig {
  name: string
  kind: Kind
  min?: number
  max?: number
  decimals: number
  factor?: number
  // jogos com slider relativo: valor = round((fov − base) / incremento) × passo
  base?: number
  increment?: number
  step?: number
}

// Valores e limites de cada jogo conforme o projeto original
export const GAMES: GameConfig[] = [
  { name: "Assetto Corsa / Assetto Corsa Competizione", kind: "vfov", min: 10, max: 120, decimals: 1 },
  { name: "rFactor 1 & 2, GSC, GSCE, SCE, AMS (ISI)", kind: "vfov", min: 10, max: 100, decimals: 0 },
  { name: "DiRT Rally 1/2, GRID Autosport", kind: "vfov", min: 10, max: 115, decimals: 0, factor: 2 },
  { name: "RaceRoom Racing Experience", kind: "hfov", min: 35, max: 180, decimals: 1 },
  { name: "Project CARS 1/2", kind: "hfov", min: 35, max: 180, decimals: 0 },
  { name: "Euro & American Truck Simulator", kind: "hfov", min: 35, max: 180, decimals: 0 },
  { name: "F1 2016–2018", kind: "hfov-step", min: -1, max: 1, decimals: 2, base: 77, increment: 2, step: 0.05 },
  { name: "F1 2019–2020", kind: "hfov-step", min: -10, max: 10, decimals: 1, base: 77, increment: 2, step: 0.1 },
  { name: "F1 2021+", kind: "hfov-step", min: -20, max: 20, decimals: 0, base: 77, increment: 2, step: 1 },
  { name: "EA Sports WRC", kind: "vfov-step", min: 0, max: 100, decimals: 0, base: 18, increment: 0.5, step: 1 },
  { name: "Richard Burns Rally", kind: "hfov-rad", min: 10, max: 180, decimals: 6 },
  { name: "GTR2", kind: "vfov-multiplier", min: 0.5, max: 1.5, decimals: 1, base: 58 },
  { name: "Race 07", kind: "vfov-multiplier", min: 0.4, max: 1.5, decimals: 1, base: 58 },
]

export type GameUnit = "°" | "rad" | "x" | ""

export interface GameResult {
  name: string
  kind: Kind
  value: string
  unit: GameUnit
  // true quando o valor ideal está fora do que o jogo permite e foi limitado
  clamped: boolean
}

export function gameSettings(setup: Setup, angles: Angles = calculateAngles(setup)): GameResult[] {
  return GAMES.map((game) => {
    let value: number
    let unit: GameUnit = "°"
    switch (game.kind) {
      case "hfov":
      case "hfov-step":
        value = angles.hFov
        break
      case "hfov-rad": {
        // RBR usa o FOV horizontal de uma tela 4:3 com a mesma altura
        const [x, y] = setup.aspect
        const width4by3 = ((angles.widthCm + (setup.screens > 1 ? (setup.bezelMm / 10) * 2 : 0)) / x) * y / 3 * 4
        value = flatAngle(width4by3, setup.distanceCm) * DEG
        unit = "rad"
        break
      }
      default:
        value = angles.vFov
    }
    value *= game.factor ?? 1
    if (game.kind === "vfov-multiplier") {
      value /= game.base ?? 1
      unit = "x"
    }
    if (game.kind === "hfov-step" || game.kind === "vfov-step") {
      value = Math.round((value - (game.base ?? 0)) / (game.increment ?? 1)) * (game.step ?? 1)
      unit = ""
    }
    const limited = Math.min(Math.max(value, game.min ?? -Infinity), game.max ?? Infinity)
    const clamped = Math.abs(limited - value) > 1e-9
    const final = unit === "rad" ? limited * (Math.PI / 180) : limited
    const scale = 10 ** game.decimals
    return { name: game.name, kind: game.kind, value: (Math.round(final * scale) / scale).toFixed(game.decimals), unit, clamped }
  })
}
