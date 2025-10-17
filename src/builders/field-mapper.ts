/**
 * Field Mapper for USASpending API
 * Centralizes field name definitions and response transformations
 */

/**
 * Field names for spending_by_award endpoint
 */
export const AWARD_FIELDS = [
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
];

/**
 * Field names for spending_by_transaction endpoint
 * Note: This endpoint uses different field name formats than spending_by_award
 */
export const TRANSACTION_FIELDS = [
	"Award ID",
	"Recipient Name",
	"Action Date",
	"Transaction Amount",
	"awarding_toptier_agency_name",
	"awarding_subtier_agency_name",
	"Description",
	"Modification Number",
	"naics_code",
	"naics_description",
	"product_or_service_code",
	"product_or_service_code_description",
];

/**
 * Minimal field set for competition analysis
 */
export const COMPETITION_FIELDS = [
	"Award ID",
	"Recipient Name",
	"Award Amount",
	"Recipient UEI",
	"Contract Award Type",
];

/**
 * Transform award search result to standardized format
 */
export function transformAwardResult(award: any) {
	return {
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
		// Period of Performance dates - when the contract work is performed
		// NOTE: These are NOT the award date or transaction dates!
		performancePeriodStart: award["Start Date"],
		performancePeriodEnd: award["End Date"],
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
	};
}

/**
 * Transform transaction search result to standardized format
 */
export function transformTransactionResult(tx: any) {
	return {
		awardId: tx["Award ID"],
		internalId: tx.generated_internal_id,
		actionDate: tx["Action Date"],
		transactionAmount: tx["Transaction Amount"],
		modificationNumber: tx["Modification Number"],
		description: tx["Description"],
		recipientName: tx["Recipient Name"],
		awardingAgency: tx["awarding_toptier_agency_name"],
		awardingSubAgency: tx["awarding_subtier_agency_name"],
		naicsCode: tx["naics_code"],
		naicsDescription: tx["naics_description"],
		pscCode: tx["product_or_service_code"],
		pscDescription: tx["product_or_service_code_description"],
	};
}

/**
 * Transform recipient search result
 */
export function transformRecipientResult(recipient: any) {
	return {
		hash: recipient.recipient_hash,
		name: recipient.recipient_name,
		uei: recipient.recipient_uei,
		duns: recipient.recipient_unique_id,
		level: recipient.recipient_level,
	};
}

/**
 * Transform competition analysis result
 */
export function transformCompetitionRecipient(recipient: {
	name: string;
	uei: string;
	totalAmount: number;
	awardCount: number;
}, totalMarketSize: number) {
	return {
		name: recipient.name,
		uei: recipient.uei,
		total_amount: recipient.totalAmount,
		award_count: recipient.awardCount,
		market_share_pct: ((recipient.totalAmount / totalMarketSize) * 100).toFixed(2),
		avg_award_size: (recipient.totalAmount / recipient.awardCount).toFixed(2),
	};
}
