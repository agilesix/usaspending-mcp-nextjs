/**
 * Search Recipients Tool
 * Search for contractors/recipients by name
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { transformRecipientResult } from '../builders/field-mapper';

export function registerSearchRecipientsTool(server: any, client: USASpendingClient) {
	server.tool(
		"search_recipients",
		"Search for contractors/recipients by name to find their recipient hash for detailed lookups",
		{
			searchText: z.string().describe("Contractor/recipient name to search for"),
			limit: z.number().min(1).max(50).optional().describe("Number of results (max 50, default 10)"),
		},
		async ({ searchText, limit }: { searchText: string; limit?: number }) => {
			try {
				const result = await client.searchRecipients({
					search_text: searchText,
					limit: limit || 10,
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									total: result.results?.length || 0,
									recipients: result.results?.map(transformRecipientResult) || [],
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
