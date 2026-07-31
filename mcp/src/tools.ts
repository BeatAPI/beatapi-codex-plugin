import { z } from "zod";

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType;
  annotations: ToolAnnotations;
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} satisfies ToolAnnotations;
const write = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} satisfies ToolAnnotations;
const destructive = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
} satisfies ToolAnnotations;

const id = z.string().trim().min(1);
const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "A public HTTPS URL is required.");
const imageUrls = z.array(httpsUrl).min(1).max(7);
const quality = z.enum(["standard", "high"]);
const resolution = z.enum(["540p", "720p", "1080p"]);
const language = z.enum(["en", "zh"]);
const uri = z.string().url();
const webhookEvents = z.array(z.enum(["task.succeeded", "task.failed"]));
const secretFileName = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
  .optional();
const httpsOrigin = z.string().url().superRefine((value, context) => {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    context.addIssue({
      code: "custom",
      message: "An exact HTTPS origin without path, query, or fragment is required.",
    });
  }
});

const musicVideoInput = z
  .object({
    images: imageUrls,
    audio_url: httpsUrl,
    prompt: z.string().max(3000).optional(),
    language: language.optional(),
    lip_sync: z.boolean().optional(),
    lip_ref_url: httpsUrl.optional(),
    style: z.string().max(200).optional(),
    quality: quality.optional(),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
    resolution: resolution.optional(),
    add_subtitle: z.boolean().optional(),
    subtitle_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    srt_url: httpsUrl.optional(),
    duration: z.number().int().min(10).max(180).optional(),
    compose_mode: z.enum(["auto", "manual"]).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.resolution === "540p" && value.quality === "high") {
      context.addIssue({
        code: "custom",
        path: ["quality"],
        message: "quality=high is not supported with resolution=540p.",
      });
    }
    if (value.resolution === "540p" && value.lip_sync === true) {
      context.addIssue({
        code: "custom",
        path: ["lip_sync"],
        message: "lip_sync=true is not supported with resolution=540p.",
      });
    }
  });

const shotEditInput = z
  .object({
    task_id: id,
    shot_id: id,
    prompt: z.string().trim().min(1).max(3000),
    duration: z.number().int().min(1).max(180).optional(),
    quality: quality.optional(),
    resolution: resolution.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.resolution === "540p" && value.quality === "high") {
      context.addIssue({
        code: "custom",
        path: ["quality"],
        message: "quality=high is not supported with resolution=540p.",
      });
    }
  });

export const toolDefinitions: readonly ToolDefinition[] = [
  {
    name: "beatapi_check_setup",
    title: "Check BeatAPI setup",
    description:
      "Check whether BeatAPI is ready without exposing credentials. Uses BEATAPI_API_KEY or the API key previously saved by `beatapi auth login`.",
    inputSchema: z.object({}).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_list_workflows",
    title: "List BeatAPI workflows",
    description: "List public BeatAPI launch workflows. Authentication is not required.",
    inputSchema: z.object({}).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_get_usage",
    title: "Get BeatAPI usage",
    description: "Read the current credit balance, usage totals, and active concurrency.",
    inputSchema: z.object({}).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_upload_file",
    title: "Upload BeatAPI input file",
    description:
      "Upload one supported local image, audio, or SRT file to BeatAPI and return a public HTTPS workflow-input URL.",
    inputSchema: z
      .object({
        path: z.string().trim().min(1),
      })
      .strict(),
    annotations: write,
  },
  {
    name: "beatapi_create_music_video",
    title: "Create BeatAPI Music Video",
    description:
      "Paid mutation: create a BeatAPI Music Video task using 1-7 public HTTPS images and a public HTTPS audio URL. Call only after the user has authorized generation.",
    inputSchema: musicVideoInput,
    annotations: write,
  },
  {
    name: "beatapi_edit_music_video_shot",
    title: "Edit BeatAPI Music Video shot",
    description:
      "Paid mutation: edit one storyboard shot. Call only after the user has authorized the credit-spending edit.",
    inputSchema: shotEditInput,
    annotations: write,
  },
  {
    name: "beatapi_get_music_video_shot_media",
    title: "Get BeatAPI shot media",
    description:
      "Materialize and retrieve the current hosted media URL for one Music Video storyboard shot without editing it.",
    inputSchema: z.object({ task_id: id, shot_id: id }).strict(),
    annotations: write,
  },
  {
    name: "beatapi_compose_music_video",
    title: "Compose BeatAPI Music Video",
    description:
      "Paid mutation: compose selected storyboard shots into a final Music Video for a fixed BeatAPI credit charge. Preserve shot order.",
    inputSchema: z
      .object({
        task_id: id,
        shot_ids: z.array(id).min(1),
      })
      .strict(),
    annotations: write,
  },
  {
    name: "beatapi_create_ecommerce_video",
    title: "Create BeatAPI Ecommerce Video",
    description:
      "Paid mutation: create a BeatAPI Ecommerce Video task from 1-7 product images. Call only after the user has authorized generation.",
    inputSchema: z
      .object({
        images: imageUrls,
        duration: z.number().int().min(10).max(60),
        prompt: z.string().max(2000).optional(),
        aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).optional(),
        language: language.optional(),
      })
      .strict(),
    annotations: write,
  },
  {
    name: "beatapi_create_realtime_session",
    title: "Create BeatAPI Realtime session",
    description:
      "Paid mutation: reserve credits and create a short-lived Realtime Video browser session. The one-time client secret is written to a local mode-0600 file and is never returned in the tool response.",
    inputSchema: z
      .object({
        max_duration_seconds: z.union([
          z.literal(15),
          z.literal(60),
          z.literal(300),
        ]),
        allowed_origins: z.array(httpsOrigin).min(1).max(10),
        metadata: z.record(z.string(), z.string()).optional(),
        idempotency_key: z.string().trim().min(1).max(255),
        client_secret_file_name: secretFileName,
      })
      .strict(),
    annotations: write,
  },
  {
    name: "beatapi_get_realtime_session",
    title: "Get BeatAPI Realtime session",
    description:
      "Read the current server-side Realtime session status and credit settlement without exposing its one-time client secret.",
    inputSchema: z.object({ session_id: id }).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_close_realtime_session",
    title: "Close BeatAPI Realtime session",
    description:
      "Destructive mutation: close one Realtime Video session and release/refund any eligible unused reservation.",
    inputSchema: z.object({ session_id: id }).strict(),
    annotations: destructive,
  },
  {
    name: "beatapi_get_task",
    title: "Get BeatAPI task",
    description: "Read the latest server-side status and hosted output for one BeatAPI task.",
    inputSchema: z.object({ task_id: id }).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_wait_for_task",
    title: "Wait for BeatAPI task",
    description:
      "Poll a BeatAPI task every 5-10 seconds until it succeeds, fails, or requires storyboard action, using a bounded attempt count.",
    inputSchema: z
      .object({
        task_id: id,
        interval_ms: z.number().int().min(5000).max(10000).default(7000),
        max_attempts: z.number().int().min(1).max(360).default(120),
      })
      .strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_list_webhooks",
    title: "List BeatAPI webhooks",
    description: "List configured BeatAPI webhook endpoints without exposing signing secrets.",
    inputSchema: z.object({}).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_create_webhook",
    title: "Create BeatAPI webhook",
    description:
      "Create a webhook endpoint. The one-time signing secret is written to a local file with mode 0600 and is never returned in the tool response.",
    inputSchema: z
      .object({
        url: uri,
        description: z.string().optional(),
        events: webhookEvents.optional(),
        secret_file_name: secretFileName,
      })
      .strict(),
    annotations: write,
  },
  {
    name: "beatapi_get_webhook",
    title: "Get BeatAPI webhook",
    description: "Read one BeatAPI webhook endpoint without exposing its signing secret.",
    inputSchema: z.object({ webhook_id: id }).strict(),
    annotations: readOnly,
  },
  {
    name: "beatapi_update_webhook",
    title: "Update BeatAPI webhook",
    description: "Update a BeatAPI webhook URL, description, event selection, or status.",
    inputSchema: z
      .object({
        webhook_id: id,
        url: uri.optional(),
        description: z.string().optional(),
        events: webhookEvents.optional(),
        status: z.enum(["active", "disabled"]).optional(),
      })
      .strict()
      .refine(
        ({ webhook_id: _webhookId, ...changes }) =>
          Object.values(changes).some((value) => value !== undefined),
        "At least one webhook field must be provided.",
      ),
    annotations: write,
  },
  {
    name: "beatapi_delete_webhook",
    title: "Delete BeatAPI webhook",
    description: "Destructive mutation: permanently delete one BeatAPI webhook endpoint.",
    inputSchema: z.object({ webhook_id: id }).strict(),
    annotations: destructive,
  },
] as const;

export function toolDefinition(name: string): ToolDefinition {
  const definition = toolDefinitions.find((candidate) => candidate.name === name);
  if (!definition) throw new Error(`Unknown BeatAPI tool: ${name}`);
  return definition;
}
