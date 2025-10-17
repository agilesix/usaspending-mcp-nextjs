/**
 * Search IDV Awards Tool
 * Find task orders and child awards under an Indefinite Delivery Vehicle
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';

export function registerSearchIdvAwardsTool(server: any, client: USASpendingClient) {
	server.tool(
		"search_idv_awards",
		"Find task orders and child awards under an Indefinite Delivery Vehicle (IDV). Useful for understanding who holds a contract vehicle and who is getting task orders. IDVs are contract vehicles like GWACs, GSA Schedules, and BPAs that spawn individual task orders.",
		{
			awardId: z.string().describe("The generated_unique_award_id (internalId) of the parent IDV contract from search_awards results"),
			limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 25)"),
		},
		async ({ awardId, limit }: { awardId: string; limit?: number }) => {
			try {
				const result = await client.getIdvActivity({
					award_id: awardId,
					limit: limit || 25,
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary: `Found ${result.results?.length || 0} child awards under this IDV`,
									idv_id: awardId,
									child_awards: result.results || [],
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
