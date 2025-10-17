/**
 * Get Award Details Tool
 * Retrieve detailed information about a specific award
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';

export function registerGetAwardDetailsTool(server: any, client: USASpendingClient) {
	server.tool(
		"get_award_details",
		"Get detailed information about a specific award using its ID",
		{
			awardId: z.string().describe("The generated_unique_award_id from search results. Use the 'internalId' field returned by search_awards (e.g., 'CONT_AWD_36C10G22K0075_3600_36C79119D0006_3600'), NOT the simple PIID."),
		},
		async ({ awardId }: { awardId: string }) => {
			try {
				const award = await client.getAwardDetails(awardId);

				if (!award) {
					return {
						content: [
							{
								type: "text",
								text: `Award with ID ${awardId} not found. Tip: Use the 'internalId' field (generated_unique_award_id) from search_awards results, not the simple PIID.`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(award, null, 2),
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
