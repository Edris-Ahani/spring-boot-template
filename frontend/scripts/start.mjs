import { cp, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const server = new URL(".next/standalone/frontend/server.js", root);
await access(server);
await Promise.all([
  cp(new URL(".next/static", root), new URL(".next/standalone/frontend/.next/static", root), { recursive: true }),
  cp(new URL("public", root), new URL(".next/standalone/frontend/public", root), { recursive: true }),
]);
const processHandle = spawn(process.execPath, [fileURLToPath(server)], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1", PORT: process.env.PORT ?? "3000" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => processHandle.kill(signal));
processHandle.on("exit", (code) => { process.exitCode = code ?? 1; });
