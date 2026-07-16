# Changelog

## Unreleased

- Prefer bundled MCP execution in the canonical Skill with CLI fallback.
- Distinguish missing authentication from unexpected CLI runtime failures.
- Align MCP usage fixtures with the current BeatAPI OpenAPI contract.
- Clarify that the public Skills-only package does not bundle the local MCP
  server and may require the official CLI.

## 0.1.0 - 2026-07-17

- Added the canonical `beatapi-video` Skill and eight review/evaluation cases.
- Added a bundled local stdio MCP server with all 16 BeatAPI launch operations.
- Reused `BEATAPI_API_KEY` or the API key stored by the official BeatAPI CLI.
- Added exact OpenAPI and generated-client provenance locks.
- Added secure one-time webhook-secret storage with rollback on failure.
- Added production brand assets, marketplace packaging, CI, security guidance,
  and official Skills-only Plugin Directory submission materials.
