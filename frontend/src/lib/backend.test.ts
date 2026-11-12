import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { backendReady, getCatalog } from "./backend";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("backend adapter", () => {
  it("sends uncached server-side requests to the configured origin", async () => {
    vi.stubEnv("BACKEND_URL", "http://localhost:18080");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ items: [], page: 2, size: 12, totalElements: 0, totalPages: 0 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await getCatalog(2)).page).toBe(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("http://localhost:18080/api/v1/catalog?page=2&size=12");
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("does not treat an HTTP failure as healthy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    expect(await backendReady()).toBe(false);
    await expect(getCatalog(0)).rejects.toThrow("unavailable");
  });

  it("does not treat arbitrary successful JSON as readiness", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "ok" })));
    expect(await backendReady()).toBe(false);
  });

  it("contains connection failures at the readiness boundary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));
    expect(await backendReady()).toBe(false);
  });

  it("rejects origins containing credentials before a request is sent", async () => {
    vi.stubEnv("BACKEND_URL", "http://user:secret@localhost:8080");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(getCatalog(0)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
