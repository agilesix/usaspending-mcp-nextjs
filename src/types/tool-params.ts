/**
 * Type definitions for tool parameters
 */

export interface SearchAwardsParams {
	keywords?: string[];
	recipientName?: string;
	agencyName?: string;
	naicsCodes?: string[];
	pscCodes?: string[];
	activityStartDate?: string;
	activityEndDate?: string;
	minAmount?: number;
	maxAmount?: number;
	state?: string;
	awardTypeCodes?: string[];
	setAsideTypes?: string[];
	extentCompeted?: string[];
	contractPricingTypes?: string[];
	limit?: number;
}

export interface SearchTransactionsParams {
	actionStartDate: string;
	actionEndDate?: string;
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

export interface GetSpendingOverTimeParams {
	keywords?: string[];
	recipientName?: string;
	agencyName?: string;
	naicsCodes?: string[];
	pscCodes?: string[];
	activityStartDate?: string;
	activityEndDate?: string;
	group?: 'fiscal_year' | 'quarter' | 'month';
}

export interface AnalyzeCompetitionParams {
	keywords?: string[];
	agencyName?: string;
	naicsCodes?: string[];
	pscCodes?: string[];
	activityStartDate?: string;
	activityEndDate?: string;
	minAmount?: number;
	limit?: number;
}
