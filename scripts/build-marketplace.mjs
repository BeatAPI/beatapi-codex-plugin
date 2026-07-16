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
const dist = resolve(root, "dist");
const marketplaceRoot = resolve(dist, "marketplace");
const pluginRoot = resolve(
  marketplaceRoot,
  "plugins/beatapi-codex-plugin",
);
const archive = resolve(dist, "beatapi-codex-plugin-marketplace.zip");
const requiredPaths = [
  ".codex-plugin",
  ".mcp.json",
  "assets",
  "contract",
  "generated",
  "skills",
  "mcp/server.mjs",
  "README.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "LICENSE",
];

rmSync(marketplaceRoot, { recursive: true, force: true });
mkdirSync(pluginRoot, { recursive: true });
for (const relativePath of requiredPaths) {
  const source = resolve(root, relativePath);
  if (!existsSync(source)) throw new Error(`Missing release artifact: ${relativePath}`);
  cpSync(source, resolve(pluginRoot, relativePath), { recursive: true });
}

const marketplacePath = resolve(
  marketplaceRoot,
  ".agents/plugins/marketplace.json",
);
mkdirSync(dirname(marketplacePath), { recursive: true });
writeFileSync(
  marketplacePath,
  `${JSON.stringify(
    {
      name: "beatapi-local",
      interface: { displayName: "BeatAPI" },
      plugins: [
        {
          name: "beatapi-codex-plugin",
          source: {
            source: "local",
            path: "./plugins/beatapi-codex-plugin",
          },
          policy: {
            installation: "AVAILABLE",
            authentication: "ON_USE",
          },
          category: "Creativity",
        },
      ],
    },
    null,
    2,
  )}\n`,
);
rmSync(archive, { force: true });
execFileSync("zip", ["-X", "-q", "-r", archive, "marketplace"], { cwd: dist });
console.log(`Built local Codex marketplace: ${marketplaceRoot}`);
console.log(`Built marketplace archive: ${archive}`);
