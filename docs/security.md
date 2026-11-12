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

Vulnerability scans, image signing, SBOM generation, backup restoration tests, and legal requirements belong in the actual product release process. The current CI runs tests and builds without publishing anything.
