/**
 * Search Awards Tool
 * Search for federal contract awards with various filters
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { buildAwardFilters } from '../builders/filter-builder';
import { AWARD_FIELDS, TRANSACTION_FIELDS, transformAwardResult, transformTransactionResult } from '../builders/field-mapper';
import type { SearchAwardsParams } from '../types/tool-params';

export function registerSearchAwardsTool(server: any, client: USASpendingClient) {
	server.tool(
		"search_awards",
		"Search for federal contract awards. By default, date filtering searches for awards with ANY transaction activity (modifications, obligations, payments) during the date range. To find truly NEW awards signed on a specific date, set searchNewAwardsOnly=true and provide activityStartDate/activityEndDate for the award signing dates.",
		{
			keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions (e.g., ['digital services', 'software development', 'agile'])"),
			recipientName: z.string().optional().describe("Contractor/recipient name to search for (e.g., 'Agile Six', 'Oddball', 'GDIT')"),
			agencyName: z.string().optional().describe("Awarding agency name (e.g., 'Department of Veterans Affairs', 'VA')"),
			naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by (e.g., ['541511'] for Custom Computer Programming, ['541512'] for Computer Systems Design)"),
			pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by (e.g., ['D307'] for IT/Telecom, ['D302'] for Systems Development)"),
			activityStartDate: z.string().optional().describe("Start date in YYYY-MM-DD format for filtering by transaction activity. Searches for awards that had ANY financial activity (new awards, modifications, obligations) on or after this date. If provided without activityEndDate, defaults to searching through today. Omit both dates to search all historical awards."),
			activityEndDate: z.string().optional().describe("End date in YYYY-MM-DD format for transaction activity. Searches for awards with activity on or before this date. If provided without activityStartDate, defaults to searching from 1 year ago. Omit both dates to search all historical awards."),
			minAmount: z.number().optional().describe("Minimum award amount in dollars"),
			maxAmount: z.number().optional().describe("Maximum award amount in dollars"),
			state: z.string().optional().describe("State code for place of performance (e.g., 'VA', 'CA')"),
			awardTypeCodes: z.array(z.string()).optional().describe("Award type codes: A=BPA Call, B=Purchase Order, C=Delivery Order, D=Definitive Contract. Default is contracts only ['A','B','C','D']"),
			setAsideTypes: z.array(z.string()).optional().describe("Set aside type codes (e.g., 'SDVOSBC' for Service-Disabled Veteran-Owned Small Business, '8A' for 8(a) Program, 'WOSB' for Women-Owned Small Business)"),
			extentCompeted: z.array(z.string()).optional().describe("Competition codes: 'A' for Full and Open Competition, 'D' for Full and Open After Exclusion of Sources, 'E' for Follow On to Competed Action, 'CDO' for Competitive Delivery Order"),
			contractPricingTypes: z.array(z.string()).optional().describe("Pricing type codes (e.g., 'FFPF' for Firm Fixed Price, 'TM' for Time and Materials, 'CPFF' for Cost Plus Fixed Fee)"),
			limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 10)"),
			searchNewAwardsOnly: z.boolean().optional().describe("Set to true to search for awards by their actual award date (Action Date). When true, only returns base awards (not modifications) signed during the date range. When false (default), returns all awards with any transaction activity during the date range."),
		},
		async (params: SearchAwardsParams) => {
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
					minAmount: params.minAmount,
					maxAmount: params.maxAmount,
					state: params.state,
					awardTypeCodes: params.awardTypeCodes,
					setAsideTypes: params.setAsideTypes,
					extentCompeted: params.extentCompeted,
					contractPricingTypes: params.contractPricingTypes,
				});

				// Determine if we should search for new awards only (by action date)
				if (params.searchNewAwardsOnly) {
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
					const baseAwardsOnly = result.results?.filter((tx: any) =>
						String(tx["Modification Number"] || "").trim() === "0"
					) || [];

					const summary = `Found ${baseAwardsOnly.length} new awards (filtered from ${result.results?.length || 0} transactions)`;

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										summary,
										total: baseAwardsOnly.length,
										awards: baseAwardsOnly.map(transformTransactionResult),
									},
									null,
									2
								),
							},
						],
					};
				}

				// Default behavior: search for awards with any activity
				const searchParams: any = {
					filters,
					fields: AWARD_FIELDS,
					limit: params.limit || 10,
					page: 1,
					sort: "Award Amount",
					order: "desc" as const,
				};

				const result = await client.searchAwards(searchParams);

				const summary = `Found ${result.page_metadata?.total || 0} awards (showing ${result.results?.length || 0})`;

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary,
									total: result.page_metadata?.total || 0,
									awards: result.results?.map(transformAwardResult) || [],
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
