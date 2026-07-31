---
name: beatapi-video
description: Create, monitor, and troubleshoot BeatAPI Music Video, Ecommerce Video, and Realtime Video sessions through bundled BeatAPI MCP tools when available or the official BeatAPI CLI as a fallback. Use when a user wants to generate an AI video, create or inspect a realtime browser session, upload workflow media, check credits and concurrency, manage storyboard shots, retrieve hosted output, configure webhooks, or diagnose a BeatAPI API error.
---

# BeatAPI Video

Treat the bundled OpenAPI snapshot as the exact API contract.

## Choose the execution adapter

Prefer the bundled BeatAPI MCP tools when `beatapi_check_setup` is available.
Use `beatapi_*` tools for the complete workflow and do not shell out to the CLI
for the same operation.

When BeatAPI MCP tools are unavailable, fall back to the official `beatapi` CLI.
The Skills-only distribution requires Node.js 20.19+ or 22.12+ and
`npm install --global beatapi`.

## Protect the account

- Use the customer's existing BeatAPI account and API key.
- Read credentials only through the MCP setup tool, `beatapi auth`, or
  `BEATAPI_API_KEY`.
- Never request a key in chat, pass it as a command argument, print it, or place
  it in JSON, source files, logs, screenshots, or issue text.
- Treat task creation, shot editing, and composition as paid mutations.
- Consider an explicit request to generate or edit authorization for that
  operation. Ask before spending credits only when the request is ambiguous,
  material settings are missing, or the operation expands beyond the request.
- Never describe a queued or processing task as a completed video.

## Establish readiness

1. With MCP, call `beatapi_check_setup`. If configured, use its usage result;
   otherwise follow its exact next step.
2. Without MCP, check `beatapi --version`, then run `beatapi auth status`.
3. If the CLI is missing, instruct the user to install it; install it only when
   the user has authorized environment changes.
4. If authentication is absent, ask the user to run `beatapi auth login` in a
   terminal or set `BEATAPI_API_KEY`. Do not ask them to paste the key into the
   conversation.
5. Before a paid operation, call `beatapi_get_usage` or run `beatapi usage`.
   Check both credit balance and active concurrency.

Skip credential checks for anonymous `beatapi_list_workflows` or
`beatapi workflows list`.

## Choose the workflow

- Choose Music Video when the user supplies audio plus 1-7 visual references.
- Choose automatic Music Video composition unless the user wants to inspect,
  select, reorder, or edit storyboard shots.
- Choose manual Music Video composition for those storyboard controls. Read
  [manual-music-video.md](references/manual-music-video.md) before executing.
- Choose Ecommerce Video when the user supplies product images and wants a
  short product advertisement.
- Choose Realtime Video when the user needs a short-lived interactive browser
  session. Read [realtime-video.md](references/realtime-video.md) first. The
  agent may manage the server-side session but does not own camera permission,
  WebRTC negotiation, or browser rendering.
- Do not force unrelated video editing, transcription, generic image
  generation, or non-BeatAPI API design tasks into this Skill.

Read [credits-and-limits.md](references/credits-and-limits.md) when estimating
cost or validating media and generation settings.

## Prepare inputs

1. Inspect local paths and public URLs before spending credits.
2. Upload each supported local image, audio file, or SRT subtitle with
   `beatapi_upload_file`. With the CLI fallback:

   ```bash
   beatapi files upload ./input.mp3
   ```

3. Replace local paths in the request with returned public HTTPS URLs.
4. Create a temporary JSON request by copying the relevant template from
   `assets/`; never modify the bundled template in place.
5. Include only fields supported by
   [beatapi.openapi.yaml](references/beatapi.openapi.yaml).

Reject unsupported media, private-network URLs, localhost URLs, data URLs, and
unknown fields instead of guessing.

## Execute automatic Music Video

1. Copy `assets/music-video.auto.json` to a temporary working file.
2. Fill the uploaded/public URLs and requested controls.
3. With MCP, call `beatapi_create_music_video` with the prepared fields.
   With the CLI fallback:

   ```bash
   beatapi music-video create --file /tmp/beatapi-music-video.json
   ```

4. Preserve the returned task ID.
5. Wait with `beatapi_wait_for_task` using a 5-10 second interval and bounded
   attempt count. With the CLI fallback:

   ```bash
   beatapi tasks wait TASK_ID --interval 7000 --attempts 120
   ```

## Execute Ecommerce Video

1. Copy `assets/ecommerce-video.json` to a temporary working file.
2. Fill the product image URLs, duration, prompt, aspect ratio, and language.
3. With MCP, call `beatapi_create_ecommerce_video`, then
   `beatapi_wait_for_task`. With the CLI fallback:

   ```bash
   beatapi ecommerce-video create --file /tmp/beatapi-ecommerce-video.json
   beatapi tasks wait TASK_ID --interval 7000 --attempts 120
   ```

## Handle read-only and integration requests

- Inspect one task with `beatapi_get_task` or `beatapi tasks get TASK_ID`.
- Discover workflows with `beatapi_list_workflows` or
  `beatapi workflows list`.
- Inspect balance and concurrency with `beatapi_get_usage` or `beatapi usage`.
- Manage webhook endpoints with the `beatapi_*_webhook` tools or
  `beatapi webhooks list|create|get|update|delete`.
- Read [api-workflows.md](references/api-workflows.md) for the exact MCP, CLI,
  and endpoint map.
- For application code, use the `beatapi-client` package or the bundled
  OpenAPI contract. Do not embed the user's API key in client-side code.

## Manage a Realtime Video session

1. Confirm the caller supplied one or more exact HTTPS browser origins and a
   maximum duration of 15, 60, or 300 seconds.
2. Treat create as a paid mutation. Use a stable idempotency key for retries.
3. With MCP, call `beatapi_create_realtime_session`. With the CLI fallback:

   ```bash
   beatapi realtime sessions create --duration 60 \
     --origin https://app.example.com \
     --idempotency-key rt_request_123
   ```

4. Never copy the long-lived `sk_` key into browser code. The create response
   may contain a one-time, short-lived `client_secret`; disclose it only through
   the user's trusted server-to-browser flow, never in chat or logs.
5. Inspect or close with `beatapi_get_realtime_session` /
   `beatapi_close_realtime_session`, or `beatapi realtime sessions get|close`.
6. A `ready` session is allocated, not proof of camera access, WebRTC
   connection, first remote frame, or billing activation.

## Verify the result

Return:

- workflow and task ID;
- final or actionable status;
- hosted output URL(s) only when present;
- credits charged, settled, or refunded when useful;
- `request_id`, `error_code`, and `error_message` for failures;
- the next required action for `storyboard_ready` or `requires_action`.

Call a generation complete only when status is `succeeded` and
`output.media[]` contains hosted media. Treat `GET /v1/tasks/{task_id}` as the
source of truth even when webhooks are configured.

## Respond to failures

Read [errors-and-recovery.md](references/errors-and-recovery.md) before
retrying. In particular:

- do not retry authentication, validation, insufficient-credit, or
  concurrency errors unchanged;
- honor `Retry-After` for rate limits;
- bound retries for network and retryable server failures;
- preserve the request ID without exposing credentials or private media.
