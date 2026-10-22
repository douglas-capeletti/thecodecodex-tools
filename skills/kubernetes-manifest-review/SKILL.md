---
name: kubernetes-manifest-review
description: Reviews Kubernetes YAML manifests and Helm output for production readiness — probes, resource requests and limits, rollout strategy, security context, labels and selectors, and Secret handling. Use when the user shares Deployments, StatefulSets, Services, HPAs or Helm charts, or asks why pods are Pending, crash looping or OOMKilled.
license: MIT
metadata:
  author: thecodecodex.com
  version: "1.0"
  description_pt: Revisa manifestos Kubernetes e saídas do Helm para produção — probes, requests e limits, estratégia de rollout, security context, labels e selectors e uso de Secrets.
---

# Kubernetes manifest review

## Workflow

1. Identify each object (`kind`, `metadata.name`, namespace). If the user shared a Helm chart, review the rendered output (`helm template`) when possible, not just `values.yaml`.
2. Go through the checks below for every workload (Deployment, StatefulSet, DaemonSet, Job).
3. If the user reported a symptom, start from the symptom table and connect it to the manifest.
4. Answer with a verdict, findings ordered by severity, and a corrected YAML snippet for each **high** finding.

## Checks

**Selectors and labels**
- `spec.selector.matchLabels` matches `template.metadata.labels`, and every Service `selector` matches the pods it should reach. A mismatch means a Service with no endpoints.

**Probes**
- `readinessProbe` present on anything behind a Service.
- `livenessProbe` checks only the process itself. A liveness probe that calls the database or another service is a **high** finding: when the dependency fails, every pod restarts in a loop.
- Slow-starting apps use a `startupProbe` instead of a huge `initialDelaySeconds`.

**Resources**
- Every container has `requests` for CPU and memory, and a memory `limit`.
- A CPU `limit` causes throttling, not kills; flag it only if it is very close to the request on a latency-sensitive service.
- `requests` far above real usage waste capacity; far below cause noisy neighbours and evictions.

**Rollouts and availability**
- Deployments with `replicas: 1` in production → suggest at least 2 plus a `PodDisruptionBudget`.
- `strategy.rollingUpdate.maxUnavailable: 0` for services that must not drop capacity during deploys.
- Image tags are immutable versions (`1.4.2` or a digest), never `latest`.

**Security**
- `securityContext`: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true` where the app allows it, capabilities dropped.
- No `privileged: true` or `hostNetwork`/`hostPath` without a stated reason.
- Secrets are referenced from `Secret` objects or an external secret store, never written in plain text in a ConfigMap or env value. Remind that a Secret is only base64-encoded unless etcd encryption is enabled.

**Scaling**
- An HPA targets a workload that has CPU/memory `requests` (utilization is computed against requests).
- `minReplicas` of the HPA is not lower than what the PodDisruptionBudget needs.

## Symptom table

| Symptom | Look at |
|---|---|
| `Pending` | Requests larger than any node, missing PVC/StorageClass, node selectors or taints |
| `ImagePullBackOff` | Image name/tag, registry credentials (`imagePullSecrets`) |
| `CrashLoopBackOff` | App startup errors (`kubectl logs --previous`), liveness probe too strict, missing config |
| `OOMKilled` | Memory limit vs real usage |
| Service returns nothing | Selector vs pod labels, readiness failing (`kubectl get endpoints`) |
| Slow but no errors | CPU throttling from a tight CPU limit |

## Output format

```markdown
## Verdict
Ready | Ready with fixes | Not ready — one sentence why.

## Findings
1. **[high]** `Deployment/api` — liveness probe calls `/health/db` → restart loop when the database is down. Fix: point liveness to `/live` and move the DB check to readiness.

## Suggested patch
(YAML for the high findings)
```
