import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(import.meta.dirname, "..");

test("bundled stdio MCP serves BeatAPI tools and protects credentials", async () => {
  const requests: Array<{ method: string; path: string; authorization?: string }> = [];
  const httpServer = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({
      method: request.method ?? "GET",
      path: request.url ?? "/",
      ...(request.headers.authorization
        ? { authorization: request.headers.authorization }
        : {}),
    });

    response.setHeader("content-type", "application/json");
    if (request.url === "/v1/workflows") {
      response.end(
        JSON.stringify({
          data: {
            object: "list",
            data: [{ id: "music-video", object: "workflow" }],
          },
        }),
      );
      return;
    }
    if (request.url === "/v1/usage") {
      response.end(
        JSON.stringify({
          data: {
            object: "usage",
            credits_balance: 1000,
            active_tasks: 0,
            concurrency_limit: 5,
          },
        }),
      );
      return;
    }
    if (request.url === "/v1/music-video/tasks") {
      response.statusCode = 201;
      response.end(
        JSON.stringify({
          data: {
            id: "task_test",
            object: "task",
            workflow: "music-video",
            status: "queued",
            stage: "queued",
            storyboard: { shots: [] },
            created_at: 1,
            updated_at: 1,
            completed_at: null,
            output: null,
            usage: {
              credits_reserved: 50,
              credits_charged: 50,
              billable_duration_seconds: 10,
              credits_settled: 0,
              credits_refunded: 0,
            },
            request_id: "req_test",
            error_code: null,
            error_message: null,
          },
        }),
      );
      return;
    }
    if (request.url === "/v1/webhooks") {
      response.statusCode = 201;
      response.end(
        JSON.stringify({
          data: {
            id: "wh_test",
            object: "webhook_endpoint",
            url: "https://example.com/webhooks/beatapi",
            events: ["task.succeeded", "task.failed"],
            status: "active",
            secret: "whsec_this_value_must_never_reach_the_model",
            created_at: 1,
            updated_at: 1,
          },
        }),
      );
      return;
    }
    response.statusCode = 404;
    response.end(
      JSON.stringify({
        error: { code: "not_found", message: "Not found", request_id: "req_404" },
      }),
    );
  });

  await new Promise<void>((resolveListening) =>
    httpServer.listen(0, "127.0.0.1", resolveListening),
  );
  const address = httpServer.address();
  assert.ok(address && typeof address === "object");
  const codeHome = await mkdtemp(resolve(tmpdir(), "beatapi-mcp-test-"));
  const secretPath = resolve(codeHome, "beatapi", "secrets", "webhook.secret");

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(root, "mcp/server.mjs")],
    cwd: root,
    env: {
      ...process.env,
      BEATAPI_API_KEY: "test_plugin_api_key",
      BEATAPI_BASE_URL: `http://127.0.0.1:${address.port}`,
      CODEX_HOME: codeHome,
    } as Record<string, string>,
    stderr: "pipe",
  });
  const client = new Client({ name: "beatapi-plugin-test", version: "0.1.0" });

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 16);
    assert.ok(listed.tools.every((tool) => !/api[_-]?key/i.test(JSON.stringify(tool.inputSchema))));

    const workflows = await client.callTool({
      name: "beatapi_list_workflows",
      arguments: {},
    });
    assert.equal(
      (workflows.structuredContent as { result: Array<{ id: string }> }).result[0]?.id,
      "music-video",
    );

    const musicTask = await client.callTool({
      name: "beatapi_create_music_video",
      arguments: {
        images: ["https://media.example.com/image.png"],
        audio_url: "https://media.example.com/audio.mp3",
        duration: 10,
        quality: "standard",
        resolution: "720p",
      },
    });
    assert.equal(
      (musicTask.structuredContent as { result: { id: string } }).result.id,
      "task_test",
    );

    const webhook = await client.callTool({
      name: "beatapi_create_webhook",
      arguments: {
        url: "https://example.com/webhooks/beatapi",
        events: ["task.succeeded", "task.failed"],
        secret_file_name: "webhook.secret",
      },
    });
    const serialized = JSON.stringify(webhook);
    assert.doesNotMatch(serialized, /whsec_this_value/);
    assert.equal(
      (webhook.structuredContent as { result: { secret_file: string } }).result
        .secret_file,
      secretPath,
    );
    assert.equal(
      (await readFile(secretPath, "utf8")).trim(),
      "whsec_this_value_must_never_reach_the_model",
    );
    assert.equal((await stat(secretPath)).mode & 0o777, 0o600);

    const duplicateSecretFile = await client.callTool({
      name: "beatapi_create_webhook",
      arguments: {
        url: "https://example.com/webhooks/beatapi-second",
        events: ["task.succeeded"],
        secret_file_name: "webhook.secret",
      },
    });
    assert.equal(duplicateSecretFile.isError, true);
    assert.equal(
      requests.filter(
        (request) =>
          request.path === "/v1/webhooks" && request.method === "POST",
      ).length,
      1,
      "an existing secret file must fail before creating another webhook",
    );

    const authenticatedRequests = requests.filter(
      (request) => request.path !== "/v1/workflows",
    );
    assert.ok(
      authenticatedRequests.every(
        (request) => request.authorization === "Bearer test_plugin_api_key",
      ),
    );
    assert.equal(
      requests.find((request) => request.path === "/v1/workflows")?.authorization,
      undefined,
    );
  } finally {
    await client.close().catch(() => undefined);
    await transport.close().catch(() => undefined);
    await new Promise<void>((resolveClosed, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolveClosed())),
    );
    await rm(codeHome, { recursive: true, force: true });
  }
});

test("bundled MCP reuses the API key saved by the BeatAPI CLI", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "beatapi-cli-bridge-test-"));
  const fakeCli = resolve(directory, "fake-beatapi.mjs");
  await writeFile(
    fakeCli,
    [
      "const args = process.argv.slice(2);",
      "if (args.join(' ') === 'auth status') {",
      "  process.stdout.write('Authenticated via credential-store.\\n');",
      "  process.stdout.write(JSON.stringify({ object: 'usage', credits_balance: 321 }));",
      "} else if (args.join(' ') === 'usage') {",
      "  process.stdout.write(JSON.stringify({ object: 'usage', credits_balance: 321 }));",
      "} else {",
      "  process.stderr.write(`unexpected fake CLI args: ${args.join(' ')}\\n`);",
      "  process.exitCode = 2;",
      "}",
      "",
    ].join("\n"),
    { mode: 0o700 },
  );
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key, value]) => key !== "BEATAPI_API_KEY" && value !== undefined,
    ),
  ) as Record<string, string>;
  environment.BEATAPI_CLI_PATH = fakeCli;
  environment.CODEX_HOME = directory;

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(root, "mcp/server.mjs")],
    cwd: root,
    env: environment,
    stderr: "pipe",
  });
  const client = new Client({ name: "beatapi-cli-bridge-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    const setup = await client.callTool({
      name: "beatapi_check_setup",
      arguments: {},
    });
    const setupResult = (
      setup.structuredContent as {
        result: {
          configured: boolean;
          auth_source: string;
          usage: { credits_balance: number };
        };
      }
    ).result;
    assert.equal(setupResult.configured, true);
    assert.equal(setupResult.auth_source, "beatapi-cli-keychain");
    assert.equal(setupResult.usage.credits_balance, 321);

    const usage = await client.callTool({
      name: "beatapi_get_usage",
      arguments: {},
    });
    assert.equal(
      (usage.structuredContent as { result: { credits_balance: number } }).result
        .credits_balance,
      321,
    );
  } finally {
    await client.close().catch(() => undefined);
    await transport.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
