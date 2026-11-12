import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statfsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { localEnvironment, projectRoot as root } from "./lib/environment.mjs";

const windows = process.platform === "win32";
const command = process.argv[2];
const MINIMUM_BUILD_FREE_BYTES = 2 * 1024 ** 3;

function podmanBinary() {
  if (process.env.PODMAN_BIN) return process.env.PODMAN_BIN;
  const candidate = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Podman", "podman.exe");
  return windows && existsSync(candidate) ? candidate : "podman";
}

function run(binary, args, options = {}) {
  const settings = { cwd: root, stdio: "inherit", timeout: 1_200_000, env: localEnvironment(), ...options };
  let result;
  if (windows && binary.endsWith(".cmd")) {
    if (/["%&|<>^!\r\n]/.test(binary) || args.some((argument) => !/^[a-zA-Z0-9:./=+_-]+$/.test(argument))) {
      throw new Error("Unsafe command argument");
    }
    result = spawnSync("cmd.exe", ["/d", "/s", "/c", `""${binary}" ${args.join(" ")}"`], {
      ...settings, windowsVerbatimArguments: true,
    });
  } else {
    result = spawnSync(binary, args, settings);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status}: ${path.basename(binary)}`);
  return result;
}

function setup() {
  const destination = path.join(root, ".env");
  if (!existsSync(destination)) {
    let content = readFileSync(path.join(root, ".env.example"), "utf8");
    for (const key of ["DATABASE_PASSWORD", "IDENTITY_DATABASE_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "CATALOG_CLIENT_SECRET"]) {
      content = content.replace(`${key}=`, `${key}=${randomBytes(32).toString("hex")}`);
    }
    writeFileSync(destination, content, { flag: "wx", mode: 0o600 });
    console.log("Created local environment with random development credentials. Values are not printed.");
  } else console.log("Local environment already exists; preserved it.");
  const frontendEnvironment = path.join(root, "frontend/.env.local");
  if (!existsSync(frontendEnvironment)) {
    writeFileSync(frontendEnvironment, readFileSync(path.join(root, "frontend/.env.local.example")), { flag: "wx" });
  }
}

function buildStack() {
  for (const [directory, image] of [["backend", "api"], ["frontend", "web"]]) {
    const filesystem = statfsSync(root);
    const availableBytes = filesystem.bavail * filesystem.bsize;
    if (availableBytes < MINIMUM_BUILD_FREE_BYTES) {
      throw new Error("Container builds require at least 2 GiB of free host disk space. Free disk space, or use npm run stack:start with existing images.");
    }
    run(podmanBinary(), ["build", "-f", `${directory}/Containerfile`, "-t", `localhost/foundry-${image}:dev`, "."]);
  }
}

try {
  switch (command) {
    case "setup":
      setup();
      break;
    case "doctor": {
      console.log(`Node.js ${process.versions.node}; expected major version 24`);
      if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Node.js 24 is required");
      const java = process.env.JAVA_HOME
        ? path.join(process.env.JAVA_HOME, "bin", windows ? "java.exe" : "java") : "java";
      try {
        const result = run(java, ["-version"], { timeout: 15000, stdio: "pipe", encoding: "utf8" });
        const version = `${result.stderr ?? ""}${result.stdout ?? ""}`.split(/\r?\n/)[0];
        console.log(version);
        if (!/version "25\./.test(version)) console.log("Native backend development requires JDK 25; container builds use their own JDK.");
      } catch {
        console.log("No usable local JDK; native backend development requires JDK 25. Container builds use their own JDK.");
      }
      const binary = podmanBinary();
      run(binary, ["--version"], { timeout: 15000 });
      console.log("Podman engine rootless status:");
      run(binary, ["info", "--format", "{{.Host.Security.Rootless}}"], { timeout: 15000 });
      run(binary, ["compose", "version"], { timeout: 15000 });
      console.log(`Local environment exists: ${existsSync(path.join(root, ".env"))}`);
      break;
    }
    case "infra-up":
    case "stack-up":
    case "stack-start": {
      if (!existsSync(path.join(root, ".env"))) throw new Error("Run npm run setup first");
      if (command === "stack-up") buildStack();
      const args = ["compose", "--env-file", ".env", "-f", "infra/compose.yml"];
      if (command !== "infra-up") args.push("--profile", "app");
      args.push("up", "-d");
      if (command !== "infra-up") args.push("--no-build");
      run(podmanBinary(), args);
      break;
    }
    case "stack-build":
      buildStack();
      break;
    case "stack-down":
      run(podmanBinary(), ["compose", "--env-file", ".env", "-f", "infra/compose.yml", "--profile", "app", "down"]);
      break;
    case "backend-unit":
    case "backend-verify":
      run(path.join(root, "backend", windows ? "mvnw.cmd" : "mvnw"), ["-B", "-ntp", command === "backend-unit" ? "test" : "verify"], {
        cwd: path.join(root, "backend"),
        env: { ...process.env, SPRING_PROFILES_ACTIVE: "test", DEBUG: "false" },
      });
      break;
    default:
      throw new Error("Expected doctor, setup, infra-up, stack-build, stack-up, stack-start, stack-down, backend-unit, or backend-verify");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "The platform command failed");
  process.exitCode = 1;
}
