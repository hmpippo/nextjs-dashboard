# Security Review

## Scope and method

Read-only source review focused on attack paths that could compromise the host or expose crypto wallet secrets, including authentication, Server Actions, application configuration, dependencies, and the development container configuration.

This was not a penetration test. The application was not run against a live database or deployment, and no credentials, local environment values, or wallet material were accessed.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | [app/lib/actions.ts](./app/lib/actions.ts) | 38-119 | Invoice create/update/delete Server Actions write to the database without checking authentication. The proxy gates by request path, not by action; an unauthenticated caller may invoke these mutations through a public route and create, alter, or delete invoice records. | 8/10 |

### 1. Invoice mutations do not enforce authentication

The `createInvoice`, `updateInvoice`, and `deleteInvoice` Server Actions issue database writes without calling `auth()` or checking authorization. The proxy's `authorized` callback only rejects unauthenticated requests whose path starts with `/dashboard` ([auth.config.ts](./auth.config.ts), [proxy.ts](./proxy.ts)). Since Server Actions are server endpoints and the path-based proxy is not an action-level authorization check, the mutation functions should not rely on the dashboard route gate.

The actions are wired to client forms in [app/ui/invoices/create-form.tsx](./app/ui/invoices/create-form.tsx), [app/ui/invoices/edit-form.tsx](./app/ui/invoices/edit-form.tsx), and [app/ui/invoices/buttons.tsx](./app/ui/invoices/buttons.tsx). Input validation and parameterized SQL are present, but they do not prevent unauthorized calls.

**Impact:** An unauthenticated remote caller able to invoke these actions could create invoices, change invoice fields, or delete invoices. No tenant/ownership checks exist either; if the application later serves multiple users or organizations, add those checks alongside authentication.

**Recommended remediation:** Enforce authentication inside every data-mutating Server Action and authorize the requested invoice/customer against the caller's permitted scope. Keep the proxy check as defense in depth, not as the action's authorization boundary.

## Wallet and host-compromise assessment

- No wallet integration or references to private keys, mnemonics, or seed phrases were found in the reviewed application source.
- No application code paths for shell/process execution or dynamic evaluation were found in the reviewed source.
- The local `.env` file is ignored by [`.gitignore`](./.gitignore); its contents were not inspected.
- The untracked [.devcontainer/devcontainer.json](./.devcontainer/devcontainer.json) selects a container image from a registry mirror and does not pin an image digest. Its provenance was not independently verified. Treat this as a supply-chain trust consideration when creating the dev container, not as evidence that the image is malicious. The config was already untracked and is not included in this report commit.
- The dependency manifest uses `latest` specifiers for Next.js and React, while [pnpm-lock.yaml](./pnpm-lock.yaml) currently pins resolved versions. Use frozen-lockfile installs and review dependency updates; this review did not query an external vulnerability database.

## Coverage limitations

- The Server Action issue was assessed from source; it was not exercised against a running deployment or database.
- No credentials, production environment, host/container runtime, or wallet were available or accessed.
- Findings do not establish whether a deployed instance is reachable or exploitable in its specific infrastructure configuration.
- This report records confirmed source-level concerns and relevant unverified supply-chain risk, not a guarantee that the repository or its deployment is free of vulnerabilities.
