# BeatAPI public workflow reference

Base URL: `https://api.beatapi.io`

Authentication: send `Authorization: Bearer $BEATAPI_API_KEY` for every endpoint
except anonymous workflow discovery.

## Core endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/v1/workflows` | Discover available workflows |
| `GET` | `/v1/usage` | Read credits, task totals, and concurrency |
| `POST` | `/v1/files` | Upload supported local workflow inputs |
| `POST` | `/v1/music-video/tasks` | Create a Music Video task |
| `POST` | `/v1/ecommerce-video/tasks` | Create an Ecommerce Video task |
| `GET` | `/v1/tasks/{task_id}` | Read task state and hosted output |
| `GET/POST` | `/v1/webhooks` | List or create webhook endpoints |
| `GET/PATCH/DELETE` | `/v1/webhooks/{id}` | Manage a webhook endpoint |

## Task lifecycle

Common states:

```text
queued -> processing -> succeeded
                     -> failed
```

Manual Music Video tasks can also enter:

```text
storyboard_ready -> requires_action -> editing -> composing -> succeeded/failed
```

Poll at a 5-10 second interval with jitter and a bounded attempt count. A task
lookup remains the source of truth even when webhooks are enabled.

Successful hosted files are returned in `data.output.media`. Failed tasks can
include `error_code` and `error_message`.

## Upload limits

- Maximum file size: 50 MB.
- Images: PNG, JPG/JPEG, WEBP.
- Audio: MP3, WAV, AAC, M4A; uploaded audio must be 10-180 seconds.
- Subtitles: SRT.
- Videos, PDFs, ZIP archives, private-network URLs, data URLs, and unsupported
  generic files are not accepted for the launch API.

## Error behavior

The public error envelope is:

```json
{
  "error": {
    "code": "bad_request",
    "message": "The request body is invalid.",
    "request_id": "req_example"
  }
}
```

Preserve `request_id` in diagnostics. Retry only network errors and appropriate
server responses; authentication, validation, credit, and concurrency failures
usually require a user or request change.

## Canonical source

This reference is intentionally compact. For exact schemas, enums, examples,
and current limits, read:

`../../beatapi-examples/openapi/beatapi.yaml`

