/**
 * USASpending MCP Server for Vercel Next.js
 *
 * This server provides tools for researching federal contract awards and incumbents
 * using the USASpending.gov API
 */

import { createMcpHandler } from "mcp-handler";
import { createUSASpendingClient } from "../../src/clients/usaspending";
import { registerAllTools } from "../../src/tools";
import { registerAllPrompts } from "../../src/prompts";

const handler = createMcpHandler(
	async (server) => {
		const client = createUSASpendingClient();
		registerAllTools(server, client);
		registerAllPrompts(server, client);
	},
	{
		capabilities: {
			tools: {},
			prompts: {},
		},
	},
	{
		basePath: "",
		verboseLogs: true,
		maxDuration: 300,
		disableSse: false,
		redisUrl: process.env.KV_REST_API_URL,
	},
);

export { handler as GET, handler as POST, handler as DELETE };
