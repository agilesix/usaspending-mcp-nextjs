/**
 * Analyze Competition Tool
 * Analyze the competitive landscape for similar awards
 */

import { z } from 'zod';
import type { USASpendingClient } from '../clients/usaspending';
import { buildAwardFilters } from '../builders/filter-builder';
import { COMPETITION_FIELDS, transformCompetitionRecipient } from '../builders/field-mapper';
import type { AnalyzeCompetitionParams } from '../types/tool-params';

export function registerAnalyzeCompetitionTool(server: any, client: USASpendingClient) {
	server.tool(
		"analyze_competition",
		"Analyze the competitive landscape based on transaction activity. Shows who's winning awards/modifications, market shares, and spending patterns. NOTE: Analyzes transaction activity, which includes both new awards and modifications to existing awards.",
		{
			keywords: z.array(z.string()).optional().describe("Keywords describing the type of work"),
			agencyName: z.string().optional().describe("Agency to analyze"),
			naicsCodes: z.array(z.string()).optional().describe("NAICS codes for the industry"),
			pscCodes: z.array(z.string()).optional().describe("Product Service Codes"),
			activityStartDate: z.string().optional().describe("Start date in YYYY-MM-DD format for transaction activity (defaults to 1 year ago if not provided)"),
			activityEndDate: z.string().optional().describe("End date in YYYY-MM-DD format for transaction activity (defaults to today if not provided)"),
			minAmount: z.number().optional().describe("Minimum award size to analyze"),
			limit: z.number().min(1).max(100).optional().describe("Number of top recipients to show (default: 20)"),
		},
		async (params: AnalyzeCompetitionParams) => {
			try {
				// Build filters using centralized filter builder
				// Always apply date filter for competition analysis (defaults to last year)
				const activityStartDate = params.activityStartDate || (() => {
					const date = new Date();
					date.setFullYear(date.getFullYear() - 1);
					return date.toISOString().split('T')[0];
				})();
				const activityEndDate = params.activityEndDate || new Date().toISOString().split('T')[0];

				const filters = buildAwardFilters({
					keywords: params.keywords,
					agencyName: params.agencyName,
					naicsCodes: params.naicsCodes,
					pscCodes: params.pscCodes,
					activityStartDate,
					activityEndDate,
					minAmount: params.minAmount,
				});

				// Get awards and aggregate by recipient
				const searchParams: any = {
					filters,
					fields: COMPETITION_FIELDS,
					limit: 100, // Get more results for better analysis
					page: 1,
					sort: "Award Amount",
					order: "desc" as const,
				};

				const result = await client.searchAwards(searchParams);

				// Aggregate by recipient
				const recipientMap = new Map<string, {
					name: string,
					uei: string,
					totalAmount: number,
					awardCount: number,
					awards: string[],
				}>();

				for (const award of result.results || []) {
					const name = String(award["Recipient Name"] || "Unknown");
					const uei = String(award["Recipient UEI"] || "");
					const amount = Number(award["Award Amount"]) || 0;
					const id = String(award["Award ID"] || "");

					if (!recipientMap.has(name)) {
						recipientMap.set(name, {
							name,
							uei,
							totalAmount: 0,
							awardCount: 0,
							awards: [],
						});
					}

					const recipient = recipientMap.get(name)!;
					recipient.totalAmount += amount;
					recipient.awardCount += 1;
					recipient.awards.push(id);
				}

				// Convert to array and sort by total amount
				const topRecipients = Array.from(recipientMap.values())
					.sort((a, b) => b.totalAmount - a.totalAmount)
					.slice(0, params.limit || 20);

				const totalMarketSize = topRecipients.reduce((sum, r) => sum + r.totalAmount, 0);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									summary: `Competitive analysis showing top ${topRecipients.length} recipients`,
									total_awards_analyzed: result.page_metadata?.total || 0,
									total_market_size: totalMarketSize,
									top_recipients: topRecipients.map(r => transformCompetitionRecipient(r, totalMarketSize)),
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
