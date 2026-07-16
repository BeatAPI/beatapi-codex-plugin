# OpenAI Plugin Directory submission

## Recommended first submission

Submit this release as **Skills only** at
<https://platform.openai.com/plugins>.

Run:

```bash
npm ci
npm run verify
```

Upload `dist/submission/beatapi-video-skill.zip`.

This is the complete official path available without deploying new
infrastructure. The repository's local stdio MCP server is for Codex desktop
installation and must not be entered as a public MCP URL.

## Listing

- Plugin name: **BeatAPI**
- Submission type: **Skills only**
- Category: **Creativity**
- Developer: **BeatAPI**
- Short description: **Create AI music videos and product ads**
- Long description: **Use one BeatAPI account and API key to prepare media,
  check credits and concurrency, create asynchronous Music Video and Ecommerce
  Video tasks, manage storyboard shots, monitor progress, retrieve hosted
  results, and configure webhooks.**
- Website: <https://beatapi.io>
- Support: <https://beatapi.io/dashboard/tickets>
- Support email: <support@beatapi.io>
- Privacy policy: <https://beatapi.io/privacy-policy>
- Terms: <https://beatapi.io/terms-of-service>
- Logo: `assets/logo.png`
- Brand color: `#2563FF`
- Availability: all countries offered by the portal where BeatAPI is available,
  subject to OpenAI and BeatAPI policies.

## Starter prompts

1. Use `$beatapi-video` to create a music video from my images and audio.
2. Use `$beatapi-video` to turn my product images into a vertical ad.
3. Use `$beatapi-video` to check my credits and task status.

## Required owner-side portal steps

These are account and legal actions, not repository work:

1. Select the OpenAI organization that will publish BeatAPI.
2. Ensure the submitter has **Apps Management: Write**.
3. Complete individual or business identity verification as **BeatAPI**.
4. Confirm country availability and policy attestations.
5. Upload the Skill ZIP, logo, test cases, and release notes.
6. Submit for review and respond to reviewer feedback.

## Future MCP-backed public submission

The portal requires a production public MCP URL, domain verification,
authentication/reviewer credentials, accurate tool annotations, and a content
security policy. A local stdio process cannot satisfy those requirements.

Before a future **With MCP** submission, BeatAPI should add a hosted HTTPS MCP
service with account-safe authentication. Do not pass customer API keys as tool
arguments or expose a shared service key. The hosted service should preferably
use BeatAPI OAuth or another revocable user-bound authorization flow.
