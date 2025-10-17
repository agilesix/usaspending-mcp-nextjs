/**
 * Tools Index
 * Central export file for all MCP tools
 */

import type { USASpendingClient } from '../clients/usaspending';
import { registerSearchAwardsTool } from './search-awards';
import { registerSearchTransactionsTool } from './search-transactions';
import { registerGetAwardDetailsTool } from './get-award-details';
import { registerSearchRecipientsTool } from './search-recipients';
import { registerGetRecipientDetailsTool } from './get-recipient-details';
import { registerSearchIdvAwardsTool } from './search-idv-awards';
import { registerGetSpendingOverTimeTool } from './get-spending-over-time';
import { registerAnalyzeCompetitionTool } from './analyze-competition';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: any, client: USASpendingClient) {
	registerSearchAwardsTool(server, client);
	registerSearchTransactionsTool(server, client);
	registerGetAwardDetailsTool(server, client);
	registerSearchRecipientsTool(server, client);
	registerGetRecipientDetailsTool(server, client);
	registerSearchIdvAwardsTool(server, client);
	registerGetSpendingOverTimeTool(server, client);
	registerAnalyzeCompetitionTool(server, client);
}
