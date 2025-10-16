/**
 * TypeScript type definitions for USASpending.gov Recipient API
 */

/**
 * Recipient overview information
 */
export interface Recipient {
	recipient_hash: string;
	recipient_level: string;
	recipient_name: string;
	recipient_unique_id?: string; // DUNS
	recipient_uei?: string;
	parent_recipient_hash?: string;
	parent_recipient_name?: string;
	parent_recipient_unique_id?: string;
	parent_uei?: string;
	business_types_codes?: string[];
	business_types_description?: string[];
}

/**
 * Recipient with financial totals
 */
export interface RecipientWithTotals extends Recipient {
	total_transaction_amount?: number;
	total_transactions?: number;
	total_contract_amount?: number;
	total_grant_amount?: number;
	total_loan_amount?: number;
	total_direct_payment_amount?: number;
	total_other_amount?: number;
}

/**
 * Recipient details response
 */
export interface RecipientDetailsResponse {
	recipient_hash: string;
	recipient_level: string;
	recipient_name: string;
	recipient_unique_id?: string;
	recipient_uei?: string;
	parent_recipient?: {
		parent_recipient_hash?: string;
		parent_recipient_name?: string;
		parent_recipient_unique_id?: string;
		parent_uei?: string;
	};
	location?: {
		address_line1?: string;
		address_line2?: string;
		city_name?: string;
		state_code?: string;
		state_name?: string;
		zip?: string;
		zip4?: string;
		country_code?: string;
		country_name?: string;
		congressional_code?: string;
	};
	business_types?: string[];
	total_transaction_amount?: number;
	total_transactions?: number;
}

/**
 * Recipient search/autocomplete result
 */
export interface RecipientSearchResult {
	recipient_hash: string;
	recipient_name: string;
	recipient_unique_id?: string;
	recipient_uei?: string;
	recipient_level: string;
}

/**
 * Recipient search parameters
 */
export interface RecipientSearchParams {
	search_text: string;
	limit?: number;
}

/**
 * Recipient awards search parameters
 */
export interface RecipientAwardsParams {
	recipient_hash: string;
	year?: string;
	award_type?: string;
	limit?: number;
	page?: number;
	sort?: string;
	order?: 'asc' | 'desc';
}

/**
 * Response from recipient search
 */
export interface RecipientSearchResponse {
	results: RecipientSearchResult[];
}

/**
 * Response from recipient list
 */
export interface RecipientListResponse {
	results: RecipientWithTotals[];
	page_metadata: {
		page: number;
		hasNext: boolean;
		total: number;
		limit: number;
	};
}
