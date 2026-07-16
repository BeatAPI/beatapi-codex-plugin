# Security policy

The plugin must never send a BeatAPI API key through a model prompt or MCP tool
argument. Credentials belong in the supported local credential store or the
`BEATAPI_API_KEY` process environment.

Webhook creation returns a signing secret only once. The MCP server writes that
secret to a new local file with permission mode `0600`, returns only the file
path, and rolls back the webhook if secure storage fails.

Paid task creation, shot editing, and composition are described as paid
mutations in MCP metadata. The plugin never retries authentication,
validation, insufficient-credit, or concurrency failures unchanged.

Use GitHub's private vulnerability reporting feature for security reports. If a
credential may have been exposed, revoke it immediately in the
[BeatAPI dashboard](https://beatapi.io/dashboard/apikeys).

The latest minor release is the supported release line.
