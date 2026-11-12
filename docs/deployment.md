# Deployment and operations

`infra/compose.yml` is for local development. The independent `infra/production/compose.yml` configuration uses published images, external PostgreSQL, and external OIDC without running the development identity service. This project does not automatically deploy, push, or publish images.

## Prepare production

1. Build API and web images in trusted CI, scan them, and record their digests. Retain the previous image for rollback. CI actions use pinned SHAs and read-only permissions. Dependabot proposes Maven, npm, and action updates. Renovate tracks container images only and requires its own service connection.
2. Provide PostgreSQL with TLS and full certificate validation. External connections require `sslmode=verify-full` and a trusted CA chain. Initial Flyway setup needs a role allowed to create the schema. For stricter separation, run migrations with a dedicated release-job role and disable application migrations with `SPRING_FLYWAY_ENABLED=false`. The runtime role should have only the required table permissions.
3. Configure the issuer, JWK endpoint, and audience against the real HTTPS identity service. Test valid and invalid tokens in staging. Do not promote the local `catalog-writer` client or Keycloak `start-dev` mode to production.
4. Create a private configuration file outside the checkout using `infra/production/.env.example`. `API_IMAGE` and `WEB_IMAGE` must contain actual immutable digests; the example values are intentional non-runnable placeholders. Create the PostgreSQL password file at the specified absolute path and make it readable by the application UID. File-based Compose secrets alone are not an encrypted secret manager.
5. Configure TLS and request body limits in the host proxy. `Caddyfile.example` assumes Caddy runs on the same host. In a containerized proxy, `127.0.0.1` refers to the proxy container itself, so adjust the network accordingly. Application ports bind only to loopback. Enable HSTS only after HTTPS is working.

## Start services

Replace the private configuration path with the actual path. Do not run the example configuration without replacing placeholders.

```bat
cmd /c podman compose --env-file C:\secure\platform.env -f infra\production\compose.yml up -d
```

Production Compose does not merge the development configuration. On Linux, configure the official [Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) integration using the real secret paths, mounts, registry, and networks. A placeholder-filled Quadlet file is not presented as a verified deployment.

## Health and observability

- API: `/livez` checks process liveness; `/readyz` includes database readiness.
- Web: `/api/health/liveness` is independent of the API; `/api/health/readiness` depends on API readiness.
- Metrics: scrape `/actuator/prometheus` on internal port 9090 over a private network.
- ECS JSON logs and request identifiers support log collection. A collector and dashboard are not included.

During shutdown, the application finishes in-flight requests within its configured grace period. The container stop grace period is longer than Spring's shutdown timeout.

## Backups and recovery

Managed PostgreSQL backups with point-in-time recovery are preferred. For a self-managed deployment, transfer encrypted `pg_dump` backups to independent storage, define retention, and test restoration into a separate database. A container volume alone is not a backup. Keycloak credentials, realm configuration, and the identity database also need their own backup and recovery lifecycle.

## Rollback

Before a release, test old and new application versions against the schema. Design migrations using expand/contract. If the schema remains compatible, restore the previous image digest and recreate the service. Application rollback must not delete volumes or run Flyway clean. Destructive migrations do not have an automatically safe rollback and require a data recovery plan.
