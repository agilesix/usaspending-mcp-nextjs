/**
 * USASpending MCP Server for Vercel Next.js
 *
 * This server provides tools for researching federal contract awards and incumbents
 * using the USASpending.gov API
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createUSASpendingClient } from "../../src/clients/usaspending";
import { parseDateRange, parseNaturalDate, getFiscalYearRange } from "../../src/utils/dates";

const handler = createMcpHandler(
	async (server) => {
		const client = createUSASpendingClient();

		// Tool 1: Enhanced search for prior awards
		server.tool(
			"search_awards",
			"Search for federal contract awards using various criteria. Supports natural language dates like 'yesterday', 'last week', 'last 30 days', 'last month', 'last quarter', 'last year'. Use this to find digital services awards, specific contractors, or analyze spending patterns.",
			{
				keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions (e.g., ['digital services', 'software development', 'agile'])"),
				recipientName: z.string().optional().describe("Contractor/recipient name to search for (e.g., 'Agile Six', 'Oddball', 'GDIT')"),
				agencyName: z.string().optional().describe("Awarding agency name (e.g., 'Department of Veterans Affairs', 'VA')"),
				naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by (e.g., ['541511'] for Custom Computer Programming, ['541512'] for Computer Systems Design)"),
				pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by (e.g., ['D307'] for IT/Telecom, ['D302'] for Systems Development)"),
				dateRange: z.string().optional().describe("Natural language date range like 'yesterday', 'last week', 'last 30 days', 'last month', 'last quarter', 'last year', or use startDate/endDate for specific dates"),
				startDate: z.string().optional().describe("Start date for award period. Can be YYYY-MM-DD format OR natural language like 'last month', '30 days ago', 'yesterday'. If provided without endDate, endDate defaults to today. Omit both dates to search all historical data."),
				endDate: z.string().optional().describe("End date for award period in YYYY-MM-DD format or 'today'. If provided without startDate, startDate defaults to 1 year ago. Omit both dates to search all historical data."),
				fiscalYear: z.number().optional().describe("Federal fiscal year (Oct 1 - Sep 30). Example: 2024 for FY2024 (Oct 1, 2023 - Sep 30, 2024)"),
				minAmount: z.number().optional().describe("Minimum award amount in dollars"),
				maxAmount: z.number().optional().describe("Maximum award amount in dollars"),
				state: z.string().optional().describe("State code for place of performance (e.g., 'VA', 'CA')"),
				awardTypeCodes: z.array(z.string()).optional().describe("Award type codes: A=BPA Call, B=Purchase Order, C=Delivery Order, D=Definitive Contract. Default is contracts only ['A','B','C','D']"),
				setAsideTypes: z.array(z.string()).optional().describe("Set aside type codes (e.g., 'SDVOSBC' for Service-Disabled Veteran-Owned Small Business, '8A' for 8(a) Program, 'WOSB' for Women-Owned Small Business)"),
				extentCompeted: z.array(z.string()).optional().describe("Competition codes: 'A' for Full and Open Competition, 'D' for Full and Open After Exclusion of Sources, 'E' for Follow On to Competed Action, 'CDO' for Competitive Delivery Order"),
				contractPricingTypes: z.array(z.string()).optional().describe("Pricing type codes (e.g., 'FFPF' for Firm Fixed Price, 'TM' for Time and Materials, 'CPFF' for Cost Plus Fixed Fee)"),
				limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 10)"),
			},
			async ({
				keywords,
				recipientName,
				agencyName,
				naicsCodes,
				pscCodes,
				dateRange,
				startDate,
				endDate,
				fiscalYear,
				minAmount,
				maxAmount,
				state,
				awardTypeCodes,
				setAsideTypes,
				extentCompeted,
				contractPricingTypes,
				limit,
			}) => {
				try {
					// Build filters object
					const filters: any = {
						award_type_codes: awardTypeCodes || ['A', 'B', 'C', 'D'], // Default to contracts only
					};

					// Add keywords
					if (keywords && keywords.length > 0) {
						filters.keywords = keywords;
					}

					// Handle dates with priority: fiscalYear > dateRange > startDate/endDate
					if (fiscalYear) {
						const fyRange = getFiscalYearRange(fiscalYear);
						filters.time_period = [{
							start_date: fyRange.start_date,
							end_date: fyRange.end_date,
						}];
					} else if (dateRange) {
						const range = parseDateRange(dateRange);
						filters.time_period = [{
							start_date: range.start_date,
							end_date: range.end_date,
						}];
					} else if (startDate || endDate) {
						// Parse natural language dates if provided
						let start = startDate;
						let end = endDate;

						if (startDate) {
							start = parseNaturalDate(startDate);
						} else {
							// Default to 1 year ago if endDate provided without startDate
							const date = new Date();
							date.setFullYear(date.getFullYear() - 1);
							start = date.toISOString().split('T')[0];
						}

						if (endDate) {
							end = parseNaturalDate(endDate);
						} else {
							// Default to today if startDate provided without endDate
							end = new Date().toISOString().split('T')[0];
						}

						filters.time_period = [{
							start_date: start,
							end_date: end,
						}];
					}

					// Add recipient search
					if (recipientName) {
						filters.recipient_search_text = [recipientName];
					}

					// Add agency filter
					if (agencyName) {
						filters.agencies = [{
							type: 'awarding',
							tier: 'toptier',
							name: agencyName,
						}];
					}

					// Add NAICS codes
					if (naicsCodes && naicsCodes.length > 0) {
						filters.naics_codes = naicsCodes;
					}

					// Add PSC codes
					if (pscCodes && pscCodes.length > 0) {
						filters.psc_codes = pscCodes;
					}

					// Add award amount range
					if (minAmount !== undefined || maxAmount !== undefined) {
						filters.award_amounts = [{
							lower_bound: minAmount,
							upper_bound: maxAmount,
						}];
					}

					// Add place of performance
					if (state) {
						filters.place_of_performance_locations = [{
							country: 'USA',
							state: state,
						}];
					}

					// Add set-aside types
					if (setAsideTypes && setAsideTypes.length > 0) {
						filters.set_aside_type_codes = setAsideTypes;
					}

					// Add extent competed
					if (extentCompeted && extentCompeted.length > 0) {
						filters.extent_competed_type_codes = extentCompeted;
					}

					// Add contract pricing types
					if (contractPricingTypes && contractPricingTypes.length > 0) {
						filters.contract_pricing_type_codes = contractPricingTypes;
					}

					/**
					 * IMPORTANT: The USASpending API v2 requires:
					 * 1. All filter parameters must be wrapped in a "filters" object
					 * 2. A "fields" array is REQUIRED - it specifies which columns to return
					 */
					const searchParams: any = {
						filters,
						fields: [
							"Award ID",
							"Recipient Name",
							"Start Date",
							"End Date",
							"Award Amount",
							"Total Outlays",
							"awarding_agency_code",
							"awarding_toptier_agency_name",
							"awarding_subtier_agency_name",
							"Description",
							"def_codes",
							"COVID-19 Obligations",
							"COVID-19 Outlays",
							"Infrastructure Obligations",
							"Infrastructure Outlays",
							"recipient_id",
							"Recipient UEI",
							"recipient_parent_id",
							"Recipient Parent UEI",
							"prime_award_recipient_id",
							"prime_award_recipient_uei",
							"Contract Award Type",
							"NAICS Code",
							"NAICS Description",
							"Product or Service Code",
							"Product or Service Code Description",
							"Place of Performance City Code",
							"Place of Performance City Name",
							"Place of Performance County Code",
							"Place of Performance County Name",
							"Place of Performance State Code",
							"Place of Performance State Name",
							"Place of Performance Country Name",
							"Place of Performance Zip5",
							"Place of Performance Congressional District"
						],
						limit: limit || 10,
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
										awards: result.results?.map((award: any) => ({
											// PIID - Human-readable award number for display
											id: award["Award ID"],
											// generated_unique_award_id - USE THIS for get_award_details()
											internalId: award.generated_internal_id,
											description: award["Description"],
											amount: award["Award Amount"],
											totalOutlays: award["Total Outlays"],
											recipientName: award["Recipient Name"],
											recipientUei: award["Recipient UEI"],
											recipientId: award["recipient_id"],
											awardingAgency: award["awarding_toptier_agency_name"],
											awardingSubAgency: award["awarding_subtier_agency_name"],
											startDate: award["Start Date"],
											endDate: award["End Date"],
											contractType: award["Contract Award Type"],
											naicsCode: award["NAICS Code"],
											naicsDescription: award["NAICS Description"],
											pscCode: award["Product or Service Code"],
											pscDescription: award["Product or Service Code Description"],
											placeOfPerformance: {
												state: award["Place of Performance State Name"],
												stateCode: award["Place of Performance State Code"],
												city: award["Place of Performance City Name"],
												county: award["Place of Performance County Name"],
												zip: award["Place of Performance Zip5"],
												country: award["Place of Performance Country Name"],
												congressionalDistrict: award["Place of Performance Congressional District"],
											},
										})) || [],
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

		// Tool 2: Get detailed award information
		server.tool(
			"get_award_details",
			"Get detailed information about a specific award using its ID",
			{
				awardId: z.string().describe("The generated_unique_award_id from search results. Use the 'internalId' field returned by search_awards (e.g., 'CONT_AWD_36C10G22K0075_3600_36C79119D0006_3600'), NOT the simple PIID."),
			},
			async ({ awardId }) => {
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

		// Tool 3: Search for recipients/incumbents
		server.tool(
			"search_recipients",
			"Search for contractors/recipients by name to find their recipient hash for detailed lookups",
			{
				searchText: z.string().describe("Contractor/recipient name to search for"),
				limit: z.number().min(1).max(50).optional().describe("Number of results (max 50, default 10)"),
			},
			async ({ searchText, limit }) => {
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
										recipients: result.results?.map(r => ({
											hash: r.recipient_hash,
											name: r.recipient_name,
											uei: r.recipient_uei,
											duns: r.recipient_unique_id,
											level: r.recipient_level,
										})) || [],
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

		// Tool 4: Get recipient/incumbent details and award history
		server.tool(
			"get_recipient_details",
			"Get detailed information about a specific recipient/contractor including their award history",
			{
				recipientHash: z.string().describe("The recipient hash ID from search_recipients"),
			},
			async ({ recipientHash }) => {
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

		// Tool 5: Search for IDV child awards and task orders
		server.tool(
			"search_idv_awards",
			"Find task orders and child awards under an Indefinite Delivery Vehicle (IDV). Useful for understanding who holds a contract vehicle and who is getting task orders. IDVs are contract vehicles like GWACs, GSA Schedules, and BPAs that spawn individual task orders.",
			{
				awardId: z.string().describe("The generated_unique_award_id (internalId) of the parent IDV contract from search_awards results"),
				limit: z.number().min(1).max(100).optional().describe("Number of results to return (max 100, default 25)"),
			},
			async ({ awardId, limit }) => {
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

		// Tool 6: Get spending trends over time
		server.tool(
			"get_spending_over_time",
			"Analyze spending trends over time for specific criteria. Great for understanding market trends, agency spending patterns, or how much money is flowing to certain types of work (e.g., 'digital services spending at VA over the last 3 years'). Returns time-series data grouped by fiscal year, quarter, or month.",
			{
				keywords: z.array(z.string()).optional().describe("Keywords to search in award descriptions"),
				recipientName: z.string().optional().describe("Contractor/recipient name to filter by"),
				agencyName: z.string().optional().describe("Awarding agency name"),
				naicsCodes: z.array(z.string()).optional().describe("NAICS codes to filter by"),
				pscCodes: z.array(z.string()).optional().describe("Product Service Codes to filter by"),
				dateRange: z.string().optional().describe("Natural language date range like 'last year', 'last 3 years', 'last quarter'"),
				startDate: z.string().optional().describe("Start date (YYYY-MM-DD or natural language)"),
				endDate: z.string().optional().describe("End date (YYYY-MM-DD or natural language)"),
				group: z.enum(['fiscal_year', 'quarter', 'month']).optional().describe("How to group the time series data (default: fiscal_year)"),
			},
			async ({
				keywords,
				recipientName,
				agencyName,
				naicsCodes,
				pscCodes,
				dateRange,
				startDate,
				endDate,
				group,
			}) => {
				try {
					// Build filters similar to search_awards
					const filters: any = {
						award_type_codes: ['A', 'B', 'C', 'D'],
					};

					if (keywords && keywords.length > 0) {
						filters.keywords = keywords;
					}

					if (recipientName) {
						filters.recipient_search_text = [recipientName];
					}

					if (agencyName) {
						filters.agencies = [{
							type: 'awarding',
							tier: 'toptier',
							name: agencyName,
						}];
					}

					if (naicsCodes && naicsCodes.length > 0) {
						filters.naics_codes = naicsCodes;
					}

					if (pscCodes && pscCodes.length > 0) {
						filters.psc_codes = pscCodes;
					}

					// Handle dates
					if (dateRange) {
						const range = parseDateRange(dateRange);
						filters.time_period = [{
							start_date: range.start_date,
							end_date: range.end_date,
						}];
					} else if (startDate || endDate) {
						const start = startDate ? parseNaturalDate(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
						const end = endDate ? parseNaturalDate(endDate) : new Date().toISOString().split('T')[0];
						filters.time_period = [{
							start_date: start,
							end_date: end,
						}];
					}

					const result = await client.getSpendingOverTime({
						filters,
						group: group || 'fiscal_year',
					});

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(
									{
										summary: `Spending trends grouped by ${group || 'fiscal_year'}`,
										group_by: group || 'fiscal_year',
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

		// Tool 7: Analyze competitive landscape for similar awards
		server.tool(
			"analyze_competition",
			"Analyze the competitive landscape for a specific type of work. Shows who's winning awards, competition levels, and pricing trends. Perfect for understanding who the key players are in a market space (e.g., 'who are the top digital services contractors at VA?')",
			{
				keywords: z.array(z.string()).optional().describe("Keywords describing the type of work"),
				agencyName: z.string().optional().describe("Agency to analyze"),
				naicsCodes: z.array(z.string()).optional().describe("NAICS codes for the industry"),
				pscCodes: z.array(z.string()).optional().describe("Product Service Codes"),
				dateRange: z.string().optional().describe("Natural language date range (default: last year)"),
				startDate: z.string().optional().describe("Start date"),
				endDate: z.string().optional().describe("End date"),
				minAmount: z.number().optional().describe("Minimum award size to analyze"),
				limit: z.number().min(1).max(100).optional().describe("Number of top recipients to show (default: 20)"),
			},
			async ({
				keywords,
				agencyName,
				naicsCodes,
				pscCodes,
				dateRange,
				startDate,
				endDate,
				minAmount,
				limit,
			}) => {
				try {
					// Build filters
					const filters: any = {
						award_type_codes: ['A', 'B', 'C', 'D'],
					};

					if (keywords && keywords.length > 0) {
						filters.keywords = keywords;
					}

					if (agencyName) {
						filters.agencies = [{
							type: 'awarding',
							tier: 'toptier',
							name: agencyName,
						}];
					}

					if (naicsCodes && naicsCodes.length > 0) {
						filters.naics_codes = naicsCodes;
					}

					if (pscCodes && pscCodes.length > 0) {
						filters.psc_codes = pscCodes;
					}

					if (minAmount) {
						filters.award_amounts = [{
							lower_bound: minAmount,
						}];
					}

					// Default to last year if no dates provided
					if (dateRange) {
						const range = parseDateRange(dateRange);
						filters.time_period = [{
							start_date: range.start_date,
							end_date: range.end_date,
						}];
					} else if (startDate || endDate) {
						const start = startDate ? parseNaturalDate(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
						const end = endDate ? parseNaturalDate(endDate) : new Date().toISOString().split('T')[0];
						filters.time_period = [{
							start_date: start,
							end_date: end,
						}];
					} else {
						// Default to last year
						const range = parseDateRange('last year');
						filters.time_period = [{
							start_date: range.start_date,
							end_date: range.end_date,
						}];
					}

					// Get awards and aggregate by recipient
					const searchParams: any = {
						filters,
						fields: [
							"Award ID",
							"Recipient Name",
							"Award Amount",
							"Recipient UEI",
							"Contract Award Type",
						],
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
						.slice(0, limit || 20);

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
										top_recipients: topRecipients.map(r => ({
											name: r.name,
											uei: r.uei,
											total_amount: r.totalAmount,
											award_count: r.awardCount,
											market_share_pct: ((r.totalAmount / totalMarketSize) * 100).toFixed(2),
											avg_award_size: (r.totalAmount / r.awardCount).toFixed(2),
										})),
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
	},
	{
		capabilities: {
			tools: {},
		},
	},
	{
		basePath: "",
		verboseLogs: true,
		maxDuration: 300,
		disableSse: false,
		redisUrl: process.env.KV_REST_API_URL,
	},
);

export { handler as GET, handler as POST, handler as DELETE };
