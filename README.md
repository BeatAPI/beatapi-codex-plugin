# BeatAPI Codex Plugin

Create and manage BeatAPI AI Music Video and Ecommerce Video workflows directly
from Codex. The plugin combines the canonical `beatapi-video` Skill with a
bundled local MCP server and uses the same API key as the BeatAPI CLI.

## What users can do

- inspect workflows, credits, usage, and concurrency;
- upload local images, audio, and SRT files;
- create automatic or manual Music Video tasks;
- inspect, edit, materialize, and compose storyboard shots;
- create Ecommerce Video tasks;
- poll asynchronous tasks until a terminal or actionable state;
- create, inspect, update, and delete webhook endpoints.

The plugin does not put API keys in prompts or MCP tool arguments. It first uses
`BEATAPI_API_KEY`; otherwise its local MCP server invokes the installed
`beatapi` CLI, which reads the key saved by `beatapi auth login` from the
operating-system credential manager.

## Install for Codex desktop

Prerequisites:

- Node.js 20.19+ or 22.12+;
- Codex/ChatGPT desktop with plugin support;
- a BeatAPI account and API key from [BeatAPI](https://beatapi.io).

From a source checkout:

```bash
npm ci
npm run verify
codex plugin marketplace add ./dist/marketplace
codex plugin add beatapi-codex-plugin@beatapi-local
```

Then authenticate once in a terminal:

```bash
npm install --global beatapi
beatapi auth login
```

Alternatively, set `BEATAPI_API_KEY` in the environment that launches Codex.
Never paste the key into a conversation.

Restart the desktop app after installation. Useful starter requests include:

- “Use `$beatapi-video` to create a music video from my images and audio.”
- “Turn these product photos into a 15-second 9:16 ad.”
- “Check my BeatAPI credits and the status of task `task_...`.”

## Package layout

- `.codex-plugin/plugin.json` — Codex presentation and component manifest.
- `.mcp.json` — local stdio MCP configuration.
- `mcp/server.mjs` — dependency-free bundled MCP runtime.
- `skills/beatapi-video/` — synchronized canonical BeatAPI Skill.
- `contract/` — locked BeatAPI OpenAPI snapshot.
- `generated/` — Skill and client-runtime provenance locks.
- `submission/` — official Plugin Directory listing and review materials.

Do not edit `skills/beatapi-video` or `mcp/vendor/client` directly:

```bash
npm run skill:sync
npm run runtime:sync
```

## Publishing paths

This repository supports two distinct release paths:

1. **Codex desktop/local marketplace.** `npm run marketplace:build` creates a
   complete installable marketplace and ZIP under `dist/`.
2. **Public OpenAI Plugin Directory.** `npm run submission:build` creates a
   Skills-only ZIP that can be uploaded to the official submission portal.

The local plugin includes a stdio MCP server. Official MCP-backed public review
requires a separately deployed public HTTPS MCP server, domain verification,
and reviewer authentication. This repository does not claim that hosted
infrastructure; see [submission/SUBMISSION.md](submission/SUBMISSION.md).

## Verification

```bash
npm run verify
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

Verification checks OpenAPI drift, synchronized Skill/client sources,
TypeScript, MCP protocol behavior, credential redaction, webhook-secret file
permissions, deterministic bundles, marketplace packaging, and submission
packaging.
