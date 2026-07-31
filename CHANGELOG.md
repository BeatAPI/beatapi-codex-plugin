# Changelog

## Unreleased

## 0.2.0 - 2026-07-31

- Added Realtime Video session create, read, and close MCP tools.
- Store the one-time Realtime browser client secret in a mode-`0600` local file
  and keep it out of model-visible tool results.
- Synchronized the canonical Skill, official client runtime, and public OpenAPI
  contract to the Realtime baseline.
- Added exact-origin, duration, idempotency, billing, and browser trust-boundary
  guidance.
- Prefer bundled MCP execution in the canonical Skill with CLI fallback.

## 0.1.0 - 2026-07-17

- Added the canonical `beatapi-video` Skill and eight review/evaluation cases.
- Added a bundled local stdio MCP server with all 16 BeatAPI launch operations.
- Reused `BEATAPI_API_KEY` or the API key stored by the official BeatAPI CLI.
- Added exact OpenAPI and generated-client provenance locks.
- Added secure one-time webhook-secret storage with rollback on failure.
- Added production brand assets, marketplace packaging, CI, security guidance,
  and official Skills-only Plugin Directory submission materials.
