import { createServer } from "node:http";

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:19090");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/readyz") {
    response.end(JSON.stringify({ status: "UP" }));
    return;
  }
  if (url.pathname === "/api/v1/catalog" && url.searchParams.get("page") === "1") {
    response.writeHead(503).end(JSON.stringify({ status: 503 }));
    return;
  }
  if (url.pathname === "/api/v1/catalog") {
    response.end(JSON.stringify({ items: [
      { id: "5e2a9001-3489-4982-b3f4-65f7cb3b2071", slug: "reference-platform", name: "Reference Platform", description: "An item served through the backend contract.", createdAt: "2026-11-11T10:00:00Z" },
    ], page: 0, size: 12, totalElements: 1, totalPages: 1 }));
    return;
  }
  response.writeHead(404).end(JSON.stringify({ status: 404 }));
});

server.listen(19090, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
