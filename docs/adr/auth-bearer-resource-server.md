# Bearer resource server security

- Status: accepted for the initial example
- Created and updated: 2026-11-11

## Context

The template needs a protected write operation without inventing an account system for an undefined product. Public catalog reads demonstrate the sample; this access policy is unsuitable for private data.

## Criteria and alternatives

A resource server delegates identity to an independent issuer, avoids storing user passwords in the API, and makes scopes testable. It depends on issuer configuration and key rotation. Custom JWT issuance and sign-in provide more control but add password management, account recovery, and revocation responsibilities. Browser sessions suit interactive web sign-in but require explicit cookie, CSRF, and identity-provider decisions.

## Decision

Spring Security validates JWTs and restricts catalog creation to `catalog:write`. Local Keycloak has a service client only. The frontend reads public data on the server and receives no secret. There are no authentication cookies, and CSRF is disabled only for this bearer-based contract.

## Consequences

The API can be tested without storing user passwords. Interactive browser sign-in, product RBAC, multitenancy, and record ownership remain undefined and must be added according to actual requirements. Making catalog data private requires coordinated changes to the API access policy and frontend identity propagation.

## Evidence and files

The [official Spring Security documentation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html), `SecurityConfiguration`, and `CatalogJwtTest` provide source and project evidence. See the [security guide](../security.md) for limitations.
