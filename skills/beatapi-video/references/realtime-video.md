# Realtime Video sessions

Use the canonical guide at <https://docs.beatapi.io/realtime-video> together
with the bundled OpenAPI contract.

## Trust boundary

- Create, read, and close sessions only from a trusted server, CLI, or MCP
  runtime. Never put a long-lived `sk_` API key in browser JavaScript.
- `POST /v1/realtime/sessions` may return a one-time, short-lived
  `client_secret`. Pass it to the supported browser SDK through the
  application's authenticated backend; do not repeat it in chat, logs,
  analytics, or issue reports.
- The browser SDK owns camera permission, WebRTC negotiation, connection state,
  and remote media rendering. Server-side tools cannot prove those browser
  steps succeeded.

## Create

Creation requires:

- `max_duration_seconds`: exactly 15, 60, or 300;
- `allowed_origins`: 1-10 exact HTTPS origins, with no path;
- `Idempotency-Key`: a stable unique value reused only for retrying the same
  logical request;
- optional string-to-string `metadata`.

With MCP, call `beatapi_create_realtime_session`. With the CLI:

```bash
beatapi realtime sessions create --duration 60 \
  --origin https://app.example.com \
  --metadata customer_id=cus_123 \
  --idempotency-key rt_customer_123_attempt_1
```

Treat session creation as paid and credit-reserving. A `ready` response means
the allocation exists; it does not mean the browser connected or received a
remote frame.

## Inspect and close

```bash
beatapi realtime sessions get SESSION_ID
beatapi realtime sessions close SESSION_ID
```

Close abandoned sessions promptly. Inspect `status`, `connected_at`,
`closed_at`, and the reserved/settled/refunded credit fields. Billing becomes
active only after BeatAPI accepts the first heartbeat following remote output.

Do not blindly retry `realtime_disabled`, `realtime_capacity_unavailable`,
`user_concurrency_exceeded`, `origin_not_allowed`, or
`invalid_client_secret`. Correct configuration or wait/close capacity first.
