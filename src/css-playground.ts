export type Lang = "pt" | "en"

// Playground de CSS: cada demo é dado puro (HTML, CSS, controles), renderizado num <iframe sandbox> sem scripts.
// Os controles viram variáveis CSS (`--gap: 16px`), e o CSS da demo as usa com var().

export const CATEGORIES = ["layout", "selectors", "interaction", "visual"] as const
export type DemoCategory = (typeof CATEGORIES)[number]

// Baseline (web.dev): "widely" = suportado há 30+ meses; "newly" = em todos os navegadores principais há pouco; "limited" = falta algum
export type SupportLevel = "widely" | "newly" | "limited"

export interface SelectControl {
  kind: "select"
  name: string
  options: readonly string[]
  initial: string
}

export interface RangeControl {
  kind: "range"
  name: string
  min: number
  max: number
  step: number
  unit: string
  initial: number
}

export interface ColorControl {
  kind: "color"
  name: string
  initial: string
}

export type Control = SelectControl | RangeControl | ColorControl

export interface Demo {
  id: string
  category: DemoCategory
  support: { level: SupportLevel, since?: number }
  controls: Control[]
  // mostra o controle de largura da prévia (para demos que reagem ao tamanho)
  resizable: boolean
  height: number
  // condição de @supports: sem suporte, a prévia mostra um aviso em vez de quebrar em silêncio
  check?: string
  html: (lang: Lang) => string
  css: string
}

const t = (lang: Lang, pt: string, en: string) => (lang === "pt" ? pt : en)

const select = (name: string, options: readonly string[], initial = options[0] ?? ""): SelectControl => ({ kind: "select", name, options, initial })
const range = (name: string, min: number, max: number, initial: number, unit = "px", step = 1): RangeControl => ({ kind: "range", name, min, max, step, unit, initial })
const color = (name: string, initial: string): ColorControl => ({ kind: "color", name, initial })

export const DEMOS: Demo[] = [
  {
    id: "flexbox",
    category: "layout",
    support: { level: "widely" },
    controls: [
      select("direction", ["row", "column", "row-reverse"]),
      select("justify", ["flex-start", "center", "space-between", "space-around"]),
      select("align", ["stretch", "flex-start", "center", "flex-end"]),
      select("wrap", ["nowrap", "wrap"]),
      range("gap", 0, 48, 12),
    ],
    resizable: true,
    height: 300,
    html: () => `<div class="row">
  <div class="item">1</div>
  <div class="item">2</div>
  <div class="item">3</div>
  <div class="item">4</div>
  <div class="item">5</div>
</div>`,
    css: `.row {
  display: flex;
  flex-direction: var(--direction);
  justify-content: var(--justify);
  align-items: var(--align);
  flex-wrap: var(--wrap);
  gap: var(--gap);
  min-height: 240px;
  padding: 12px;
  border: 2px dashed #9ca3af;
  border-radius: 12px;
}

.item {
  padding: 12px 20px;
  border-radius: 10px;
  background: #0e7490;
  color: white;
  font-weight: 700;
}

/* tamanhos diferentes para o alinhamento ficar visível || different sizes so the alignment is visible */
.item:nth-child(2) { padding-block: 32px; }
.item:nth-child(4) { padding-inline: 48px; }`,
  },
  {
    id: "grid",
    category: "layout",
    support: { level: "widely" },
    controls: [range("min", 80, 260, 140), range("gap", 0, 40, 12)],
    resizable: true,
    height: 340,
    html: (lang) => `<div class="cards">
${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `  <div class="card">${t(lang, "Card", "Card")} ${n}</div>`).join("\n")}
</div>`,
    css: `/* quantas colunas couberem, cada uma com no mínimo --min: sem media query || as many columns as fit, each at least --min wide: no media query */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--min), 1fr));
  gap: var(--gap);
}

.card {
  display: grid;
  place-items: center; /* centraliza nos dois eixos || centers on both axes */
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  background: #1d4ed8;
  color: white;
  font-weight: 700;
}`,
  },
  {
    id: "container",
    category: "layout",
    support: { level: "widely" },
    controls: [],
    resizable: true,
    height: 360,
    html: (lang) => {
      const card = `<article class="card">
      <div class="thumb"></div>
      <div>
        <h3>${t(lang, "Mesmo componente", "Same component")}</h3>
        <p>${t(lang, "O layout depende do espaço do container, não da tela.", "The layout depends on the container's space, not the screen.")}</p>
      </div>
    </article>`
      return `<div class="layout">
  <aside class="slot">
    ${card}
  </aside>
  <main class="slot">
    ${card}
  </main>
</div>`
    },
    css: `.layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
}

/* cada slot vira um container que os filhos podem consultar || each slot becomes a container its children can query */
.slot { container-type: inline-size; }

.card {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
}

.thumb {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  background: linear-gradient(135deg, #0e7490, #a5f3fc);
}

h3 { margin: 0; font-size: 18px; }
p { margin: 4px 0 0; color: #4b5563; }

/* vale para a largura do CONTAINER, não da janela || applies to the CONTAINER width, not the window */
@container (min-width: 360px) {
  .card { grid-template-columns: 140px 1fr; align-items: center; }
  .thumb { aspect-ratio: 1; }
}`,
  },
  {
    id: "clamp",
    category: "layout",
    support: { level: "widely" },
    controls: [range("min", 16, 32, 24), range("max", 32, 80, 56)],
    resizable: true,
    height: 320,
    html: (lang) => `<div class="box">
  <h1>${t(lang, "Tipografia fluida", "Fluid typography")}</h1>
  <p>${t(lang, "Mude a largura da prévia: o título cresce com a tela, mas nunca passa dos limites.", "Change the preview width: the heading grows with the screen, but never past the limits.")}</p>
</div>`,
    css: `/* clamp(mínimo, ideal, máximo) || clamp(minimum, preferred, maximum) */
h1 {
  font-size: clamp(var(--min), 1rem + 5vw, var(--max));
  line-height: 1.05;
  margin: 0 0 12px;
}

p { font-size: clamp(15px, 0.8rem + 0.6vw, 19px); }

.box {
  padding: clamp(12px, 5vw, 48px);
  border-radius: 16px;
  background: #fed7aa;
}`,
  },
  {
    id: "sticky",
    category: "layout",
    support: { level: "widely" },
    controls: [range("top", 0, 48, 0)],
    resizable: false,
    height: 320,
    html: (lang) => ["A", "B", "C", "D"]
      .map((letter) => `<section>
  <h3>${letter}</h3>
  <p>${t(lang, "Role a prévia: o título gruda no topo enquanto a seção dele estiver visível.", "Scroll the preview: the heading sticks to the top while its section is visible.")}</p>
  <p>Ana · Bruno · Carla · Diego · Elisa · Fábio</p>
</section>`)
      .join("\n"),
    css: `h3 {
  position: sticky;
  top: var(--top);
  margin: 0;
  padding: 8px 12px;
  background: #12151e;
  color: white;
  border-radius: 8px;
}

section { padding-bottom: 24px; }
p { margin: 8px 12px; line-height: 2; }`,
  },
  {
    id: "has",
    category: "selectors",
    support: { level: "widely" },
    controls: [],
    resizable: false,
    height: 380,
    html: (lang) => `<label class="toggle"><input type="checkbox" id="dark"> ${t(lang, "Tema escuro (só CSS)", "Dark theme (CSS only)")}</label>

<div class="plans">
  <label class="plan"><input type="radio" name="plan"> ${t(lang, "Básico", "Basic")}</label>
  <label class="plan"><input type="radio" name="plan"> Pro</label>
  <p class="hint">${t(lang, "Escolha um plano", "Pick a plan")}</p>
</div>

<form>
  <input type="email" required placeholder="email@example.com">
  <button>${t(lang, "Enviar", "Send")}</button>
</form>`,
    css: `/* o card que CONTÉM o radio marcado || the card that CONTAINS the checked radio */
.plan:has(input:checked) {
  border-color: #0e7490;
  background: #cffafe;
  color: #164e63;
}

/* esconde a dica quando qualquer plano foi escolhido || hide the hint once any plan is picked */
.plans:has(input:checked) .hint { display: none; }

/* desabilita o botão enquanto o e-mail for inválido || disable the button while the email is invalid */
form:has(input:invalid) button { opacity: 0.4; pointer-events: none; }

/* o body reage a um checkbox lá dentro || the body reacts to a checkbox inside it */
body:has(#dark:checked) { background: #12151e; color: #f3f4f6; }

.plans { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.plan { padding: 12px 16px; border: 2px solid #9ca3af; border-radius: 10px; cursor: pointer; }
form { display: flex; gap: 8px; }
input[type="email"] { flex: 1; padding: 8px; }
.hint { width: 100%; margin: 0; color: #9a3412; }`,
  },
  {
    id: "sibling-index",
    category: "selectors",
    support: { level: "newly", since: 2026 },
    controls: [range("step", 20, 120, 80, "ms", 10)],
    resizable: false,
    height: 320,
    check: "width: calc(sibling-index() * 1px)",
    html: () => `<div class="bars">
${Array.from({ length: 8 }, () => `  <div class="bar"></div>`).join("\n")}
</div>`,
    css: `/* cada barra sabe sua posição entre os irmãos, sem :nth-child para cada uma || each bar knows its position among its siblings, no :nth-child for each one */
.bar {
  height: 24px;
  margin-bottom: 8px;
  border-radius: 6px;
  width: calc(sibling-index() * 11%);
  background: hsl(calc(sibling-index() * 40) 70% 45%);
  transform-origin: left;
  animation: grow 0.6s both;
  animation-delay: calc(sibling-index() * var(--step));
}

@keyframes grow {
  from { transform: scaleX(0); }
}`,
  },
  {
    id: "popover",
    category: "interaction",
    support: { level: "newly", since: 2026 },
    controls: [select("area", ["bottom span-right", "top span-right", "right", "bottom"])],
    resizable: false,
    height: 300,
    check: "anchor-name: --a",
    html: (lang) => `<button popovertarget="menu" class="trigger">Menu ▾</button>

<div id="menu" popover>
  <a href="#">${t(lang, "Perfil", "Profile")}</a>
  <a href="#">${t(lang, "Configurações", "Settings")}</a>
  <a href="#">${t(lang, "Sair", "Sign out")}</a>
</div>`,
    css: `/* popover: abre, fecha com Esc ou clique fora, sem uma linha de JavaScript || popover: opens, closes on Esc or outside click, without a line of JavaScript */
body { display: grid; place-items: center; min-height: 260px; }

/* anchor positioning: o menu se posiciona em relação ao botão || anchor positioning: the menu positions itself relative to the button */
.trigger { anchor-name: --menu; padding: 10px 16px; font: inherit; font-weight: 700; }

#menu {
  position-anchor: --menu;
  position-area: var(--area);
  inset: auto;
  margin: 6px;
  display: grid;
  min-width: 160px;
  padding: 6px;
  border: 2px solid #12151e;
  border-radius: 12px;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s, transform 0.2s, display 0.2s allow-discrete, overlay 0.2s allow-discrete;
}

#menu:not(:popover-open) { opacity: 0; transform: translateY(-6px); }

/* @starting-style: o estado de partida da animação de entrada || @starting-style: the starting state of the entry animation */
@starting-style {
  #menu:popover-open { opacity: 0; transform: translateY(-6px); }
}

#menu a { padding: 8px 10px; border-radius: 8px; color: inherit; text-decoration: none; }
#menu a:hover { background: #e5e7eb; }`,
  },
  {
    id: "accordion",
    category: "interaction",
    support: { level: "newly", since: 2024 },
    controls: [],
    resizable: false,
    height: 320,
    html: (lang) => [
      [t(lang, "O que é o atributo name?", "What does the name attribute do?"), t(lang, "Vários <details> com o mesmo name formam um grupo: abrir um fecha os outros.", "Several <details> with the same name form a group: opening one closes the others.")],
      [t(lang, "Precisa de JavaScript?", "Does it need JavaScript?"), t(lang, "Não. É comportamento nativo do HTML.", "No. It is native HTML behavior.")],
      [t(lang, "E a acessibilidade?", "What about accessibility?"), t(lang, "Teclado e leitores de tela funcionam sem nada extra.", "Keyboard and screen readers work with nothing extra.")],
    ]
      .map(([question, answer], index) => `<details name="faq"${index === 0 ? " open" : ""}>
  <summary>${question}</summary>
  <p>${answer?.replace(/</g, "&lt;")}</p>
</details>`)
      .join("\n"),
    css: `details {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 8px;
  padding: 0 14px;
}

details[open] { border-color: #0e7490; }

summary {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  font-weight: 700;
  cursor: pointer;
  list-style: none; /* esconde o triângulo padrão || hides the default triangle */
}

summary::after { content: "+"; transition: rotate 0.2s; }
details[open] summary::after { rotate: 45deg; }

p { margin: 0 0 12px; color: #4b5563; }`,
  },
  {
    id: "scroll-snap",
    category: "interaction",
    support: { level: "widely" },
    controls: [select("type", ["mandatory", "proximity"]), select("align", ["center", "start"])],
    resizable: false,
    height: 300,
    html: (lang) => `<p>${t(lang, "Arraste ou role para o lado:", "Drag or scroll sideways:")}</p>
<div class="track">
${[1, 2, 3, 4, 5].map((n) => `  <div class="slide">${n}</div>`).join("\n")}
</div>`,
    css: `.track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x var(--type);
  scroll-padding-inline: 16px;
  padding-bottom: 12px;
}

.slide {
  flex: 0 0 70%;
  scroll-snap-align: var(--align); /* onde cada slide "encaixa" ao soltar || where each slide "snaps" when released */
  display: grid;
  place-items: center;
  height: 180px;
  border-radius: 14px;
  background: #9a3412;
  color: white;
  font-size: 48px;
  font-weight: 800;
}`,
  },
  {
    id: "field-sizing",
    category: "interaction",
    support: { level: "newly", since: 2026 },
    controls: [],
    resizable: false,
    height: 300,
    check: "field-sizing: content",
    html: (lang) => `<p>${t(lang, "Digite nos campos: eles crescem com o conteúdo.", "Type in the fields: they grow with the content.")}</p>
<textarea>${t(lang, "Este textarea cresce a cada nova linha, sem JavaScript.", "This textarea grows with every new line, without JavaScript.")}</textarea>
<p><input value="${t(lang, "Nome", "Name")}"> <select><option>${t(lang, "Curta", "Short")}</option><option>${t(lang, "Uma opção bem mais longa", "A much longer option")}</option></select></p>`,
    css: `textarea, input, select {
  field-sizing: content; /* o tamanho acompanha o conteúdo || the size follows the content */
  min-width: 8ch;
  max-width: 100%;
  padding: 8px 10px;
  font: inherit;
  border: 2px solid #9ca3af;
  border-radius: 8px;
}

textarea { min-height: 2lh; width: auto; }`,
  },
  {
    id: "property",
    category: "visual",
    support: { level: "newly", since: 2024 },
    controls: [range("speed", 1, 10, 4, "s")],
    resizable: false,
    height: 280,
    html: (lang) => `<div class="card">${t(lang, "Borda animada com @property", "Animated border with @property")}</div>`,
    css: `/* registrar a variável com um tipo permite animá-la || registering the variable with a type makes it animatable */
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

body { display: grid; place-items: center; min-height: 240px; }

.card {
  padding: 32px 40px;
  font-weight: 700;
  border: 5px solid transparent;
  border-radius: 18px;
  background:
    linear-gradient(white, white) padding-box,
    conic-gradient(from var(--angle), #0e7490, #a5f3fc, #9a3412, #0e7490) border-box;
  animation: spin var(--speed) linear infinite;
}

@keyframes spin {
  to { --angle: 360deg; }
}`,
  },
  {
    id: "color-mix",
    category: "visual",
    support: { level: "newly", since: 2024 },
    controls: [color("brand", "#0e7490"), select("scheme", ["light", "dark"])],
    resizable: false,
    height: 320,
    check: "color: light-dark(red, red)",
    html: (lang) => `<div class="swatches">
  <div></div><div></div><div></div><div></div><div></div>
</div>
<div class="surface">${t(lang, "Uma cor de marca gera a paleta inteira.", "One brand color generates the whole palette.")}</div>
<button class="btn">${t(lang, "Botão", "Button")}</button>`,
    css: `:root { color-scheme: var(--scheme); }

/* light-dark(): um valor para cada tema, sem media query || light-dark(): one value per theme, no media query */
body {
  background: light-dark(#ffffff, #12151e);
  color: light-dark(#12151e, #f3f4f6);
}

/* color-mix(): tons derivados da mesma cor || color-mix(): shades derived from the same color */
.swatches { display: flex; gap: 8px; margin-bottom: 16px; }
.swatches div { flex: 1; height: 56px; border-radius: 10px; }
.swatches div:nth-child(1) { background: color-mix(in oklch, var(--brand), white 75%); }
.swatches div:nth-child(2) { background: color-mix(in oklch, var(--brand), white 40%); }
.swatches div:nth-child(3) { background: var(--brand); }
.swatches div:nth-child(4) { background: color-mix(in oklch, var(--brand), black 30%); }
.swatches div:nth-child(5) { background: color-mix(in oklch, var(--brand), black 60%); }

.surface {
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--brand) 15%, transparent);
  border: 2px solid color-mix(in srgb, var(--brand) 50%, transparent);
}

.btn {
  margin-top: 16px;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: var(--brand);
  color: white;
  font: inherit;
  font-weight: 700;
}

.btn:hover { background: color-mix(in oklch, var(--brand), black 20%); }`,
  },
  {
    id: "backdrop",
    category: "visual",
    support: { level: "newly", since: 2024 },
    controls: [range("blur", 0, 24, 12)],
    resizable: false,
    height: 300,
    html: (lang) => `<div class="blob one"></div>
<div class="blob two"></div>
<div class="glass">${t(lang, "Vidro fosco: o filtro vale para o que está ATRÁS do elemento.", "Frosted glass: the filter applies to what is BEHIND the element.")}</div>`,
    css: `body { position: relative; min-height: 260px; overflow: hidden; background: #fef3c7; }

.blob { position: absolute; width: 200px; height: 200px; border-radius: 50%; }
.one { top: 10px; left: 15%; background: #0e7490; }
.two { bottom: 0; right: 15%; background: #9a3412; }

.glass {
  position: absolute;
  inset: 60px 40px;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
  font-weight: 700;
  border-radius: 18px;
  border: 1px solid rgb(255 255 255 / 0.7);
  background: rgb(255 255 255 / 0.3);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.15);
  backdrop-filter: blur(var(--blur)) saturate(160%);
}`,
  },
  {
    id: "text-wrap",
    category: "visual",
    support: { level: "newly", since: 2024 },
    controls: [select("wrap", ["wrap", "balance", "pretty"], "balance")],
    resizable: true,
    height: 300,
    check: "text-wrap: balance",
    html: (lang) => `<h2>${t(lang, "Títulos equilibrados em várias linhas, sem palavra sozinha no final", "Balanced headings across lines, with no lonely word at the end")}</h2>
<p>${t(lang, "Compare wrap, balance e pretty e mude a largura da prévia. balance distribui o texto por igual entre as linhas (ideal para títulos); pretty evita uma palavra solitária na última linha de parágrafos.", "Compare wrap, balance and pretty, and change the preview width. balance spreads text evenly across lines (great for headings); pretty avoids a single word on the last line of paragraphs.")}</p>`,
    css: `h2, p {
  text-wrap: var(--wrap);
  outline: 1px dashed #9ca3af; /* mostra a caixa do texto || shows the text box */
}

h2 { font-size: 30px; line-height: 1.15; }
p { line-height: 1.6; }`,
  },
  {
    id: "scroll-driven",
    category: "visual",
    support: { level: "limited" },
    controls: [],
    resizable: false,
    height: 340,
    check: "animation-timeline: scroll()",
    html: (lang) => `<div class="progress"></div>
${[1, 2, 3, 4, 5, 6].map((n) => `<div class="reveal">${t(lang, "Bloco", "Block")} ${n}</div>`).join("\n")}`,
    css: `/* barra de progresso de leitura: avança com a rolagem da página || reading progress bar: advances as the page scrolls */
.progress {
  position: fixed;
  inset: 0 0 auto;
  height: 6px;
  background: #0e7490;
  transform-origin: left;
  animation: progress linear both;
  animation-timeline: scroll(root);
}

@keyframes progress {
  from { transform: scaleX(0); }
}

/* cada bloco aparece ao entrar na área visível || each block appears as it enters the viewport */
.reveal {
  margin: 24px 0;
  padding: 40px;
  border-radius: 14px;
  background: #e5e7eb;
  font-weight: 700;
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

@keyframes reveal {
  from { opacity: 0; translate: 0 40px; }
}`,
  },
]

// Comentários das demos são escritos nas duas línguas: /* português || english */
export function localizeComments(css: string, lang: Lang): string {
  return css.replace(/\/\*\s*(.*?)\s*\|\|\s*(.*?)\s*\*\//g, (_, pt: string, en: string) => `/* ${lang === "pt" ? pt : en} */`)
}

export function demoCss(demo: Demo, lang: Lang): string {
  return localizeComments(demo.css, lang)
}

export const DEMO_IDS = DEMOS.map((demo) => demo.id)

export function findDemo(id: string): Demo {
  return DEMOS.find((demo) => demo.id === id) ?? (DEMOS[0] as Demo)
}

export function initialValues(demo: Demo): string[] {
  return demo.controls.map((control) => String(control.initial))
}

function isValid(control: Control, value: string | undefined): value is string {
  if (value === undefined) return false
  if (control.kind === "select") return control.options.includes(value)
  if (control.kind === "color") return /^#[0-9a-f]{6}$/i.test(value)
  const number = Number(value)
  return value !== "" && Number.isFinite(number) && number >= control.min && number <= control.max
}

// Valores vindos da URL: cada um é validado; inválido ou ausente volta ao padrão
export function normalizeValues(demo: Demo, values: readonly string[]): string[] {
  return demo.controls.map((control, index) => {
    const value = values[index]
    return isValid(control, value) ? value : String(control.initial)
  })
}

export function cssValue(control: Control, value: string): string {
  return control.kind === "range" ? `${value}${control.unit}` : value
}

// Bloco :root com as variáveis dos controles (vazio se a demo não tem controles)
export function variablesCss(demo: Demo, values: readonly string[]): string {
  if (demo.controls.length === 0) return ""
  const normalized = normalizeValues(demo, values)
  const lines = demo.controls.map((control, index) => `  --${control.name}: ${cssValue(control, normalized[index] ?? String(control.initial))};`)
  return `:root {\n${lines.join("\n")}\n}`
}

const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 16px; font: 16px/1.5 system-ui, sans-serif; color: #12151e; background: #ffffff; }
.css-playground-warning { display: none; margin: 16px 0 0; padding: 10px 12px; border-radius: 8px; background: #fff7ed; color: #9a3412; font-size: 14px; }`

// Documento completo da prévia. "</style" no CSS editado é neutralizado para não fechar a tag antes da hora.
export function previewDocument(options: { demo: Demo, css: string, values: readonly string[], lang: Lang, warning: string }): string {
  const { demo, css, values, lang, warning } = options
  const safe = (text: string) => text.replace(/<\/style/gi, "<\\/style")
  const supports = demo.check ? `@supports not (${demo.check}) { .css-playground-warning { display: block; } }` : ""
  const note = demo.check ? `\n<p class="css-playground-warning">${warning}</p>` : ""
  return `<!doctype html>
<html lang="${lang === "pt" ? "pt-BR" : "en"}">
<head>
<meta charset="utf-8">
<style>${BASE_CSS}
${supports}</style>
<style>${safe(variablesCss(demo, values))}</style>
<style>${safe(css)}</style>
</head>
<body>
${demo.html(lang)}${note}
</body>
</html>`
}

// Aviso exibido na prévia quando o navegador não suporta o recurso da demo
export const CSS_WARNING: Record<Lang, string> = {
  pt: "Seu navegador ainda não suporta este recurso, então a prévia não mostra o efeito completo.",
  en: "Your browser doesn't support this feature yet, so the preview doesn't show the full effect.",
}
