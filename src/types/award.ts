/**
 * TypeScript type definitions for USASpending.gov API
 * Based on: https://api.usaspending.gov/docs/endpoints
 */

/**
 * Award recipient/contractor information
 */
export interface AwardRecipient {
	recipient_hash?: string;
	recipient_name?: string;
	recipient_unique_id?: string; // DUNS
	recipient_uei?: string; // Unique Entity Identifier
	parent_recipient_name?: string;
	parent_recipient_unique_id?: string;
	parent_uei?: string;
	business_categories?: string[];
	location?: {
		address_line1?: string;
		address_line2?: string;
		city_name?: string;
		state_code?: string;
		zip?: string;
		country_code?: string;
		country_name?: string;
		congressional_code?: string;
	};
}

/**
 * Awarding agency information
 */
export interface AwardingAgency {
	id?: number;
	toptier_agency_id?: number;
	toptier_agency_code?: string;
	toptier_agency_name?: string;
	subtier_agency_code?: string;
	subtier_agency_name?: string;
	office_agency_name?: string;
}

/**
 * Place of performance
 */
export interface PlaceOfPerformance {
	location_country_code?: string;
	location_country_name?: string;
	state_code?: string;
	state_name?: string;
	city_name?: string;
	county_name?: string;
	zip?: string;
	congressional_code?: string;
}

/**
 * Individual award from USASpending
 */
export interface Award {
	id?: number;
	generated_unique_award_id?: string;
	display_award_id?: string;
	award_id?: string;
	category?: string;
	type?: string;
	type_description?: string;
	piid?: string;
	fain?: string;
	uri?: string;

	// Award details
	description?: string;
	total_obligation?: number;
	base_obligation?: number;
	base_exercised_options_val?: number;
	date_signed?: string;
	period_of_performance_start_date?: string;
	period_of_performance_current_end_date?: string;
	period_of_performance_potential_end_date?: string;

	// Recipient
	recipient?: AwardRecipient;
	recipient_name?: string;
	recipient_id?: string;
	recipient_uei?: string;
	recipient_duns?: string;
	parent_recipient_name?: string;

	// Agency
	awarding_agency?: AwardingAgency;
	funding_agency?: AwardingAgency;
	awarding_agency_name?: string;
	funding_agency_name?: string;

	// Location
	place_of_performance?: PlaceOfPerformance;
	recipient_location?: PlaceOfPerformance;

	// Classification
	naics_code?: string;
	naics_description?: string;
	product_or_service_code?: string;
	product_or_service_description?: string;

	// Contract specifics
	type_of_contract_pricing?: string;
	extent_competed?: string;
	type_set_aside?: string;
	number_of_offers_received?: number;

	// Modifications
	latest_transaction?: Transaction;
	total_subaward_amount?: number;
	total_loan_value?: number;

	// Additional data
	[key: string]: unknown;
}

/**
 * Transaction details
 */
export interface Transaction {
	id?: string;
	modification_number?: string;
	action_date?: string;
	action_type?: string;
	action_type_description?: string;
	federal_action_obligation?: number;
	description?: string;
}

/**
 * Search parameters for awards
 */
export interface AwardSearchParams {
	keywords?: string[];
	time_period?: Array<{
		start_date: string;
		end_date: string;
	}>;
	award_type_codes?: string[]; // A, B, C, D (contracts, grants, direct payments, loans)
	agencies?: Array<{
		type: 'awarding' | 'funding';
		tier: 'toptier' | 'subtier';
		name?: string;
		id?: number;
	}>;
	recipient_search_text?: string[];
	recipient_id?: string[];
	recipient_scope?: string;
	recipient_locations?: Array<{
		country?: string;
		state?: string;
		county?: string;
		city?: string;
		district?: string;
	}>;
	recipient_type_names?: string[];
	place_of_performance_scope?: string;
	place_of_performance_locations?: Array<{
		country?: string;
		state?: string;
		county?: string;
		city?: string;
		district?: string;
	}>;
	award_amounts?: Array<{
		lower_bound?: number;
		upper_bound?: number;
	}>;
	award_ids?: string[];
	naics_codes?: string[];
	psc_codes?: string[];
	contract_pricing_type_codes?: string[];
	set_aside_type_codes?: string[];
	extent_competed_type_codes?: string[];

	// Pagination
	limit?: number;
	page?: number;
	sort?: string;
	order?: 'asc' | 'desc';

	// Additional filters
	[key: string]: unknown;
}

/**
 * Response from awards search API
 */
export interface AwardsSearchResponse {
	results: Award[];
	page_metadata: {
		page: number;
		hasNext: boolean;
		hasPrevious: boolean;
		total: number;
		limit: number;
	};
}

/**
 * Response from specific award details
 */
export interface AwardDetailsResponse {
	id: number;
	generated_unique_award_id: string;
	category: string;
	type: string;
	type_description: string;
	description?: string;
	piid?: string;
	fain?: string;
	uri?: string;
	total_obligation: number;
	base_and_all_options_value?: number;
	date_signed?: string;
	period_of_performance?: {
		start_date?: string;
		end_date?: string;
		last_modified_date?: string;
	};
	recipient: AwardRecipient;
	awarding_agency: AwardingAgency;
	funding_agency?: AwardingAgency;
	place_of_performance: PlaceOfPerformance;
	latest_transaction?: Transaction;
	executive_details?: {
		officers?: Array<{
			name?: string;
			amount?: number;
		}>;
	};
	[key: string]: unknown;
}

/**
 * API Error response
 */
export interface ApiError {
	detail: string;
}
