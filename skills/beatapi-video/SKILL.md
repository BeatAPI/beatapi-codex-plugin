---
name: beatapi-video
description: Create, monitor, and troubleshoot BeatAPI Music Video and Ecommerce Video workflows through the official BeatAPI CLI. Use when a user wants to turn images and audio into an AI music video, make a product ad from product images, upload local workflow media, estimate or check BeatAPI credits and concurrency, manage manual storyboard shots, wait for a task, retrieve hosted output, configure webhooks, or diagnose a BeatAPI API error.
---

# BeatAPI Video

Use the `beatapi` CLI as the execution layer. Treat the bundled OpenAPI
snapshot as the exact API contract.

## Protect the account

- Use the customer's existing BeatAPI account and API key.
- Read credentials only through `beatapi auth` or `BEATAPI_API_KEY`.
- Never request a key in chat, pass it as a command argument, print it, or place
  it in JSON, source files, logs, screenshots, or issue text.
- Treat task creation, shot editing, and composition as paid mutations.
- Consider an explicit request to generate or edit authorization for that
  operation. Ask before spending credits only when the request is ambiguous,
  material settings are missing, or the operation expands beyond the request.
- Never describe a queued or processing task as a completed video.

## Establish readiness

1. Check that the CLI exists with `beatapi --version`.
2. If missing, instruct the user to install it with
   `npm install --global beatapi`; install it only when the user has authorized
   environment changes.
3. Run `beatapi auth status` before authenticated work.
4. If authentication is absent, ask the user to run `beatapi auth login` in a
   terminal or set `BEATAPI_API_KEY`. Do not ask them to paste the key into the
   conversation.
5. Run `beatapi usage` before a paid operation. Check both credit balance and
   active concurrency.

Skip credential checks for anonymous `beatapi workflows list`.

## Choose the workflow

- Choose Music Video when the user supplies audio plus 1-7 visual references.
- Choose automatic Music Video composition unless the user wants to inspect,
  select, reorder, or edit storyboard shots.
- Choose manual Music Video composition for those storyboard controls. Read
  [manual-music-video.md](references/manual-music-video.md) before executing.
- Choose Ecommerce Video when the user supplies product images and wants a
  short product advertisement.
- Do not force unrelated video editing, transcription, generic image
  generation, or non-BeatAPI API design tasks into this Skill.

Read [credits-and-limits.md](references/credits-and-limits.md) when estimating
cost or validating media and generation settings.

## Prepare inputs

1. Inspect local paths and public URLs before spending credits.
2. Upload each supported local image, audio file, or SRT subtitle:

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
3. Create the task:

   ```bash
   beatapi music-video create --file /tmp/beatapi-music-video.json
   ```

4. Preserve the returned task ID.
5. Wait with a 5-10 second interval and a bounded attempt count:

   ```bash
   beatapi tasks wait TASK_ID --interval 7000 --attempts 120
   ```

## Execute Ecommerce Video

1. Copy `assets/ecommerce-video.json` to a temporary working file.
2. Fill the product image URLs, duration, prompt, aspect ratio, and language.
3. Create and wait:

   ```bash
   beatapi ecommerce-video create --file /tmp/beatapi-ecommerce-video.json
   beatapi tasks wait TASK_ID --interval 7000 --attempts 120
   ```

## Handle read-only and integration requests

- Inspect one task with `beatapi tasks get TASK_ID`.
- Discover workflows with `beatapi workflows list`.
- Inspect balance and concurrency with `beatapi usage`.
- Manage webhook endpoints with `beatapi webhooks list|create|get|update|delete`.
- Read [api-workflows.md](references/api-workflows.md) for the exact CLI and
  endpoint map.
- For application code, use the `beatapi-client` package or the bundled
  OpenAPI contract. Do not embed the user's API key in client-side code.

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
