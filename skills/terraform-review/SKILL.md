---
name: terraform-review
description: Reviews Terraform or OpenTofu code and plan output for destructive changes, state and locking problems, secrets leaking into state, fragile count/for_each usage and missing version pins. Use when the user shares .tf files, a terraform plan, a pull request touching infrastructure, or asks whether an apply is safe.
license: MIT
metadata:
  author: thecodecodex.com
  version: "1.0"
  description_pt: Revisa código e planos de Terraform ou OpenTofu procurando substituições destrutivas, problemas de state e lock, segredos no state, uso frágil de count e for_each e versões sem fixar.
---

# Terraform review

Review infrastructure changes the way a careful platform engineer would before approving an apply: first what will be destroyed or replaced, then what could break later.

## Workflow

1. **Find the plan.** If the user only shared code, ask for (or run, if you have a shell and credentials are not needed) `terraform plan -no-color`. A review without the plan can only judge the code, so say so.
2. **Read destructive actions first.** List every resource marked `-` (destroy), `-/+` (replace) or `+/-` (create before destroy). For each one, quote the `# forces replacement` attribute and say whether data can be lost (databases, disks, buckets, DNS zones, KMS keys).
3. **Check the code** against [the checklist](references/checklist.md). Only report items that actually apply to the change.
4. **Write the review** in the format below.

## Output format

```markdown
## Verdict
Safe to apply | Apply with care | Do not apply — one sentence why.

## Destructive changes
- `aws_db_instance.main` will be **replaced** because `identifier` changed → data loss unless restored from snapshot.

## Findings
1. **[high]** <problem> — <file:line> — <concrete fix, with a code snippet when short>
2. **[medium]** ...

## Nice to have
- ...
```

Severity: **high** = data loss, outage, security exposure or state corruption; **medium** = will hurt on the next change (count reorder, missing pin, missing lock); **low** = style and readability.

## Rules of thumb

- A rename is not a destroy: suggest a `moved` block instead of accepting a replace caused by a new address.
- Adopting existing infrastructure goes through an `import` block, never by deleting and recreating it.
- Never recommend `terraform state rm`, `state mv` or `force-unlock` without explaining the risk and asking for confirmation.
- Do not invent provider behavior. If you are not sure whether an attribute forces replacement, say the plan is the source of truth.
- Keep findings specific: a file, a resource address, a fix. Skip generic advice that does not apply to this diff.
