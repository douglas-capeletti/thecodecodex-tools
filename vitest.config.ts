import { defineConfig } from "vitest/config"

// Testes ficam ao lado do código (src/**/*.test.ts)
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], setupFiles: ["src/test-setup.ts"] },
})
