---
name: beatapi
description: Connect an Agent to BeatAPI's Model, Data, and Workflow capabilities through the unified Search, Inspect, and Run interface.
---

# BeatAPI

Use `set up https://beatapi.io/SKILL.md` to load the current public setup
instructions. The installable `beatapi-video` Skill and this plugin use the
same provider-neutral capability loop:

1. `capabilities_search`
2. `capabilities_inspect`
3. `capabilities_run` (then poll with `operation: "status"` when a task is asynchronous)

Configure `BEATAPI_API_KEY` through the host's secret/configuration surface.
Never pass keys in prompts or tool arguments. REST clients can use
`https://api.beatapi.io`; remote MCP clients can use `https://beatapi.io/mcp`.

The public setup document is the source for onboarding examples and current
endpoint names. The detailed installable Skill remains at
`skills/beatapi-video/SKILL.md`.
