/**
 * Prompts Index
 * Central export file for all MCP prompts
 */

import type { USASpendingClient } from '../clients/usaspending';
import { registerDailyCompetitiveBriefPrompt } from './daily-competitive-brief';

/**
 * Register all prompts with the MCP server
 */
export function registerAllPrompts(server: any, client: USASpendingClient) {
	registerDailyCompetitiveBriefPrompt(server);
}
