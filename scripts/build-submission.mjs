import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist/submission");
const stage = resolve(dist, "beatapi-video");
const zip = resolve(dist, "beatapi-video-skill.zip");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(resolve(root, "skills/beatapi-video"), stage, { recursive: true });
writeFileSync(
  resolve(dist, "README.txt"),
  [
    "BeatAPI official Plugin Directory submission artifact",
    "",
    "Submission type: Skills only",
    "Upload: beatapi-video-skill.zip",
    "Portal: https://platform.openai.com/plugins",
    "The local Codex plugin also includes a stdio MCP server. Public MCP review",
    "requires a separately deployed HTTPS MCP server and is intentionally not",
    "claimed by this Skills-only package.",
    "",
  ].join("\n"),
);
if (!existsSync(stage)) throw new Error("Submission staging directory is missing.");
execFileSync("zip", ["-X", "-q", "-r", zip, "beatapi-video"], { cwd: dist });
console.log(`Built official Skills-only submission package: ${zip}`);
