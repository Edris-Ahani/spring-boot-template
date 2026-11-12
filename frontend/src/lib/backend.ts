import "server-only";
import { z } from "zod";
import { catalogPageSchema, type CatalogPage } from "./catalog-schema";

const originSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
    && url.pathname === "/" && !url.search && !url.hash;
}, "BACKEND_URL must be an HTTP origin without credentials or a path");

function backendUrl(path: string): URL {
  return new URL(path, originSchema.parse(process.env.BACKEND_URL ?? "http://localhost:8080"));
}

export async function getCatalog(page: number): Promise<CatalogPage> {
  const url = backendUrl("/api/v1/catalog");
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", "12");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error("The catalog service is unavailable");
  return catalogPageSchema.parse(await response.json());
}

export async function backendReady(): Promise<boolean> {
  try {
    const response = await fetch(backendUrl("/readyz"), {
      cache: "no-store", signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const payload: unknown = await response.json();
    return z.object({ status: z.literal("UP") }).safeParse(payload).success;
  } catch {
    return false;
  }
}
