/**
 * USASpending.gov API Client
 *
 * API Documentation: https://api.usaspending.gov/docs/endpoints
 * Base endpoint: https://api.usaspending.gov/api/v2
 */

import type {
	Award,
	AwardSearchParams,
	AwardsSearchResponse,
	AwardDetailsResponse,
	ApiError,
} from '../types/award';
import type {
	RecipientSearchParams,
	RecipientSearchResponse,
	RecipientDetailsResponse,
	RecipientAwardsParams,
} from '../types/recipient';


/**
 * USASpending API Client configuration
 */
export interface USASpendingClientConfig {
	baseUrl?: string;
	timeout?: number; // milliseconds
	maxRetries?: number;
	retryDelay?: number;
	requestDelay?: number;
}

/**
 * USASpending API Client
 */
export class USASpendingClient {
	private baseUrl: string;
	private timeout: number;
	private maxRetries: number;
	private retryDelay: number;
	private requestDelay: number;
	private lastRequestTime: number = 0;

	constructor(config: USASpendingClientConfig = {}) {
		this.baseUrl = config.baseUrl || 'https://api.usaspending.gov/api/v2';
		this.timeout = config.timeout || 90000; // 90 second default (API can be slow for complex queries)
		this.maxRetries = config.maxRetries ?? 2; // Reduce retries to 2 to avoid compounding timeouts
		this.retryDelay = config.retryDelay || 1000; // Default 1 second base delay
		this.requestDelay = config.requestDelay || 100; // Reduce to 100ms between requests
	}

	/**
	 * Sleep for a specified number of milliseconds
	 */
	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Throttle requests to avoid hitting rate limits
	 */
	private async throttleRequest(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < this.requestDelay) {
			await this.sleep(this.requestDelay - timeSinceLastRequest);
		}

		this.lastRequestTime = Date.now();
	}


	/**
	 * Fetch with retry logic for rate limiting
	 */
	private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				// Throttle requests
				await this.throttleRequest();

				console.log(`[USASpending] Attempting fetch to ${url} (attempt ${attempt + 1}/${this.maxRetries + 1})`);
				console.log(`[USASpending] Request options:`, JSON.stringify({
					method: options.method,
					headers: options.headers,
					hasBody: !!options.body,
					bodyLength: options.body ? String(options.body).length : 0
				}));

				const response = await fetch(url, options);

				console.log(`[USASpending] Response status: ${response.status} ${response.statusText}`);
				console.log(`[USASpending] Response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));

				// If we get a 429 (rate limit) error, retry with exponential backoff
				if (response.status === 429) {
					if (attempt < this.maxRetries) {
						const delay = this.retryDelay * Math.pow(2, attempt);
						console.log(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})...`);
						await this.sleep(delay);
						continue;
					}

					throw new Error(`USASpending API rate limit exceeded after ${this.maxRetries} retries. Please try again later.`);
				}

				// Return successful or non-429 error responses
				return response;
			} catch (error) {
				lastError = error as Error;

				// Log detailed error information
				console.error(`[USASpending] Fetch error on attempt ${attempt + 1}:`, {
					name: error instanceof Error ? error.name : 'Unknown',
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					url,
					attempt: attempt + 1,
					maxRetries: this.maxRetries
				});

				// Don't retry on network errors or timeouts
				if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
					console.error(`[USASpending] Abort/timeout error, not retrying`);
					throw error;
				}

				// Retry on other errors
				if (attempt < this.maxRetries) {
					const delay = this.retryDelay * Math.pow(2, attempt);
					console.log(`Request failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})...`);
					await this.sleep(delay);
					continue;
				}
			}
		}

		throw lastError || new Error('Request failed after all retry attempts');
	}

	/**
	 * Search for awards with the given parameters
	 */
	async searchAwards(params: Partial<AwardSearchParams>): Promise<AwardsSearchResponse> {
		const url = `${this.baseUrl}/search/spending_by_award/`;

		try {
			// NOTE: Removed AbortController to avoid potential SSL handshake interference
			// Cloudflare Workers have built-in timeouts that will handle this
			const response = await this.fetchWithRetry(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				console.error(`[USASpending] searchAwards API returned error status ${response.status}:`, {
					status: response.status,
					statusText: response.statusText,
					errorText: errorText.substring(0, 500),
					errorData: errorData,
					url: url,
					requestBody: JSON.stringify(params).substring(0, 500)
				});

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json() as AwardsSearchResponse;
			console.log(`[USASpending] searchAwards successful, got ${data.results?.length || 0} results`);
			return data;
		} catch (error) {
			console.error('[USASpending] searchAwards caught error:', error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Unknown error occurred while fetching awards');
		}
	}

	/**
	 * Get detailed information about a specific award
	 */
	async getAwardDetails(awardId: string): Promise<AwardDetailsResponse | null> {
		const url = `${this.baseUrl}/awards/${awardId}/`;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await this.fetchWithRetry(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json();
			return data as AwardDetailsResponse;
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('USASpending API request timed out');
				}
				throw error;
			}
			throw new Error('Unknown error occurred while fetching award details');
		}
	}

	/**
	 * Search for recipients (autocomplete)
	 */
	async searchRecipients(params: RecipientSearchParams): Promise<RecipientSearchResponse> {
		const url = `${this.baseUrl}/autocomplete/recipient/`;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await this.fetchWithRetry(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json();
			return data as RecipientSearchResponse;
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('USASpending API request timed out');
				}
				throw error;
			}
			throw new Error('Unknown error occurred while searching recipients');
		}
	}

	/**
	 * Get detailed information about a specific recipient
	 */
	async getRecipientDetails(recipientHash: string): Promise<RecipientDetailsResponse | null> {
		const url = `${this.baseUrl}/recipient/${recipientHash}/`;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await this.fetchWithRetry(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json();
			return data as RecipientDetailsResponse;
		} catch (error) {
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('USASpending API request timed out');
				}
				throw error;
			}
			throw new Error('Unknown error occurred while fetching recipient details');
		}
	}

	/**
	 * Search for transactions by action date
	 * Endpoint: /api/v2/search/spending_by_transaction/
	 */
	async searchTransactions(params: Partial<AwardSearchParams>): Promise<AwardsSearchResponse> {
		const url = `${this.baseUrl}/search/spending_by_transaction/`;

		try {
			const response = await this.fetchWithRetry(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				console.error(`[USASpending] searchTransactions API returned error status ${response.status}:`, {
					status: response.status,
					statusText: response.statusText,
					errorText: errorText.substring(0, 500),
					errorData: errorData,
					url: url,
					requestBody: JSON.stringify(params).substring(0, 500)
				});

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json() as AwardsSearchResponse;
			console.log(`[USASpending] searchTransactions successful, got ${data.results?.length || 0} results`);
			return data;
		} catch (error) {
			console.error('[USASpending] searchTransactions caught error:', error);
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Unknown error occurred while fetching transactions');
		}
	}

	/**
	 * Get awards over time for trend analysis
	 * Endpoint: /api/v2/search/spending_over_time/
	 */
	async getSpendingOverTime(params: any): Promise<any> {
		const url = `${this.baseUrl}/search/spending_over_time/`;

		try {
			const response = await this.fetchWithRetry(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Unknown error occurred while fetching spending over time');
		}
	}

	/**
	 * Get IDV activity (child awards and task orders)
	 * Endpoint: /api/v2/idvs/activity/
	 */
	async getIdvActivity(params: any): Promise<any> {
		const url = `${this.baseUrl}/idvs/activity/`;

		try {
			const response = await this.fetchWithRetry(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorData: ApiError;

				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = {
						detail: errorText || response.statusText,
					};
				}

				throw new Error(
					`USASpending API error (${response.status}): ${errorData.detail}`
				);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Unknown error occurred while fetching IDV activity');
		}
	}
}

/**
 * Helper function to create a USASpendingClient instance
 */
export function createUSASpendingClient(config: USASpendingClientConfig = {}): USASpendingClient {
	return new USASpendingClient(config);
}
