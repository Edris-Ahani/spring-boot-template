import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function createScanInput(tree) {
  const packages = new Map();

  function visit(node, isRoot = false) {
    if (!node || typeof node !== "object") throw new Error("Invalid Maven dependency node");
    if (!isRoot) {
      for (const field of ["groupId", "artifactId", "version"]) {
        if (typeof node[field] !== "string" || !node[field].trim() || /\$\{/.test(node[field])) {
          throw new Error(`Missing or unresolved Maven ${field}`);
        }
      }
      const name = `${node.groupId}:${node.artifactId}`;
      packages.set(`${name}:${node.version}`, {
        package: { ecosystem: "Maven", name, version: node.version },
      });
    }
    if (node.children !== undefined && !Array.isArray(node.children)) {
      throw new Error("Invalid Maven dependency children");
    }
    for (const child of node.children ?? []) visit(child);
  }

  visit(tree, true);
  if (!packages.size) throw new Error("No resolved Maven dependencies to scan");
  return { results: [{ packages: [...packages.values()] }] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4) {
    throw new Error("Usage: node scripts/maven-scan-input.mjs <dependency-tree.json> <osv-input.json>");
  }
  const result = createScanInput(JSON.parse(await readFile(input, "utf8")));
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Prepared ${result.results[0].packages.length} resolved Maven dependencies, including test dependencies`);
}
