import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

import { toolDefinitions } from "../mcp/src/tools.js";

const root = resolve(import.meta.dirname, "..");

const expectedToolNames = [
  "beatapi_check_setup",
  "beatapi_list_workflows",
  "beatapi_get_usage",
  "beatapi_upload_file",
  "beatapi_create_music_video",
  "beatapi_edit_music_video_shot",
  "beatapi_get_music_video_shot_media",
  "beatapi_compose_music_video",
  "beatapi_create_ecommerce_video",
  "beatapi_get_task",
  "beatapi_wait_for_task",
  "beatapi_list_webhooks",
  "beatapi_create_webhook",
  "beatapi_get_webhook",
  "beatapi_update_webhook",
  "beatapi_delete_webhook",
] as const;

test("exposes the complete BeatAPI launch API without credential parameters", () => {
  assert.deepEqual(
    toolDefinitions.map((tool) => tool.name),
    expectedToolNames,
  );

  for (const tool of toolDefinitions) {
    const serialized = JSON.stringify(tool.inputSchema);
    assert.doesNotMatch(serialized, /api[_-]?key|authorization|bearer/i);
  }
});

test("marks read, write, paid, and destructive tools accurately", () => {
  const byName = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

  for (const name of [
    "beatapi_check_setup",
    "beatapi_list_workflows",
    "beatapi_get_usage",
    "beatapi_get_task",
    "beatapi_wait_for_task",
    "beatapi_list_webhooks",
    "beatapi_get_webhook",
  ]) {
    assert.equal(byName.get(name)?.annotations.readOnlyHint, true, name);
  }

  for (const name of [
    "beatapi_create_music_video",
    "beatapi_edit_music_video_shot",
    "beatapi_compose_music_video",
    "beatapi_create_ecommerce_video",
  ]) {
    const tool = byName.get(name);
    assert.equal(tool?.annotations.readOnlyHint, false, name);
    assert.match(tool?.description ?? "", /paid|credit/i, name);
  }

  assert.equal(
    byName.get("beatapi_delete_webhook")?.annotations.destructiveHint,
    true,
  );
  for (const tool of toolDefinitions) {
    if (tool.name !== "beatapi_delete_webhook") {
      assert.notEqual(tool.annotations.destructiveHint, true, tool.name);
    }
  }
});

test("plugin manifest wires the skill, local MCP, and production assets", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, ".codex-plugin/plugin.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(manifest.repository, "https://github.com/erickkkyt/beatapi-codex-plugin");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");

  const interfaceBlock = manifest.interface as Record<string, unknown>;
  assert.equal(interfaceBlock.logo, "./assets/logo.png");
  assert.equal(interfaceBlock.logoDark, "./assets/logo-dark.png");
  assert.equal(interfaceBlock.composerIcon, "./assets/icon.png");
});
