import { execFile } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, extname, resolve } from "node:path";
import { promisify } from "node:util";

import {
  BeatAPIClient,
  BeatAPIError,
  type CreateWebhookInput,
  type EcommerceVideoTaskInput,
  type MusicVideoShotEditInput,
  type MusicVideoTaskInput,
  type UpdateWebhookInput,
} from "../vendor/client/index.js";

const execFileAsync = promisify(execFile);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MIME_TYPES: Readonly<Record<string, string>> = {
  ".aac": "audio/aac",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".srt": "application/x-subrip",
  ".wav": "audio/wav",
  ".webp": "image/webp",
};

type Input = Record<string, unknown>;

function stringValue(input: Input, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value) throw new TypeError(`${key} is required.`);
  return value;
}

function without<T extends Input>(input: T, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !keys.includes(key)),
  );
}

function redactText(value: string): string {
  return value
    .replace(/\bsk_[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bwhsec_[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_WEBHOOK_SECRET]")
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]");
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "string") return redactText(value);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/^(secret|api[_-]?key|authorization)$/i.test(key))
      .map(([key, child]) => [key, sanitize(child)]),
  );
}

function parseCliJson(stdout: string): unknown {
  const text = stdout.trim();
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "{" && text[index] !== "[") continue;
    try {
      return JSON.parse(text.slice(index));
    } catch {
      // Keep scanning because auth status prints a sentence before JSON.
    }
  }
  throw new Error("BeatAPI CLI did not return JSON.");
}

function cliCommand(args: string[]): { file: string; args: string[] } {
  const configured = process.env.BEATAPI_CLI_PATH?.trim();
  if (!configured) return { file: "beatapi", args };
  if (/\.(?:mjs|cjs|js)$/i.test(configured)) {
    return { file: process.execPath, args: [configured, ...args] };
  }
  return { file: configured, args };
}

async function runCli(args: string[], timeout = 15 * 60 * 1000): Promise<unknown> {
  const command = cliCommand(args);
  const result = await execFileAsync(command.file, command.args, {
    env: process.env,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  return parseCliJson(result.stdout);
}

async function withJsonFile<T>(
  value: unknown,
  callback: (path: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(resolve(tmpdir(), "beatapi-plugin-"));
  await chmod(directory, 0o700);
  const path = resolve(directory, "input.json");
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
      flag: "wx",
    });
    return await callback(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function preflightSecretPath(requested: unknown): Promise<string> {
  const root = resolve(
    process.env.CODEX_HOME?.trim() || resolve(homedir(), ".codex"),
    "beatapi/secrets",
  );
  const filename =
    typeof requested === "string" && requested.trim()
      ? requested.trim()
      : `webhook-${Date.now()}.secret`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(filename)) {
    throw new Error(
      "secret_file_name must be a simple filename containing only letters, numbers, dot, underscore, or hyphen.",
    );
  }
  const path = resolve(root, filename);
  await mkdir(root, { recursive: true, mode: 0o700 });
  try {
    await access(path);
    throw new Error(`Secret file already exists: ${path}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return path;
}

async function saveWebhookSecret(
  endpoint: Record<string, unknown>,
  path: string,
  rollback: () => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const secret = endpoint.secret;
  if (typeof secret !== "string" || !secret || secret.includes("masked")) {
    await rollback().catch(() => undefined);
    throw new Error("BeatAPI did not return a usable one-time webhook secret.");
  }
  try {
    await writeFile(path, `${secret}\n`, { mode: 0o600, flag: "wx" });
    await chmod(path, 0o600);
  } catch (error) {
    await rollback().catch(() => undefined);
    throw new Error(
      "Unable to store the one-time webhook secret; the webhook was rolled back.",
      { cause: error },
    );
  }
  const clean = sanitize(endpoint) as Record<string, unknown>;
  return { ...clean, secret_file: path };
}

export class BeatAPIExecutor {
  private readonly apiKey = process.env.BEATAPI_API_KEY?.trim();
  private readonly direct = new BeatAPIClient({
    apiKey: this.apiKey,
    baseUrl: process.env.BEATAPI_BASE_URL,
  });

  private get usesDirectClient(): boolean {
    return Boolean(this.apiKey);
  }

  async execute(name: string, input: Input): Promise<unknown> {
    if (name === "beatapi_check_setup") return this.checkSetup();
    if (name === "beatapi_list_workflows") {
      return sanitize(await this.direct.listWorkflows());
    }
    if (!this.usesDirectClient) return this.executeViaCli(name, input);
    return this.executeDirect(name, input);
  }

  private async checkSetup(): Promise<unknown> {
    if (this.usesDirectClient) {
      return {
        configured: true,
        auth_source: "environment",
        usage: sanitize(await this.direct.getUsage()),
      };
    }
    try {
      return {
        configured: true,
        auth_source: "beatapi-cli-keychain",
        usage: sanitize(await runCli(["auth", "status"])),
      };
    } catch {
      return {
        configured: false,
        auth_source: null,
        next_step:
          "Install the BeatAPI CLI with `npm install --global beatapi`, then run `beatapi auth login` in a terminal. Do not paste the API key into chat.",
      };
    }
  }

  private async executeDirect(name: string, input: Input): Promise<unknown> {
    switch (name) {
      case "beatapi_get_usage":
        return sanitize(await this.direct.getUsage());
      case "beatapi_upload_file": {
        const path = resolve(stringValue(input, "path"));
        const info = await stat(path);
        if (!info.isFile()) throw new Error(`${path} is not a file.`);
        if (info.size > MAX_UPLOAD_BYTES) throw new Error("BeatAPI uploads are limited to 50 MB.");
        const mimeType = MIME_TYPES[extname(path).toLowerCase()];
        if (!mimeType) throw new Error(`Unsupported file extension: ${extname(path) || "(none)"}.`);
        return sanitize(
          await this.direct.uploadFile(await readFile(path), {
            filename: basename(path),
            mimeType,
            purpose: "input",
          }),
        );
      }
      case "beatapi_create_music_video":
        return sanitize(
          await this.direct.createMusicVideoTask(input as MusicVideoTaskInput),
        );
      case "beatapi_edit_music_video_shot": {
        const taskId = stringValue(input, "task_id");
        const shotId = stringValue(input, "shot_id");
        return sanitize(
          await this.direct.editMusicVideoShot(
            taskId,
            shotId,
            without(input, ["task_id", "shot_id"]) as MusicVideoShotEditInput,
          ),
        );
      }
      case "beatapi_get_music_video_shot_media":
        return sanitize(
          await this.direct.getMusicVideoShotMedia(
            stringValue(input, "task_id"),
            stringValue(input, "shot_id"),
          ),
        );
      case "beatapi_compose_music_video":
        return sanitize(
          await this.direct.composeMusicVideoTask(stringValue(input, "task_id"), {
            shot_ids: input.shot_ids as string[],
          }),
        );
      case "beatapi_create_ecommerce_video":
        return sanitize(
          await this.direct.createEcommerceVideoTask(
            input as EcommerceVideoTaskInput,
          ),
        );
      case "beatapi_get_task":
        return sanitize(await this.direct.getTask(stringValue(input, "task_id")));
      case "beatapi_wait_for_task":
        return sanitize(
          await this.direct.waitForTask(stringValue(input, "task_id"), {
            intervalMs: input.interval_ms as number,
            maxAttempts: input.max_attempts as number,
          }),
        );
      case "beatapi_list_webhooks":
        return sanitize(await this.direct.listWebhooks());
      case "beatapi_create_webhook": {
        const secretPath = await preflightSecretPath(input.secret_file_name);
        const endpoint = (await this.direct.createWebhook(
          without(input, ["secret_file_name"]) as CreateWebhookInput,
        )) as unknown as Record<string, unknown>;
        const endpointId = String(endpoint.id || "");
        return saveWebhookSecret(endpoint, secretPath, () =>
          this.direct.deleteWebhook(endpointId),
        );
      }
      case "beatapi_get_webhook":
        return sanitize(
          await this.direct.getWebhook(stringValue(input, "webhook_id")),
        );
      case "beatapi_update_webhook": {
        const webhookId = stringValue(input, "webhook_id");
        return sanitize(
          await this.direct.updateWebhook(
            webhookId,
            without(input, ["webhook_id"]) as UpdateWebhookInput,
          ),
        );
      }
      case "beatapi_delete_webhook":
        return sanitize(
          await this.direct.deleteWebhook(stringValue(input, "webhook_id")),
        );
      default:
        throw new Error(`Unsupported BeatAPI tool: ${name}`);
    }
  }

  private async executeViaCli(name: string, input: Input): Promise<unknown> {
    let result: unknown;
    switch (name) {
      case "beatapi_get_usage":
        result = await runCli(["usage"]);
        break;
      case "beatapi_upload_file":
        result = await runCli(["files", "upload", resolve(stringValue(input, "path"))]);
        break;
      case "beatapi_create_music_video":
        result = await withJsonFile(input, (path) =>
          runCli(["music-video", "create", "--file", path]),
        );
        break;
      case "beatapi_edit_music_video_shot":
        result = await withJsonFile(without(input, ["task_id", "shot_id"]), (path) =>
          runCli([
            "music-video",
            "shots",
            "edit",
            stringValue(input, "task_id"),
            stringValue(input, "shot_id"),
            "--file",
            path,
          ]),
        );
        break;
      case "beatapi_get_music_video_shot_media":
        result = await runCli([
          "music-video",
          "shots",
          "media",
          stringValue(input, "task_id"),
          stringValue(input, "shot_id"),
        ]);
        break;
      case "beatapi_compose_music_video":
        result = await runCli([
          "music-video",
          "compose",
          stringValue(input, "task_id"),
          ...(input.shot_ids as string[]).flatMap((shot) => ["--shot", shot]),
        ]);
        break;
      case "beatapi_create_ecommerce_video":
        result = await withJsonFile(input, (path) =>
          runCli(["ecommerce-video", "create", "--file", path]),
        );
        break;
      case "beatapi_get_task":
        result = await runCli(["tasks", "get", stringValue(input, "task_id")]);
        break;
      case "beatapi_wait_for_task":
        result = await runCli(
          [
            "tasks",
            "wait",
            stringValue(input, "task_id"),
            "--interval",
            String(input.interval_ms),
            "--attempts",
            String(input.max_attempts),
          ],
          (input.interval_ms as number) * (input.max_attempts as number) + 60_000,
        );
        break;
      case "beatapi_list_webhooks":
        result = await runCli(["webhooks", "list"]);
        break;
      case "beatapi_create_webhook": {
        const secretPath = await preflightSecretPath(input.secret_file_name);
        const endpoint = (await withJsonFile(without(input, ["secret_file_name"]), (path) =>
          runCli(["webhooks", "create", "--file", path]),
        )) as Record<string, unknown>;
        const endpointId = String(endpoint.id || "");
        return saveWebhookSecret(endpoint, secretPath, () =>
          runCli(["webhooks", "delete", endpointId]),
        );
      }
      case "beatapi_get_webhook":
        result = await runCli(["webhooks", "get", stringValue(input, "webhook_id")]);
        break;
      case "beatapi_update_webhook":
        result = await withJsonFile(without(input, ["webhook_id"]), (path) =>
          runCli([
            "webhooks",
            "update",
            stringValue(input, "webhook_id"),
            "--file",
            path,
          ]),
        );
        break;
      case "beatapi_delete_webhook":
        result = await runCli(["webhooks", "delete", stringValue(input, "webhook_id")]);
        break;
      default:
        throw new Error(`Unsupported BeatAPI tool: ${name}`);
    }
    return sanitize(result);
  }
}

export function safeError(error: unknown): Record<string, unknown> {
  if (error instanceof BeatAPIError) {
    return {
      error: redactText(error.message),
      code: error.code,
      status: error.status,
      request_id: error.requestId,
      retry_after_seconds: error.retryAfterSeconds,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: redactText(message) };
}
