# @thecodecodex/tools

Lógica pura das ferramentas do [thecodecodex.com](https://thecodecodex.com/pt/tools/): finanças brasileiras (CLT, PJ,
juros compostos, férias), CPF/CNPJ, fatura em PDF, PDF Studio, conversor de tabelas, diff, regex, JWT, hash, UUID e
outras, além do script de terminal [`cli.js`](https://thecodecodex.com/cli.js) e do catálogo de skills de IA.

Sem DOM nem framework: as mesmas funções rodam no navegador (site), no Node/Deno/Bun (`cli.js`) e nos testes.

## Uso

```sh
pnpm add @thecodecodex/tools
```

O pacote publica o código-fonte TypeScript (ESM), para ser consumido por um bundler (Vite, esbuild, Astro) ou pelo Deno.

```ts
import { isValidCpf } from "@thecodecodex/tools/br/cpf"
import { cltYear } from "@thecodecodex/tools/finance/clt"
import { convertTable } from "@thecodecodex/tools/table-convert"
```

Indicadores de mercado (CDI, IPCA, poupança, câmbio) não vêm embutidos: carregue-os antes de usar
`@thecodecodex/tools/market` ou os comandos de terminal que dependem deles.

```ts
import { setMarketData } from "@thecodecodex/tools/market"
setMarketData(data) // { fetchedAt, source, series: { cdi, ipca12m, savingsMonthly, usd, eur, gbp, cad } }
```

## Desenvolvimento

- `pnpm check`: tipos, lint e testes (Vitest, ao lado do código em `src/**/*.test.ts`)
- Skills de IA ficam em `skills/<nome>/` (formato [Agent Skills](https://agentskills.io/specification)); depois de
  editar, rode `pnpm skills:build` para regenerar `src/skills.json` (um teste falha se ficar desatualizado)
- Nova ferramenta: a lógica e o comando de terminal (`src/cli/tools.ts`, com os mesmos parâmetros da URL no site)

## Publicação

Atualize `version` no `package.json`, faça o commit e envie a tag correspondente (`git tag v0.2.0 && git push --tags`):
o workflow `publish.yml` roda os testes e publica no npm com provenance.

## Licença

MIT
