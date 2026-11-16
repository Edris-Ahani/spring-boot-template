import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (!["quick", "full"].includes(mode) || !process.env.npm_execpath) {
  console.error("Use npm run verify:quick or npm run verify:full");
  process.exitCode = 1;
} else {
  const checks = ["repository:check", "repository:test", "security:test", "api:check", "check", "test",
    mode === "full" ? "backend:verify" : "backend:unit"];
  if (mode === "full") checks.push("api:compatibility:test", "api:compatibility", "build", "test:e2e", "test:api-reference", "test:smoke");
  for (const check of checks) {
    console.log(`Running ${check}`);
    const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", check], {
      stdio: "inherit", timeout: 1_200_000, env: process.env,
    });
    if (result.error || result.status !== 0) {
      console.error(`Verification stopped at ${check}`);
      process.exitCode = result.status || 1;
      break;
    }
  }
}
