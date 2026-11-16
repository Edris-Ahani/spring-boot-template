import "server-only";
import { z } from "zod";
import { CATALOG_PAGE_SIZE, catalogPageSchema, type CatalogPage } from "./catalog-schema";

type FailureKind = "configuration" | "network" | "timeout" | "http" | "invalid_response";

export class BackendFailure extends Error {
  constructor(readonly kind: FailureKind, readonly status?: number, readonly requestId?: string) {
    super("The catalog service is unavailable");
    this.name = "BackendFailure";
  }
}

const originSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
    && url.pathname === "/" && !url.search && !url.hash;
}, "BACKEND_URL must be an HTTP origin without credentials or a path");

function backendUrl(path: string): URL {
  const origin = originSchema.safeParse(process.env.BACKEND_URL ?? "http://localhost:8080");
  if (!origin.success) throw new BackendFailure("configuration");
  return new URL(path, origin.data);
}

async function requestJson(url: URL, timeout: number) {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeout) });
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new BackendFailure(timedOut ? "timeout" : "network");
  }
  const identifier = z.uuid().safeParse(response.headers.get("X-Request-ID"));
  const requestId = identifier.success ? identifier.data : undefined;
  if (!response.ok) throw new BackendFailure("http", response.status, requestId);
  try {
    const payload: unknown = await response.json();
    return { payload, status: response.status, requestId };
  } catch (error) {
    const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new BackendFailure(timedOut ? "timeout" : "invalid_response", response.status, requestId);
  }
}

function reportFailure(operation: "catalog" | "readiness", error: unknown): BackendFailure {
  const failure = error instanceof BackendFailure ? error : new BackendFailure("invalid_response");
  console.error(JSON.stringify({ event: "backend_request_failed", operation, kind: failure.kind,
    status: failure.status, requestId: failure.requestId }));
  return failure;
}

export async function getCatalog(page: number): Promise<CatalogPage> {
  try {
    const url = backendUrl("/api/v1/catalog");
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(CATALOG_PAGE_SIZE));
    const { payload, status, requestId } = await requestJson(url, 3000);
    const catalog = catalogPageSchema.safeParse(payload);
    if (!catalog.success) throw new BackendFailure("invalid_response", status, requestId);
    return catalog.data;
  } catch (error) {
    throw reportFailure("catalog", error);
  }
}

export async function backendReady(): Promise<boolean> {
  try {
    const { payload, status, requestId } = await requestJson(backendUrl("/readyz"), 2000);
    if (!z.object({ status: z.literal("UP") }).safeParse(payload).success) {
      throw new BackendFailure("invalid_response", status, requestId);
    }
    return true;
  } catch (error) {
    reportFailure("readiness", error);
    return false;
  }
}
