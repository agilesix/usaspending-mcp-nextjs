/**
 * Get Recipient Details Tool
 * Retrieve detailed information about a specific recipient/contractor
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';

export function registerGetRecipientDetailsTool(server: any, client: USASpendingClient) {
	server.tool(
		"get_recipient_details",
		"Get detailed information about a specific recipient/contractor including their award history",
		{
			recipientHash: z.string().describe("The recipient hash ID from search_recipients"),
		},
		async ({ recipientHash }: { recipientHash: string }) => {
			try {
				const recipient = await client.getRecipientDetails(recipientHash);

				if (!recipient) {
					return {
						content: [
							{
								type: "text",
								text: `Recipient with hash ${recipientHash} not found`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(recipient, null, 2),
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
