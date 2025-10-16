/**
 * Date utilities for parsing natural language date queries
 * Supports flexible date input for the USASpending MCP server
 */

export interface DateRange {
	start_date: string;
	end_date: string;
}

/**
 * Parse natural language date strings into YYYY-MM-DD format
 * Examples: "yesterday", "last week", "last 30 days", "last month", "last quarter", "last year"
 *
 * @param dateStr - Natural language date string or ISO date
 * @returns ISO date string in YYYY-MM-DD format
 */
export function parseNaturalDate(dateStr: string): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// If already in YYYY-MM-DD format, return as-is
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return dateStr;
	}

	const lower = dateStr.toLowerCase().trim();

	// Handle "today"
	if (lower === 'today') {
		return formatDate(today);
	}

	// Handle "yesterday"
	if (lower === 'yesterday') {
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		return formatDate(yesterday);
	}

	// Handle "N days ago"
	const daysAgoMatch = lower.match(/^(\d+)\s+days?\s+ago$/);
	if (daysAgoMatch) {
		const days = parseInt(daysAgoMatch[1], 10);
		const date = new Date(today);
		date.setDate(date.getDate() - days);
		return formatDate(date);
	}

	// Handle "last N days"
	const lastDaysMatch = lower.match(/^last\s+(\d+)\s+days?$/);
	if (lastDaysMatch) {
		const days = parseInt(lastDaysMatch[1], 10);
		const date = new Date(today);
		date.setDate(date.getDate() - days);
		return formatDate(date);
	}

	// Handle "last week"
	if (lower === 'last week') {
		const date = new Date(today);
		date.setDate(date.getDate() - 7);
		return formatDate(date);
	}

	// Handle "last month"
	if (lower === 'last month') {
		const date = new Date(today);
		date.setMonth(date.getMonth() - 1);
		return formatDate(date);
	}

	// Handle "last N months"
	const lastMonthsMatch = lower.match(/^last\s+(\d+)\s+months?$/);
	if (lastMonthsMatch) {
		const months = parseInt(lastMonthsMatch[1], 10);
		const date = new Date(today);
		date.setMonth(date.getMonth() - months);
		return formatDate(date);
	}

	// Handle "last quarter"
	if (lower === 'last quarter') {
		const date = new Date(today);
		date.setMonth(date.getMonth() - 3);
		return formatDate(date);
	}

	// Handle "last year"
	if (lower === 'last year') {
		const date = new Date(today);
		date.setFullYear(date.getFullYear() - 1);
		return formatDate(date);
	}

	// Handle "N years ago"
	const yearsAgoMatch = lower.match(/^(\d+)\s+years?\s+ago$/);
	if (yearsAgoMatch) {
		const years = parseInt(yearsAgoMatch[1], 10);
		const date = new Date(today);
		date.setFullYear(date.getFullYear() - years);
		return formatDate(date);
	}

	// If we can't parse it, try to create a Date object
	const parsedDate = new Date(dateStr);
	if (!isNaN(parsedDate.getTime())) {
		return formatDate(parsedDate);
	}

	// If all else fails, return today
	console.warn(`Could not parse date string "${dateStr}", defaulting to today`);
	return formatDate(today);
}

/**
 * Parse a date range string into start and end dates
 * Examples:
 * - "yesterday" -> yesterday to yesterday
 * - "last week" -> 7 days ago to today
 * - "last 30 days" -> 30 days ago to today
 * - "last month" -> 1 month ago to today
 *
 * @param rangeStr - Natural language date range string
 * @returns DateRange object with start_date and end_date
 */
export function parseDateRange(rangeStr: string): DateRange {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const lower = rangeStr.toLowerCase().trim();

	// For "yesterday", both start and end are yesterday
	if (lower === 'yesterday') {
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		return {
			start_date: formatDate(yesterday),
			end_date: formatDate(yesterday),
		};
	}

	// For "today", both start and end are today
	if (lower === 'today') {
		return {
			start_date: formatDate(today),
			end_date: formatDate(today),
		};
	}

	// For ranges like "last 30 days", start is 30 days ago, end is today
	const lastDaysMatch = lower.match(/^last\s+(\d+)\s+days?$/);
	if (lastDaysMatch) {
		const days = parseInt(lastDaysMatch[1], 10);
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - days);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// For "last week", start is 7 days ago, end is today
	if (lower === 'last week') {
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 7);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// For "last month", start is 1 month ago, end is today
	if (lower === 'last month') {
		const startDate = new Date(today);
		startDate.setMonth(startDate.getMonth() - 1);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// For "last N months"
	const lastMonthsMatch = lower.match(/^last\s+(\d+)\s+months?$/);
	if (lastMonthsMatch) {
		const months = parseInt(lastMonthsMatch[1], 10);
		const startDate = new Date(today);
		startDate.setMonth(startDate.getMonth() - months);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// For "last quarter", start is 3 months ago, end is today
	if (lower === 'last quarter') {
		const startDate = new Date(today);
		startDate.setMonth(startDate.getMonth() - 3);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// For "last year", start is 1 year ago, end is today
	if (lower === 'last year') {
		const startDate = new Date(today);
		startDate.setFullYear(startDate.getFullYear() - 1);
		return {
			start_date: formatDate(startDate),
			end_date: formatDate(today),
		};
	}

	// Default: if we can't parse it, use the last 30 days
	console.warn(`Could not parse date range "${rangeStr}", defaulting to last 30 days`);
	const startDate = new Date(today);
	startDate.setDate(startDate.getDate() - 30);
	return {
		start_date: formatDate(startDate),
		end_date: formatDate(today),
	};
}

/**
 * Format a Date object as YYYY-MM-DD
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Get a date range for a specific fiscal year
 * Federal fiscal year runs from Oct 1 to Sep 30
 */
export function getFiscalYearRange(fiscalYear: number): DateRange {
	return {
		start_date: `${fiscalYear - 1}-10-01`,
		end_date: `${fiscalYear}-09-30`,
	};
}

/**
 * Get the current fiscal year
 * If we're in Oct-Dec, it's the next calendar year's fiscal year
 */
export function getCurrentFiscalYear(): number {
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth(); // 0-indexed

	// If we're in Oct, Nov, or Dec (months 9, 10, 11), it's the next fiscal year
	return month >= 9 ? year + 1 : year;
}
