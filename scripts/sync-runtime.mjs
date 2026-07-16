import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "mcp/vendor/client");
const lockPath = resolve(root, "generated/runtime.lock.json");
const candidates = [
  resolve(root, "../../../beatapi-cli/.worktrees/codex-release-ready/packages/client/src"),
  resolve(root, "../../../beatapi-cli/packages/client/src"),
  resolve(root, "../beatapi-cli/packages/client/src"),
];
const source = process.env.BEATAPI_CLIENT_SOURCE
  ? resolve(process.env.BEATAPI_CLIENT_SOURCE)
  : candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
const mode = process.argv.includes("--write") ? "write" : "check";

function files(directory) {
  return readdirSync(directory, { recursive: true })
    .map((entry) => resolve(directory, entry))
    .filter((entry) => statSync(entry).isFile())
    .sort();
}

function treeHash(directory) {
  const hash = createHash("sha256");
  for (const path of files(directory)) {
    hash.update(relative(directory, path));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function gitRef(directory) {
  try {
    return execFileSync("git", ["-C", directory, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

if (mode === "write") {
  if (!existsSync(source)) {
    throw new Error(
      `BeatAPI client source not found: ${source}\nSet BEATAPI_CLIENT_SOURCE to packages/client/src.`,
    );
  }
  const sourceHash = treeHash(source);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(
    lockPath,
    `${JSON.stringify(
      {
        source: "https://github.com/erickkkyt/beatapi-cli/tree/main/packages/client",
        ref: gitRef(source),
        sha256: sourceHash,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Synchronized BeatAPI client runtime (${sourceHash}).`);
  process.exit(0);
}

if (!existsSync(target) || !existsSync(lockPath)) {
  throw new Error("Missing vendored client runtime or generated/runtime.lock.json.");
}
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const targetHash = treeHash(target);
if (lock.sha256 !== targetHash) {
  throw new Error("Vendored BeatAPI client does not match generated/runtime.lock.json.");
}
if (existsSync(source) && treeHash(source) !== targetHash) {
  throw new Error("Vendored BeatAPI client is stale. Run npm run runtime:sync.");
}
console.log(`BeatAPI client runtime verified (${targetHash}).`);
