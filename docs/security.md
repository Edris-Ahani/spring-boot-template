# Security and limitations

The sample API accepts bearer tokens and has no authentication sessions or cookies. CSRF is disabled for this reason. Revisit this decision and enable appropriate CSRF protection when adding browser sign-in or cookie authentication.

## Access policy

- Catalog reads are intentionally public. Do not add private or tenant-specific data to this endpoint. Review read access against the actual business domain before using it in a product.
- Item creation requires a valid token signature, the correct issuer and audience, valid expiration, and the `catalog:write` scope.
- Undefined routes are denied by default. HTTP Basic, fixed API passwords, and direct password-based user sign-in are not enabled.
- Development Keycloak provides client credentials for a local service only. Do not use that client in a browser or expose its secret through `NEXT_PUBLIC_`.
- Public CORS is not enabled. The frontend connects to the API from its server. New browser consumers require an explicit allowed-origin policy.

## Configuration and logging

Base database and identity settings have no production defaults. An incomplete configuration must fail. The local profile supplies development addresses only; a database password is still required. Production reads the password from a secret-file config tree.

Unexpected failures return generic responses. Application logs record the exception type and request identifier, not exception messages, request bodies, or tokens. SQL bind logging and raw JDBC error logging are disabled. Do not enable DEBUG or TRACE in production. Detailed database diagnostics belong in a controlled environment with restricted access.

The server generates request identifiers and never puts arbitrary client values into MDC. Keep the response `X-Request-ID` for troubleshooting. This identifier does not replace distributed tracing.

## API documentation

Scalar and its contract are disabled by default and explicitly disabled in production Compose. Development permits GET access only to the specified documentation paths; it does not expose arbitrary `/webjars/**` or classpath resources. The backend serves the official bundle. The reference uses no external proxy, contains no service secret, and does not persist tokens in local storage. Its CSP limits scripts and network requests to the current origin. See the [API design guide](api-design.md).

## Deployment boundary

Application containers run with a non-root UID, dropped capabilities, and a read-only root filesystem. This is independent of whether the container engine is rootless; the current engine may be rootful. PostgreSQL needs limited entrypoint capabilities to initialize a data volume.

Management port 9090 is not published on the host. Metrics are available only on the internal network. The application does not require a token to read them, so restrict management network access to trusted services. Public health endpoints do not expose database details. Liveness does not depend on the database; readiness does.

The Caddy example limits HTTP bodies to 64 KB. Tomcat's form limit does not limit every JSON request body; enable the production proxy body limit. Add rate limiting and abuse protection at the proxy or deployment edge according to product requirements.

The current general CSP header is a baseline and does not claim complete script protection against XSS. When adding scripts, analytics, or external resources, design and test a nonce-based CSP appropriate to the rendering architecture. React escapes catalog text and does not render raw HTML.

## Automated security scans

The separate `Security scans` workflow runs on pull requests, pushes to `main`, every Monday at 08:17 UTC, and manual dispatch. It does not publish artifacts or deploy applications. Its token has read-only repository access, and checkout does not persist credentials.

- Gitleaks scans the full fetched Git history with 100% secret redaction. Do not add broad allowlists or upload unredacted secret reports.
- `npm run security:npm` audits the lockfile, including development and optional dependencies. Moderate, high, and critical findings fail the job.
- Maven resolves the actual direct and transitive dependency versions, including test dependencies. A validated conversion supplies those exact coordinates to OSV-Scanner, which fails on known vulnerabilities. An empty or unresolved dependency tree fails instead of producing a misleading clean scan.
- Scanner versions and executable SHA-256 checksums are pinned in the workflow. Review upstream releases and update both together. Network, checksum, dependency resolution, and scanner failures must not be ignored.

The npm override for `minimatch@>=7 <11.0.1` selects `11.0.1` to address [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). It is limited to the affected major versions and preserves older APIs used by other tools. ESLint and TypeScript ESLint still request version 10, so remove the override after their upstream requirements select a patched release and the audit and frontend checks pass.

Use the supported npm version from `package.json` when changing or installing dependencies. CI and the frontend build image install npm 11.21.2 before dependency installation. The lockfile was regenerated with that release because older workspace resolution could retain the vulnerable version despite the override. Audit the resulting lockfile rather than treating the presence of an override as evidence that a fix was applied.

Run `npm run security:npm` locally after dependency updates. To reproduce the Maven scan, install the pinned OSV-Scanner release from the workflow and run these commands from the repository root on Windows:

```bat
cmd /c "backend\mvnw.cmd -B -ntp -f backend\pom.xml org.apache.maven.plugins:maven-dependency-plugin:3.10.0:tree -DoutputType=json -DoutputFile=target/security-dependencies.json"
cmd /c node scripts/maven-scan-input.mjs backend/target/security-dependencies.json backend/target/security-osv.json
cmd /c osv-scanner scan source --lockfile=osv-scanner:backend/target/security-osv.json
cmd /c gitleaks git --redact=100 --no-banner --log-opts=--all .
```

The Git scan covers committed history. Review uncommitted files and the staged diff before a commit or first publication. Never publish a workspace archive containing ignored `.env` files, secrets, local database data, or agent sessions.

Image and operating-system package scanning, image signing, SBOM publication, backup restoration tests, and deployment-specific review remain part of the actual product release process. Maven scanning covers resolved application and test dependencies, not Maven plugins or the host JDK.

## GitHub publication checklist

These settings live on GitHub and cannot be enabled by a committed workflow. This local template does not assume that a remote repository exists or that these protections are active.

1. In the published repository, open **Settings > Advanced Security** and verify secret scanning and [push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection). Enable the available protections and review any alerts; do not routinely bypass a blocked push.
2. Enable Dependabot alerts and security updates. The committed `.github/dependabot.yml` already schedules version-update pull requests; that file does not itself enable every repository security setting.
3. Enable [private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) so the reporting channel in [SECURITY.md](../SECURITY.md) is available.
4. Run both workflows once, then configure a branch ruleset for `main` that requires pull requests and successful verification and security checks. A failed CI job alone does not prevent an administrator from pushing or merging without the appropriate repository rules.
5. Review Git author email addresses, all tracked files, and the staged diff before the first push. An ignore rule does not remove a file already committed to history.
