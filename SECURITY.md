# Security policy

The plugin must never send a BeatAPI API key through a model prompt or MCP tool
argument. Credentials belong in the supported local credential store or the
`BEATAPI_API_KEY` process environment.

Use GitHub's private vulnerability reporting feature for security reports. If a
credential may have been exposed, revoke it immediately in the
[BeatAPI dashboard](https://beatapi.io/dashboard/apikeys).

The latest minor release is the supported release line.

