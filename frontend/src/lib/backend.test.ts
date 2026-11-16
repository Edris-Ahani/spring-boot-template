import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { BackendFailure, backendReady, getCatalog } from "./backend";

beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

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
    expect(console.error).toHaveBeenCalledWith(expect.not.stringContaining("secret"));
  });

  it("retains a validated support reference and status without logging response data", async () => {
    const requestId = "06a64cb2-dcf2-4f69-a3cb-34254ef2c9a1";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ secret: "private-response" },
      { status: 503, headers: { "X-Request-ID": requestId } })));
    await expect(getCatalog(0)).rejects.toMatchObject({ kind: "http", status: 503, requestId });
    const message = vi.mocked(console.error).mock.calls[0]?.[0] as string;
    expect(JSON.parse(message)).toEqual({ event: "backend_request_failed", operation: "catalog", kind: "http", status: 503, requestId });
    expect(message).not.toContain("private-response");
  });

  it("distinguishes malformed response data from network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ secret: "private-response" })));
    await expect(getCatalog(0)).rejects.toMatchObject({ kind: "invalid_response", status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private-network-details")));
    await expect(getCatalog(0)).rejects.toMatchObject({ kind: "network" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-response|private-network-details/);
  });

  it("classifies timeouts and drops arbitrary request identifiers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("private-timeout", "TimeoutError")));
    await expect(getCatalog(0)).rejects.toMatchObject({ kind: "timeout" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-body", { status: 500,
      headers: { "X-Request-ID": "untrusted-private-value" } })));
    await expect(getCatalog(0)).rejects.toBeInstanceOf(BackendFailure);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-|untrusted/);
  });
});
