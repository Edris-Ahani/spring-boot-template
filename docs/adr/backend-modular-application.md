# Modular backend application

- Status: accepted for the starter template
- Created and updated: 2026-11-11

## Context

The requested infrastructure uses Spring Boot, Next.js, and Podman. A business domain and multiple independent teams have not been defined. Packaging and transaction placement must be decided now so the catalog example can be extended.

## Criteria and alternatives

A modular application has one deployable artifact and local transactions, keeping Windows development straightforward. Its tradeoffs are a shared deployment lifecycle and the need to enforce code boundaries. Microservices offer independent deployment and fault isolation, but would add networking, service identity, and consistency costs without a demonstrated requirement.

## Decision

Use feature packages, a framework-independent domain, transactional application services, and a JPA adapter. ArchUnit checks forbidden dependencies. Do not add Spring Modulith or an event bus until real communication between multiple features requires it.

## Consequences

Feature changes stay localized. All features share a deployment lifecycle. If real team or operational boundaries emerge, evaluate service extraction along the existing feature boundary.

## Evidence and files

The project requirements and `backend/src/main/java/com/acme/platform/catalog` provide project evidence. The document structure is inspired by Han; the complete plugin was not executed. See the [architecture guide](../architecture.md) and `ArchitectureTest` for executable boundary rules.
