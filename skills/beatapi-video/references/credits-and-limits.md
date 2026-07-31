# Credits and launch limits

Use the bundled OpenAPI contract as the source of truth if these launch values
change.

## Customer credit rates

| Workflow/control | Credits |
| --- | ---: |
| Music Video 540p standard | 4 per second |
| Music Video 720p standard | 5 per second |
| Music Video 1080p standard | 6 per second |
| Music Video lip-sync add-on | +2 per second |
| Music Video 720p high | 16 per second |
| Music Video 1080p high | 18 per second |
| Ecommerce Video 1080p | 15 per second |
| Manual composition | 1 fixed credit |

Shot editing uses the selected Music Video quality/resolution rate multiplied
by shot duration. Default shot duration is 5 seconds.

For Music Video creation, BeatAPI bills detected audio duration. Use the
request `duration` only as a 10-180 second fallback when duration detection
fails; it cannot override a detected duration.

## Input limits

- Music Video: 1-7 public HTTPS images.
- Images: PNG, JPG/JPEG, or WEBP, at most 50 MB each, aspect ratio 1:4 to 4:1.
- Audio: MP3, WAV, AAC, or M4A, at most 50 MB, 10-180 seconds.
- Subtitle input: public HTTPS SRT.
- Prompt: at most 3000 characters.
- Optional style phrase: at most 200 characters.
- Ecommerce Video duration and enum constraints must match
  `beatapi.openapi.yaml`.

Reject localhost, private-network, data, and non-HTTPS URLs. Upload supported
local inputs with `beatapi files upload`.

## Preflight

Run `beatapi usage` before paid work. Check:

- `credit_balance`;
- `concurrency.limit`;
- `concurrency.active`.

Do not treat a sufficient balance as proof that concurrency is available.
Storyboard-ready and requires-action tasks can have settled credits without
counting as active processing.

## Realtime sessions

- Allowed maximum durations are 15, 60, and 300 seconds.
- Every create request requires 1-10 exact HTTPS `allowed_origins` and an
  `Idempotency-Key`.
- Creation reserves credits; billing activates only after the first accepted
  heartbeat after remote output begins. Inspect `credits.reserved`,
  `credits.settled`, and `credits.refunded` on the session.
- A Realtime session has its own capacity rules. Treat
  `realtime_capacity_unavailable` and `user_concurrency_exceeded` as signals to
  close/wait, not as reasons to retry in a tight loop.
