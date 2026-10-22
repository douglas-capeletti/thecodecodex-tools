---
name: technical-guide-writer
description: Researches and writes a structured technical guide in Markdown — what it is, the problem, how it works, hands-on examples, limits and when to use it — with Mermaid diagrams, tables and verified sources. Use when the user asks for a guide, tutorial, explainer or study notes about a technology, protocol or architecture concept.
license: MIT
metadata:
  author: thecodecodex.com
  version: "1.0"
  description_pt: Pesquisa e escreve um guia técnico em Markdown — o que é, o problema, como funciona, exemplos práticos, limites e quando usar — com diagramas Mermaid, tabelas e fontes verificadas.
---

# Technical guide writer

Write guides that explain *why* before *how*, are accurate for the current version of the technology, and can be read in one sitting.

## 1. Research first

- Start with **primary sources**: official docs, changelogs, specifications, the project's repository. Then independent sources (reviews, postmortems, critiques), and say in the text when a claim comes only from the vendor.
- For anything that evolves (languages, cloud services, CLIs), confirm the **current stable version** and state from which version each feature applies ("since 1.11").
- Open every link you plan to cite. Drop the ones you could not verify.
- Base code examples on official docs; mark your own adaptations.

## 2. Structure

Use `##` for sections (they become the table of contents) and `#####` for subsections. Default outline, adapt when the topic needs it:

1. **What it is** — one-paragraph definition plus where the name comes from.
2. **The problem** — what was painful before it existed.
3. **How it works** — the mechanism, with a diagram; a table if there are types or variants.
4. **In practice** — one to three short examples the reader can run, ideally a local lab that needs no paid account.
5. **Limits** — what it does not do, caveats, what you could not verify.
6. **When to use it (and when not)** — a two-column table with concrete alternatives.
7. **Videos** and **References** — each link with one line of context.

For operational topics, a **Symptoms and causes** table (symptom → usual cause → command to investigate) is often the most useful section.

## 3. Style

- Direct sentences; no marketing adjectives. Vendor numbers always carry the caveat.
- Bold the one idea per section the reader must remember.
- Tables for comparisons, lists for steps, prose for reasoning.
- 2 to 4 Mermaid diagrams per guide (` ```mermaid ` blocks). Each must explain something the text alone would leave confusing — flows, sequences, architecture. Quote labels that contain punctuation, and use `<br/>` for line breaks.
- Code blocks always have a language tag and comments in the reader's language.
- No raw HTML inside Markdown unless the target platform requires it.
- Link concepts the reader may not know to a short explanation (a glossary entry or note) rather than explaining them inline at length.

## 4. Before delivering

- Re-check every version number and date against the sources you opened.
- Render or lint the Mermaid diagrams if a tool is available; an invalid diagram usually breaks the build.
- Deliver the guide plus a short summary: sections, sources used, and open points the author should decide.
