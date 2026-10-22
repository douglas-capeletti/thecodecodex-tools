# Terraform review checklist

Load this file during step 3 of the review. Report only what applies to the change being reviewed.

## State and backend

- Remote backend configured for any shared configuration (S3, GCS, Azure Blob, HCP Terraform). Local state in a team repo is a **high** finding.
- Locking enabled. On S3 with Terraform 1.11+, `use_lockfile = true`; `dynamodb_table` is deprecated and should only remain during migration.
- State bucket has versioning and encryption.
- `*.tfstate`, `*.tfstate.backup` and `.terraform/` are in `.gitignore`; `.terraform.lock.hcl` is committed.
- One huge state for everything → suggest splitting by layer (network, data, apps) and environment.

## Versions

- `required_version` set in the `terraform` block.
- Every provider in `required_providers` has a `source` and a version constraint (`~> 5.0`, not unpinned).
- Every registry or git module has a `version` or `?ref=` tag. A branch reference (`?ref=main`) is a **medium** finding.

## Secrets

- No credentials, tokens or passwords in `.tf`, `.tfvars` committed to git, or `default` values of variables.
- Variables holding secrets are `sensitive = true`; on 1.10+ prefer `ephemeral = true` when the value is only needed during the run.
- Passwords sent to resources use write-only attributes (1.11+) when the provider supports them; otherwise note that the value ends up in state.
- Outputs exposing secrets are marked `sensitive`.

## Resource identity

- Collections use `for_each` with stable keys, not `count`, unless the items are truly interchangeable. Removing an element from a `count` list shifts every index after it.
- Renamed or moved resources have a `moved` block.
- Resources being dropped from management but kept in the cloud use a `removed` block with `lifecycle { destroy = false }`.
- Stateful resources (databases, buckets with data, KMS keys) have `prevent_destroy = true` or deletion protection enabled at the provider level.

## Dependencies and lifecycle

- `depends_on` only where a hidden dependency exists (IAM propagation, API enablement); explain each one.
- `ignore_changes` is narrow (specific attributes) and commented; `ignore_changes = all` is a **medium** finding.
- `create_before_destroy` on resources that must not have downtime during replacement (certificates, launch templates), and the names allow two copies to coexist.

## Validation and tests

- Input variables have `type` and, where values are restricted, a `validation` block.
- `terraform fmt -check` and `terraform validate` pass.
- Reusable modules have `terraform test` files (`*.tftest.hcl`), at least with `command = plan`.

## Security basics

- No `0.0.0.0/0` ingress on SSH (22), RDP (3389) or database ports.
- Buckets are not public unless intended, and the intent is written down.
- IAM policies avoid `"Action": "*"` and `"Resource": "*"` together.
- Encryption at rest enabled for storage and databases.
