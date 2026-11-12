# Verification record

## English documentation and shared agent policy: November 12, 2026

All maintained documentation was translated into English, including the architecture, development, security, deployment, API, agent tooling, source, ADR, and historical verification documents. Existing commands, technical decisions, dates, and observed test outcomes were preserved. The former translated README filename now contains an English pointer to the canonical README.

AGENTS.md defines the mandatory repository language policy. Claude Code and Gemini entry points import it; Cursor's always-applied rule and GitHub Copilot's repository instructions reference it. These files were checked statically; sessions were not launched in each AI client.

| Check | Observed result |
| --- | --- |
| Repository validator | Passed for maintained UTF-8 text, file names, JSON, local references, agent imports, and Cursor frontmatter |
| Validator regression suite | Nine tests passed; zero failures, cancellations, or skips |
| Independent Arabic-script search | No matches in maintained project files |
| Negative language cases | Persian Markdown with an RTL wrapper, source comments, Cursor rules, environment examples, presentation forms, supplementary Arabic characters, and other non-Latin letters were rejected |
| Private and generated files | Fixture checks confirmed that secrets, private environments, build output, dependencies, binary assets, and pinned vendor references remained excluded |

A dependency-free repository CI job now runs both the validator and its regression suite. The GitHub workflow was not executed remotely. Application behavior was not changed, so backend, frontend, container, and browser suites were not repeated for this documentation migration. No commit, push, deployment, or machine configuration change was performed.

## Scalar and shared API contract: November 12, 2026

| Check | Observed result |
| --- | --- |
| Maven `package` with Temurin 25.0.5 in Podman | JAR built successfully; 35 tests, zero failures, errors, or skips |
| Contract and problem tests | Registered operations match OpenAPI; success responses, 400, 401, 403, 406, 409, 415, and 500, request correlation, and sanitized details verified |
| Documentation access | Scalar and the contract readable when enabled; controller absent and access denied even with a valid token by default |
| Published specification | `/docs/openapi.yaml` byte-identical to the canonical contract |
| Redocly CLI 2.77.0 | Valid contract and examples under `recommended-strict`, with documented exceptions in `redocly.yaml` |
| openapi-typescript 7.13.0 | Types regenerated and checked for drift |
| TypeScript 5.9.3 | Strict checks passed for the two new browser configuration/test files; the complete frontend check was not repeated in this phase |
| Playwright 1.65.0 with Edge | Four desktop/mobile checks passed: Scalar rendering and real public GET execution, without a Bearer header, external requests, JavaScript errors, or CSP violations |
| Smoke test against the new JAR | Scalar, contract, correlated errors, real Keycloak, PostgreSQL persistence and uniqueness, and Next.js rendering passed |

Initial browser checks exposed Scalar automatic initialization interference and a placeholder token being sent for public GET requests. The host element identifier and global preferred authentication configuration were corrected. All four final browser tests passed without weakening CSP.

The initial Windows bind-mounted build failed on file metadata operations. Building in a temporary Linux directory succeeded. Tests used the existing JDK 25 image without mounting an engine socket. Testcontainers and `mvn verify` were not rerun in this phase; smoke tests used real PostgreSQL and Keycloak from the existing stack. Earlier integration checks have separate dated results below.

The new JAR ran temporarily on port 18080 with a non-root UID and read-only filesystem. Verification containers were removed afterward; original stack images and volumes were preserved. The main API image was not rebuilt in this phase, so publishing these source changes on port 8080 requires a rebuild. Host free space was below the build guard's 2 GiB minimum. Each smoke run created one local test record.

Contract validation and Scalar browser checks were added to CI, but the GitHub workflow was not executed in this phase. Both READMEs and the API guide were updated at that time. No commit or push was performed.

## Completed stack verification: November 12, 2026

| Check | Observed result |
| --- | --- |
| `mvn verify` on Corretto 25.0.5 | Passed: 24 unit, architecture, and security tests plus one integration test; zero failures, errors, or skips |
| Real PostgreSQL with Testcontainers | Flyway, schema validation, creation, reads, and uniqueness passed |
| Backend image | Built with Temurin 25 and ran with a non-root UID and read-only filesystem |
| Frontend image | Next.js built on Alpine; standalone output ran with a non-root UID and read-only filesystem |
| Linux lint and TypeScript | Passed |
| Linux Vitest | 15 tests passed |
| Complete Compose stack | PostgreSQL, identity database, Keycloak, API, and web started |
| `npm run test:smoke` | Liveness, readiness, anonymous write denial, real Keycloak token issuance, persistence, uniqueness, and Next.js rendering passed |
| `npm run stack:start` | Existing images started successfully without rebuilding |
| Low disk guard | Below 2 GiB free, the build stopped with a clear message before invoking Podman; nonzero exit was the expected result |

The Podman engine and standard named pipe were available during this verification, and Testcontainers ran natively on Windows. The Adoptium JDK download timed out; official Corretto was downloaded and its SHA-256 verified instead. Machine configuration and the WSL filesystem were not changed during this continuation.

A conflict with host port 5432 was resolved by publishing development PostgreSQL on 15432. The existing service was not stopped, and generated credentials were preserved. Smoke testing added local catalog items. Disk usage still requires attention: builds are sequential and guarded. The temporary frontend build layer was removed after testing while the runtime image was retained.

The GitHub workflow was updated to test the complete stack but was not run on GitHub. Production deployment, TLS for a real domain, and backup restoration were not verified locally. No commit, push, or external deployment was performed.

## Initial verification: November 11, 2026

Environment: Windows.

| Check | Observed result |
| --- | --- |
| Backend Surefire on JDK 25.0.5 | 24 tests passed, with zero failures, errors, or skips |
| Real JWT validation | Valid tokens accepted; invalid audience, issuer, expiration, and signature rejected, within the 24 tests above |
| Vitest | 15 tests passed across two files |
| ESLint and TypeScript | Passed |
| Next.js production build | Passed |
| Playwright with installed Edge | Eight desktop/mobile checks passed against a controlled test API |
| Generated types versus OpenAPI | Passed |
| Development Compose validation | Passed with the installed provider |
| Independent production Compose validation | Passed with test values, without starting services |
| `npm audit --omit=dev` | Zero known vulnerabilities at verification time |
| Source language, Markdown direction, and local links | Passed under the policy in effect at that time |
| Repeated setup | Existing configuration preserved without overwriting |
| PostgreSQL Testcontainers | Failed: a Docker-compatible runtime was unavailable; one error and zero skips |
| Podman image builds | Failed: insufficient disk space, read-only filesystem errors, and engine connectivity loss |

## Initial environment limitations: November 11, 2026

Chromium download failed with `ENOSPC`; browser tests used the installed Edge browser. Concurrent image builds consumed remaining space, and Podman/WSL became unavailable. Temporary JDK files and reproducible outputs were removed. Restarting the machine failed with `Wsl/Service/CreateInstance/E_FAIL`. The WSL filesystem was not repaired, removed, or recreated.

The integration test was not reported as passing or skipped. Passing 24 backend tests did not establish that `mvn verify` succeeded. Likewise, a local Next.js build did not establish that its Linux image ran successfully. The CI workflow was prepared but not executed on GitHub.

After the initial environment limitations, these commands were recommended. Backend verification and actual stack execution were subsequently confirmed on November 12, as recorded above:

```bat
cmd /c npm ci
cmd /c npm run backend:verify
cmd /c npm run stack:up
```

Native backend verification requires JDK 25 and a compatible container socket. The [development guide](development.md) explains Podman setup and the difference between CLI connectivity and socket availability. No commit, push, or deployment was performed.
