---
name: beatapi-video
description: Create, monitor, and troubleshoot BeatAPI Music Video and Ecommerce Video tasks using the BeatAPI CLI or public API. Use when a user wants to upload media, check credits or concurrency, create an AI music video or product ad, poll a task, retrieve hosted output, or integrate BeatAPI into an agent workflow.
---

# BeatAPI Video

## Overview

Use BeatAPI's asynchronous workflow API to turn images and audio into a music
video, or product images into an ecommerce video ad. Prefer the BeatAPI CLI when
it is installed; use direct HTTP only for integration work or when the CLI is
unavailable.

## Protect credentials and credits

- Read the API key from `BEATAPI_API_KEY`. Never print it, commit it, place it
  in browser code, or ask the user to paste it into chat.
- Use the user's existing BeatAPI account and API key. Do not invent a separate
  plugin account or billing model.
- Run read-only checks before paid generation: inspect the supplied assets,
  identify the workflow, and check usage/concurrency.
- Creating a task consumes credits. Confirm the workflow inputs and material
  generation settings when they were not clearly specified by the user.
- Do not report success until the task status is `succeeded` and hosted output
  media is present.

## Choose the workflow

- Use `music-video` when the user has one or more images plus an audio track.
  Typical controls include prompt, language, aspect ratio, resolution, quality,
  and automatic or manual composition.
- Use `ecommerce-video` when the user has product images and wants a short ad.
  Typical controls include duration, prompt, aspect ratio, and language.
- If local files are provided, upload supported images, audio, or SRT subtitles
  first and use the returned public HTTPS URLs in the task request.

## Execute the workflow

1. Inspect the user's assets and creative request.
2. List workflows when capability discovery is needed.
3. Check account usage and current concurrency.
4. Upload local inputs and retain the returned URLs.
5. Create the selected task.
6. Poll every 5-10 seconds with a bounded attempt count. Treat `succeeded` and
   `failed` as terminal states.
7. For manual Music Video flows, handle `storyboard_ready` or
   `requires_action` explicitly instead of waiting forever.
8. Return the task ID, final status, output media, and useful metadata.

Preferred CLI shapes:

```bash
beatapi workflows
beatapi usage
beatapi file upload ./input.mp3
beatapi music-video create --json ./music-video.json
beatapi ecommerce-video create --json ./ecommerce-video.json
beatapi task get task_123
beatapi task wait task_123
```

When the CLI is unavailable, follow the endpoint and lifecycle reference in
`references/api-workflows.md`.

## Handle failures

- `401`: the API key is absent, invalid, or revoked. Do not expose the key while
  diagnosing.
- `402` or credit errors: report the required and available balance; do not
  retry blindly.
- `429`: distinguish rate limiting from concurrency exhaustion and wait only
  when retrying is appropriate.
- Validation errors: correct the request rather than retrying it unchanged.
- `5xx` or network failures: retry with bounded exponential backoff.
- Failed tasks: preserve `error_code`, `error_message`, and `request_id` when
  available.

## Verify against the public contract

For exact fields and current limits, inspect the canonical OpenAPI file:

`../beatapi-examples/openapi/beatapi.yaml`

Do not infer production behavior from the Skill when it conflicts with that
contract or a live API response.

