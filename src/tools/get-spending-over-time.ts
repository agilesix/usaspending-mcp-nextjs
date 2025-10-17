/**
 * Get Spending Over Time Tool
 * Analyze spending trends over time
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { buildAwardFilters } from '../builders/filter-builder';
import type { GetSpendingOverTimeParams } from '../types/tool-params';

export function registerGetSpendingOverTimeTool(server: any, client: USASpendingClient) {
	server.tool(
		"get_spending_over_time",
		"Analyze spending trends over time for transaction activity. Returns time-series data grouped by fiscal year, quarter, or month. NOTE: Analyzes transaction activity (when money was obligated), not original award dates.",
		{
			keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions"),
			recipientName: z.string().optional().describe("Contractor/recipient name to filter by"),
			agencyName: z.string().optional().describe("Awarding agency name"),
			naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by"),
			pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by"),
			activityStartDate: z.string().optional().describe("Start date in YYYY-MM-DD format for transaction activity period"),
			activityEndDate: z.string().optional().describe("End date in YYYY-MM-DD format for transaction activity period"),
			group: z.enum(['fiscal_year', 'quarter', 'month']).optional().describe("How to group the time series data (default: fiscal_year)"),
		},
		async (params: GetSpendingOverTimeParams) => {
			try {
				// Build filters using centralized filter builder
				const filters = buildAwardFilters({
					keywords: params.keywords,
					recipientName: params.recipientName,
					agencyName: params.agencyName,
					naicsCodes: params.naicsCodes,
					pscCodes: params.pscCodes,
					activityStartDate: params.activityStartDate,
					activityEndDate: params.activityEndDate,
				});

				const result = await client.getSpendingOverTime({
					filters,
					group: params.group || 'fiscal_year',
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary: `Spending trends grouped by ${params.group || 'fiscal_year'}`,
									group_by: params.group || 'fiscal_year',
									results: result.results || [],
								},
								null,
								2
							),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
						},
					],
				};
			}
		}
	);
}
