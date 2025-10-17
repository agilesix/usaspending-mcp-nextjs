/**
 * Filter Builder for USASpending API
 * Centralizes filter building logic to avoid duplication across tools
 */

export interface FilterParams {
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
}

/**
 * Build time period filter for transaction activity
 */
export function buildTimeFilter(startDate?: string, endDate?: string): any {
	if (!startDate && !endDate) {
		return null;
	}

	const start = startDate || (() => {
		const date = new Date();
		date.setFullYear(date.getFullYear() - 1);
		return date.toISOString().split('T')[0];
	})();

	const end = endDate || new Date().toISOString().split('T')[0];

	return [{
		start_date: start,
		end_date: end,
	}];
}

/**
 * Build recipient search filter
 */
export function buildRecipientFilter(recipientName?: string): string[] | null {
	return recipientName ? [recipientName] : null;
}

/**
 * Build agency filter
 */
export function buildAgencyFilter(agencyName?: string): any[] | null {
	return agencyName ? [{
		type: 'awarding',
		tier: 'toptier',
		name: agencyName,
	}] : null;
}

/**
 * Build NAICS codes filter
 */
export function buildNaicsFilter(naicsCodes?: string[]): string[] | null {
	return naicsCodes && naicsCodes.length > 0 ? naicsCodes : null;
}

/**
 * Build PSC codes filter
 */
export function buildPscFilter(pscCodes?: string[]): string[] | null {
	return pscCodes && pscCodes.length > 0 ? pscCodes : null;
}

/**
 * Build award amount range filter
 */
export function buildAmountFilter(minAmount?: number, maxAmount?: number): any[] | null {
	if (minAmount === undefined && maxAmount === undefined) {
		return null;
	}

	return [{
		lower_bound: minAmount,
		upper_bound: maxAmount,
	}];
}

/**
 * Build place of performance filter
 */
export function buildPlaceOfPerformanceFilter(state?: string): any[] | null {
	return state ? [{
		country: 'USA',
		state: state,
	}] : null;
}

/**
 * Build set-aside types filter
 */
export function buildSetAsideFilter(setAsideTypes?: string[]): string[] | null {
	return setAsideTypes && setAsideTypes.length > 0 ? setAsideTypes : null;
}

/**
 * Build extent competed filter
 */
export function buildCompetitionFilter(extentCompeted?: string[]): string[] | null {
	return extentCompeted && extentCompeted.length > 0 ? extentCompeted : null;
}

/**
 * Build contract pricing types filter
 */
export function buildContractPricingFilter(contractPricingTypes?: string[]): string[] | null {
	return contractPricingTypes && contractPricingTypes.length > 0 ? contractPricingTypes : null;
}

/**
 * Build keywords filter
 */
export function buildKeywordsFilter(keywords?: string[]): string[] | null {
	return keywords && keywords.length > 0 ? keywords : null;
}

/**
 * Main function to build complete filters object for USASpending API
 */
export function buildAwardFilters(params: FilterParams): any {
	const filters: any = {
		award_type_codes: params.awardTypeCodes || ['A', 'B', 'C', 'D'], // Default to contracts only
	};

	// Add filters conditionally (only if they have values)
	const keywords = buildKeywordsFilter(params.keywords);
	if (keywords) filters.keywords = keywords;

	const timePeriod = buildTimeFilter(params.activityStartDate, params.activityEndDate);
	if (timePeriod) filters.time_period = timePeriod;

	const recipient = buildRecipientFilter(params.recipientName);
	if (recipient) filters.recipient_search_text = recipient;

	const agency = buildAgencyFilter(params.agencyName);
	if (agency) filters.agencies = agency;

	const naics = buildNaicsFilter(params.naicsCodes);
	if (naics) filters.naics_codes = naics;

	const psc = buildPscFilter(params.pscCodes);
	if (psc) filters.psc_codes = psc;

	const amounts = buildAmountFilter(params.minAmount, params.maxAmount);
	if (amounts) filters.award_amounts = amounts;

	const place = buildPlaceOfPerformanceFilter(params.state);
	if (place) filters.place_of_performance_locations = place;

	const setAside = buildSetAsideFilter(params.setAsideTypes);
	if (setAside) filters.set_aside_type_codes = setAside;

	const competition = buildCompetitionFilter(params.extentCompeted);
	if (competition) filters.extent_competed_type_codes = competition;

	const pricing = buildContractPricingFilter(params.contractPricingTypes);
	if (pricing) filters.contract_pricing_type_codes = pricing;

	return filters;
}
