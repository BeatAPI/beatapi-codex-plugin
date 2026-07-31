# BeatAPI 0.2.0

Realtime-aligned Skills-only submission.

- Creates and monitors BeatAPI Music Video and Ecommerce Video workflows.
- Creates, reads, and closes short-lived Realtime Video sessions while keeping
  the browser client secret out of model-visible output.
- Handles local media upload, manual storyboard review, shot operations,
  composition, task polling, usage checks, and webhook setup.
- Prefers compatible BeatAPI MCP tools supplied by the host and otherwise uses
  the official CLI without placing credentials in conversations.
- Requires the globally installed `beatapi` CLI for Skills-only hosts that do
  not supply BeatAPI MCP tools.
- Matches the current BeatAPI OpenAPI `1.0.0-launch` Realtime baseline.
- Includes six positive and three negative review cases.
