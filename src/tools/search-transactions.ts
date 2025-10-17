/**
 * Search Transactions Tool
 * Search individual transactions by their action date (for finding truly new awards)
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { buildAwardFilters } from '../builders/filter-builder';
import { TRANSACTION_FIELDS, transformTransactionResult } from '../builders/field-mapper';
import type { SearchTransactionsParams } from '../types/tool-params';

export function registerSearchTransactionsTool(server: any, client: USASpendingClient) {
	server.tool(
		"search_transactions",
		"Search individual transactions by their action date. USE THIS to find truly NEW awards from a specific date (e.g., 'awards yesterday'). The Action Date is when the transaction was executed - for new awards, this is the award date. For modifications, it's the modification date. This is the CORRECT tool for finding new awards on a specific date.",
		{
			actionStartDate: z.string().describe("Start date in YYYY-MM-DD format for transaction action dates. This is when the transaction was actually executed (signed). Required for transaction searches."),
			actionEndDate: z.string().optional().describe("End date in YYYY-MM-DD format. Defaults to same as actionStartDate if not provided (single day search)."),
			keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions"),
			recipientName: z.string().optional().describe("Contractor/recipient name to search for"),
			agencyName: z.string().optional().describe("Awarding agency name"),
			naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by"),
			pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by"),
			minAmount: z.number().optional().describe("Minimum transaction amount in dollars"),
			maxAmount: z.number().optional().describe("Maximum transaction amount in dollars"),
			awardTypeCodes: z.array(z.string()).optional().describe("Award type codes: A=BPA Call, B=Purchase Order, C=Delivery Order, D=Definitive Contract. Default is contracts only ['A','B','C','D']"),
			limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 10)"),
		},
		async (params: SearchTransactionsParams) => {
			try {
				const end = params.actionEndDate || params.actionStartDate;

				// Build filters using centralized filter builder
				const filters = buildAwardFilters({
					keywords: params.keywords,
					recipientName: params.recipientName,
					agencyName: params.agencyName,
					naicsCodes: params.naicsCodes,
					pscCodes: params.pscCodes,
					activityStartDate: params.actionStartDate,
					activityEndDate: end,
					minAmount: params.minAmount,
					maxAmount: params.maxAmount,
					awardTypeCodes: params.awardTypeCodes,
				});

				// Use spending_by_transaction endpoint for action date search
				const searchParams: any = {
					filters,
					fields: TRANSACTION_FIELDS,
					limit: params.limit || 10,
					page: 1,
					sort: "Transaction Amount",
					order: "desc" as const,
				};

				// Use the transaction search endpoint directly
				const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_transaction/', {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(searchParams),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`API error (${response.status}): ${errorText}`);
				}

				const result = await response.json();

				const summary = `Found ${result.page_metadata?.total || 0} transactions with action dates ${params.actionStartDate} to ${end} (showing ${result.results?.length || 0})`;

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary,
									total: result.page_metadata?.total || 0,
									transactions: result.results?.map(transformTransactionResult) || [],
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
