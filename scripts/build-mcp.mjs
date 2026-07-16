import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "mcp/server.mjs");
const check = process.argv.includes("--check");
const result = await build({
  entryPoints: [resolve(root, "mcp/src/server.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  write: false,
  sourcemap: false,
  minify: false,
  legalComments: "none",
});
const output = result.outputFiles?.[0]?.contents;
if (!output) throw new Error("esbuild did not produce the MCP server bundle.");

if (check) {
  if (!existsSync(outfile) || !readFileSync(outfile).equals(output)) {
    throw new Error("mcp/server.mjs is stale. Run npm run build.");
  }
  console.log("MCP server bundle is current.");
} else {
  writeFileSync(outfile, output);
  console.log(`Built ${outfile}.`);
}
