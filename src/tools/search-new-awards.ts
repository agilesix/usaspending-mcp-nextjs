/**
 * Search New Awards Tool
 * Search for newly awarded contracts by their action date
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { buildAwardFilters } from '../builders/filter-builder';
import { TRANSACTION_FIELDS, transformTransactionResult } from '../builders/field-mapper';

export interface SearchNewAwardsParams {
	awardStartDate: string;
	awardEndDate?: string;
	keywords?: string[];
	recipientName?: string;
	agencyName?: string;
	naicsCodes?: string[];
	pscCodes?: string[];
	minAmount?: number;
	maxAmount?: number;
	awardTypeCodes?: string[];
	limit?: number;
}

export function registerSearchNewAwardsTool(server: any, client: USASpendingClient) {
	server.tool(
		"search_new_awards",
		"Search for newly awarded contracts by their award date (Action Date). Returns only BASE awards (Modification Number = 0), not modifications to existing awards. Use this when you need to find contracts that were actually signed/awarded during a specific date range (e.g., 'awards signed yesterday', 'new contracts this week').",
		{
			awardStartDate: z.string().describe("Start date in YYYY-MM-DD format - the earliest award signing date to include. This is when the contract was actually signed/executed."),
			awardEndDate: z.string().optional().describe("End date in YYYY-MM-DD format for award signing dates. Defaults to awardStartDate if not provided (single day search)."),
			keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions (e.g., ['digital services', 'software development', 'agile'])"),
			recipientName: z.string().optional().describe("Contractor/recipient name to search for (e.g., 'Agile Six', 'Oddball', 'GDIT')"),
			agencyName: z.string().optional().describe("Awarding agency name (e.g., 'Department of Veterans Affairs', 'VA')"),
			naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by (e.g., ['541511'] for Custom Computer Programming, ['541512'] for Computer Systems Design)"),
			pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by (e.g., ['D307'] for IT/Telecom, ['D302'] for Systems Development)"),
			minAmount: z.number().optional().describe("Minimum award amount in dollars"),
			maxAmount: z.number().optional().describe("Maximum award amount in dollars"),
			awardTypeCodes: z.array(z.string()).optional().describe("Award type codes: A=BPA Call, B=Purchase Order, C=Delivery Order, D=Definitive Contract. Default is contracts only ['A','B','C','D']"),
			limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 10)"),
		},
		async (params: SearchNewAwardsParams) => {
			try {
				const endDate = params.awardEndDate || params.awardStartDate;

				// Build filters using centralized filter builder
				const filters = buildAwardFilters({
					keywords: params.keywords,
					recipientName: params.recipientName,
					agencyName: params.agencyName,
					naicsCodes: params.naicsCodes,
					pscCodes: params.pscCodes,
					activityStartDate: params.awardStartDate,
					activityEndDate: endDate,
					minAmount: params.minAmount,
					maxAmount: params.maxAmount,
					awardTypeCodes: params.awardTypeCodes,
				});

				// Use transaction endpoint to search by action date
				const searchParams: any = {
					filters,
					fields: TRANSACTION_FIELDS,
					limit: params.limit || 10,
					page: 1,
					sort: "Transaction Amount",
					order: "desc" as const,
				};

				const result = await client.searchTransactions(searchParams);

				// Filter for base awards only (Modification Number = "0")
				const newAwardsOnly = result.results?.filter((tx: any) => {
					const modNum = String(tx["Modification Number"] || "").trim();
					return modNum === "0" || modNum === "";
				}) || [];

				const summary = `Found ${newAwardsOnly.length} new awards signed between ${params.awardStartDate} and ${endDate} (filtered from ${result.results?.length || 0} total transactions)`;

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary,
									total: newAwardsOnly.length,
									awards: newAwardsOnly.map(transformTransactionResult),
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
