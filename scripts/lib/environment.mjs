import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

export function localEnvironment() {
  const filename = path.join(projectRoot, ".env");
  if (!existsSync(filename)) return { ...process.env };
  return { ...parseEnv(readFileSync(filename, "utf8")), ...process.env };
}
