#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { BeatAPIExecutor, safeError } from "./executor.js";
import { toolDefinitions } from "./tools.js";

export function createServer(executor = new BeatAPIExecutor()): McpServer {
  const server = new McpServer({
    name: "beatapi",
    version: "0.1.0",
  });

  for (const tool of toolDefinitions) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: z.object({ result: z.unknown() }),
        annotations: tool.annotations,
      },
      async (input) => {
        try {
          const result = await executor.execute(
            tool.name,
            input as Record<string, unknown>,
          );
          const structuredContent = { result };
          return {
            structuredContent,
            content: [
              {
                type: "text",
                text: JSON.stringify(structuredContent, null, 2),
              },
            ],
          };
        } catch (error) {
          const payload = safeError(error);
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          };
        }
      },
    );
  }
  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify(safeError(error))}\n`);
    process.exitCode = 1;
  });
}
