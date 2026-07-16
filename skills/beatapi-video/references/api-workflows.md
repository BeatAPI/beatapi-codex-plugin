# BeatAPI command and endpoint map

Base URL: `https://api.beatapi.io`

Authentication: Bearer API key for every endpoint except `GET /v1/workflows`.
Prefer CLI commands so credential handling and output separation stay
consistent.

| Intent | CLI | HTTP |
| --- | --- | --- |
| Discover workflows | `beatapi workflows list` | `GET /v1/workflows` |
| Check usage | `beatapi usage` | `GET /v1/usage` |
| Upload local media | `beatapi files upload PATH` | `POST /v1/files` |
| Create Music Video | `beatapi music-video create --file INPUT` | `POST /v1/music-video/tasks` |
| Edit storyboard shot | `beatapi music-video shots edit TASK SHOT --prompt TEXT` | `POST /v1/music-video/tasks/{task_id}/shots/{shot_id}/edit` |
| Get/materialize shot media | `beatapi music-video shots media TASK SHOT` | `POST /v1/music-video/tasks/{task_id}/shots/{shot_id}/media` |
| Compose selected shots | `beatapi music-video compose TASK --shot SHOT` | `POST /v1/music-video/tasks/{task_id}/compose` |
| Create Ecommerce Video | `beatapi ecommerce-video create --file INPUT` | `POST /v1/ecommerce-video/tasks` |
| Read task | `beatapi tasks get TASK` | `GET /v1/tasks/{task_id}` |
| Wait for task | `beatapi tasks wait TASK` | Repeated task lookup |
| List webhooks | `beatapi webhooks list` | `GET /v1/webhooks` |
| Create webhook | `beatapi webhooks create --file INPUT` | `POST /v1/webhooks` |
| Read webhook | `beatapi webhooks get ID` | `GET /v1/webhooks/{id}` |
| Update webhook | `beatapi webhooks update ID --file INPUT` | `PATCH /v1/webhooks/{id}` |
| Delete webhook | `beatapi webhooks delete ID` | `DELETE /v1/webhooks/{id}` |

The CLI writes result JSON to stdout and progress/errors to stderr. Use
`--json` only as a compatibility alias for `--file`.

## Task lifecycle

Automatic flow:

```text
queued -> processing -> succeeded
                     -> failed
```

Manual Music Video can include:

```text
queued -> processing -> storyboard_ready/requires_action
       -> editing -> storyboard_ready/requires_action
       -> composing -> succeeded/failed
```

Poll every 5-10 seconds with jitter and a bounded attempt count. Successful
hosted files appear in `data.output.media[]`.

For exact schemas, enums, examples, and response shapes, read
`beatapi.openapi.yaml` in this directory.
