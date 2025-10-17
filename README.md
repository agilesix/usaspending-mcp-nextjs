# USASpending MCP Server

A Model Context Protocol (MCP) server for researching federal contract awards and analyzing the competitive landscape using the [USASpending.gov API](https://api.usaspending.gov/). Built with Next.js and designed for AI agents to research government contracts, identify incumbents, and analyze market opportunities.

## Features

This MCP server provides 8 specialized tools for federal contracting research:

- **search_awards** - Search for federal contract awards with filters for agencies, NAICS/PSC codes, keywords, dates, and more
- **search_new_awards** - Find newly signed contracts by their award date (action date), excluding modifications
- **get_award_details** - Get comprehensive details about a specific award
- **search_recipients** - Search for contractors/recipients with autocomplete
- **get_recipient_details** - Get detailed information about a specific recipient
- **search_idv_awards** - Find task orders under Indefinite Delivery Vehicles (IDVs)
- **get_spending_over_time** - Analyze spending trends over time (by fiscal year, quarter, or month)
- **analyze_competition** - Analyze competitive landscape showing market shares and top recipients

## Architecture

The codebase is organized into a modular structure for maintainability:

```
src/
├── builders/
│   ├── filter-builder.ts    # Centralized filter building logic
│   └── field-mapper.ts       # Field name mappings and transformers
├── clients/
│   └── usaspending.ts        # API client with retry logic
├── tools/
│   ├── search-awards.ts
│   ├── search-new-awards.ts
│   ├── get-award-details.ts
│   ├── search-recipients.ts
│   ├── get-recipient-details.ts
│   ├── search-idv-awards.ts
│   ├── get-spending-over-time.ts
│   ├── analyze-competition.ts
│   └── index.ts              # Tool registration
└── types/
    ├── award.ts
    ├── recipient.ts
    └── tool-params.ts
```

### Key Design Features

- **Centralized Filter Builder**: Shared logic for building API filters across tools
- **Field Mapper**: Manages field name differences between API endpoints (verified against actual API)
- **Type Safety**: Comprehensive TypeScript types for API requests/responses
- **Modular Tools**: Each tool in its own file for easy maintenance
- **Error Handling**: Robust retry logic with exponential backoff for rate limiting

## Installation

```bash
npm install
```

## Configuration

The server requires no API keys - the USASpending.gov API is public. For production deployment on Vercel, you can optionally configure Redis for SSE transport:

```env
KV_REST_API_URL=your-redis-url
```

## Usage

### Development

```bash
npm run dev
```

The MCP server will be available at `http://localhost:3000/mcp`

### Building

```bash
npm run build
npm start
```

### Deployment on Vercel

Deploy with:

```bash
npx vercel --prod
```

The repository is configured with:
- 300 second timeout for complex queries
- 1024MB memory allocation
- SSE transport support (requires Redis)

See `vercel.json` for configuration details.

## Tool Reference

### search_awards

Search for federal contract awards with transaction activity during a date range.

**Important**: Date filtering searches for awards that had ANY transaction activity (modifications, obligations, payments) during the date range - this includes both new awards and existing awards with recent modifications. For finding only newly signed awards, use `search_new_awards` instead.

**Parameters:**
- `keywords` - Keywords to search in award descriptions
- `recipientName` - Contractor/recipient name
- `agencyName` - Awarding agency name (e.g., "Department of Veterans Affairs")
- `naicsCodes` - Array of NAICS codes (e.g., ["541511"] for Custom Computer Programming)
- `pscCodes` - Product Service Codes (e.g., ["D307"] for IT/Telecom)
- `activityStartDate` - Start date (YYYY-MM-DD) for transaction activity
- `activityEndDate` - End date (YYYY-MM-DD) for transaction activity
- `minAmount` / `maxAmount` - Award amount range
- `state` - State code for place of performance
- `awardTypeCodes` - Award type codes (default: ['A','B','C','D'] for contracts)
- `setAsideTypes` - Set aside types (e.g., 'SDVOSBC', '8A', 'WOSB')
- `extentCompeted` - Competition codes (e.g., 'A' for full and open)
- `contractPricingTypes` - Pricing types (e.g., 'FFPF', 'TM', 'CPFF')
- `limit` - Number of results (max 100, default 10)

### search_new_awards

Search for newly awarded contracts by their award date (Action Date). Returns only BASE awards (Modification Number = 0), not modifications to existing awards.

**Use this when you need to find contracts that were actually signed/awarded during a specific date range** (e.g., "awards signed yesterday", "new contracts this week").

**Parameters:**
- `awardStartDate` - Start date (YYYY-MM-DD) - earliest award signing date
- `awardEndDate` - End date (YYYY-MM-DD) - defaults to awardStartDate if not provided
- All other parameters same as `search_awards`

### get_award_details

Get comprehensive details about a specific award including description, recipient, transactions, sub-awards, and more.

**Parameters:**
- `awardId` - The `generated_unique_award_id` (internalId) from search results

**Note**: Use the `internalId` field from search results, NOT the human-readable Award ID (PIID).

### search_recipients

Search for contractors/recipients using autocomplete.

**Parameters:**
- `search` - Search query string
- `limit` - Number of results (default 10)

### get_recipient_details

Get detailed information about a specific recipient including total awards, transaction history, and more.

**Parameters:**
- `recipientHash` - The recipient hash ID from search results

### search_idv_awards

Find task orders and child awards under an Indefinite Delivery Vehicle (IDV). Useful for understanding who holds a contract vehicle and who is getting task orders.

**Parameters:**
- `awardId` - The `generated_unique_award_id` (internalId) of the parent IDV
- `limit` - Number of results (max 100, default 25)

**Background**: IDVs are contract vehicles like GWACs, GSA Schedules, and BPAs that spawn individual task orders.

### get_spending_over_time

Analyze spending trends over time for transaction activity. Returns time-series data grouped by fiscal year, quarter, or month.

**Parameters:**
- All filter parameters from `search_awards`
- `group` - How to group data: 'fiscal_year', 'quarter', or 'month' (default: 'fiscal_year')

**Note**: Analyzes transaction activity (when money was obligated), not original award dates.

### analyze_competition

Analyze the competitive landscape based on transaction activity. Shows who's winning awards/modifications, market shares, and spending patterns.

**Parameters:**
- `keywords`, `agencyName`, `naicsCodes`, `pscCodes` - Same as search_awards
- `activityStartDate` / `activityEndDate` - Date range (defaults to last year)
- `minAmount` - Minimum award size to analyze
- `limit` - Number of top recipients to show (default 20)

**Note**: Analyzes transaction activity, which includes both new awards and modifications to existing awards.

## Understanding Date Fields

The USASpending API has different date concepts that are important to understand:

- **Action Date** - When a transaction was executed (used by `search_new_awards`)
- **Activity Period** - The time period filter for `search_awards` (when any financial activity occurred)
- **Period of Performance** - Start/End dates when the contract work is performed (NOT award dates)

## API Client Features

The `USASpendingClient` includes:

- **Rate Limiting Protection**: Automatic throttling (100ms between requests)
- **Retry Logic**: Exponential backoff for 429 rate limit errors (up to 2 retries)
- **Error Handling**: Detailed logging and error messages
- **Timeouts**: 90 second timeout for complex queries
- **Request Delay**: Configurable delay between requests to avoid rate limits

## Verified Field Names

The transaction endpoint (`search_new_awards`) uses different field names than the award endpoint. All field names have been verified against the actual API:

**Transaction Fields:**
- "Award ID", "Recipient Name", "Action Date", "Transaction Amount"
- "Awarding Agency", "Awarding Sub Agency"
- "Transaction Description", "Mod" (modification number)
- "naics_code", "naics_description", "product_or_service_code", "product_or_service_description"

## Development

### Type Checking

```bash
npm run type-check
```

### Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint:fix
```

## Resources

- [USASpending API Documentation](https://api.usaspending.gov/docs/endpoints)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel MCP Adapter (mcp-handler)](https://www.npmjs.com/package/mcp-handler)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Notes

- The USASpending API can be slow for complex queries (90+ seconds for large result sets)
- No API key required - the API is public
- The server uses SSE transport when Redis is configured (required for Vercel)
- Fluid compute is recommended for efficient execution on Vercel

## License

This project is maintained by [Agile Six Applications](https://agile6.com/).
