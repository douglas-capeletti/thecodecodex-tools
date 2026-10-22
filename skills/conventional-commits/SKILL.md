---
name: conventional-commits
description: Writes git commit messages and PR titles following Conventional Commits (type(scope) subject, body explaining why, BREAKING CHANGE footers), split by intent. Use when the user asks to commit, write a commit message, squash, name a pull request, or prepare a changelog from commits.
license: MIT
metadata:
  author: thecodecodex.com
  version: "1.0"
  description_pt: Escreve mensagens de commit e títulos de PR no padrão Conventional Commits (tipo(escopo), corpo explicando o porquê, BREAKING CHANGE), separando commits por intenção.
---

# Conventional Commits

## Format

```text
<type>(<scope>): <subject>

<body: what changed and why, wrapped at ~72 columns>

<footers>
```

- **type** — one of:

  | Type | Use for |
  |---|---|
  | `feat` | A new capability for users |
  | `fix` | A bug fix |
  | `docs` | Documentation or content only |
  | `refactor` | Code change with no behavior change |
  | `perf` | Performance improvement |
  | `test` | Adding or fixing tests only |
  | `build` | Build system, dependencies, packaging |
  | `ci` | CI configuration |
  | `chore` | Maintenance that fits nothing above |
  | `revert` | Reverting an earlier commit |

- **scope** — optional, a short noun for the area touched (`tools`, `cli`, `auth`, `content`). Reuse the scopes already present in `git log` instead of inventing new ones.
- **subject** — imperative mood ("add", not "added"/"adds"), no trailing period, at most ~60 characters, lowercase start unless it is a proper noun.
- **body** — explain *why* and anything a reviewer could not see from the diff. Skip it for trivial changes.
- **footers** — `BREAKING CHANGE: <what breaks and how to migrate>` (or `!` after the type: `feat(api)!:`), `Refs: #123`, `Co-authored-by:` lines.

## Workflow

1. Look at the staged diff (`git diff --cached`); if nothing is staged, look at `git status` and ask what should go in.
2. Check `git log --oneline -20` to match the project's language, scopes and casing. If the project writes messages in another language, keep the type and scope in English and follow the project for the rest.
3. If the diff mixes unrelated intents (a feature plus an unrelated fix plus formatting), propose splitting it into separate commits and list which files go in each.
4. Write the message. Pick the type by the user-visible effect, not by which files changed: a bug fixed by refactoring is `fix`.
5. Only run `git commit` if the user asked you to commit; otherwise return the message.

## Examples

```text
feat(cli): install skills into .claude/skills

`skills name=<skill> install=1` writes every file of the skill to disk, so
agents can pick it up without a manual download.
```

```text
fix(invoice): round totals per line before summing

Rounding only the final total produced a one-cent difference from the
PDF rendered by the bank.
```

```text
feat(api)!: drop the v1 endpoints

BREAKING CHANGE: /v1/* now returns 410. Clients must use /v2, which has
been available since March.
```

## Avoid

- Vague subjects: `fix: bug`, `chore: updates`, `wip`.
- Listing files in the subject instead of the intent.
- A `feat` that is really internal (`refactor`) — it pollutes the changelog.
