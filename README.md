# Siloah Travel MCP Server

Search 70,000+ cruise voyages, 678 ships, and 62 cruise lines worldwide — directly from your AI assistant.

Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io), deployed on Cloudflare Workers.

## Quick Start

Add this URL to your MCP client (Claude Desktop, Cursor, etc.):

```
https://mcp.siloah.travel/mcp
```

No API key needed. No installation required.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "siloah-travel": {
      "url": "https://mcp.siloah.travel/mcp"
    }
  }
}
```

Then ask Claude things like:

- *"Find Mediterranean cruises in July 2027 under $3,000"*
- *"What ships does Silversea have?"*
- *"Tell me about dining options on Silver Nova"*
- *"Show me cruises departing from Tokyo"*

## Tools

### `searchVoyages`

Search cruise voyages by destination, date, brand, price, and ports.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `destination` | Region name | `Mediterranean`, `Caribbean`, `Alaska` |
| `departureCity` | Departure port city | `Miami`, `Tokyo`, `Southampton` |
| `arrivalCity` | Arrival port city | `Venice`, `Sydney` |
| `viaCity` | Port of call | `Santorini`, `Bali` |
| `departureCountryCode` | Departure country ISO | `US`, `JP`, `TW` |
| `arrivalCountryCode` | Arrival country ISO | `IT`, `AU` |
| `viaCountryCode` | Via country ISO | `GR`, `ID` |
| `brandName` | Cruise line name | `Silversea`, `MSC`, `Ponant` |
| `monthFrom` | Start month | `2027-07` |
| `minNights` / `maxNights` | Duration range | `7` / `14` |
| `maxPrice` | Max price per person (USD) | `5000` |

### `searchBrands`

Search cruise lines by name or tier.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `name` | Brand name | `Silversea`, `Viking` |
| `tier` | Brand tier | `ultra_luxury`, `luxury`, `popular` |

### `searchShips`

Search ships by name, brand, type, or passenger capacity.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `name` | Ship name | `Silver Nova` |
| `brandName` | Cruise line | `Silversea` |
| `shipType` | Ship type | `ocean`, `river`, `expedition` |
| `minPassengers` / `maxPassengers` | Capacity range | `100` / `500` |

### `searchByContent`

RAG-powered search across ship restaurants, facilities, cabin types, port guides, and brand features.

| Parameter | Description | Example |
|-----------|-------------|---------|
| `query` | Natural language question | `Silver Nova restaurants` |
| `source` | Filter by category | `ship_dining`, `ship_facilities`, `cabin_types`, `canonical_ports` |

## REST API

The same data is available via REST endpoints, compatible with ChatGPT Actions:

```
GET https://mcp.siloah.travel/api/voyages?destination=Mediterranean&maxPrice=3000
GET https://mcp.siloah.travel/api/brands?tier=luxury
GET https://mcp.siloah.travel/api/ships?brandName=Silversea
GET https://mcp.siloah.travel/api/search?query=Silver+Nova+restaurants
```

OpenAPI spec: [`https://mcp.siloah.travel/openapi.json`](https://mcp.siloah.travel/openapi.json)

## Data Coverage

| Category | Count |
|----------|-------|
| Voyages | 70,000+ |
| Ships | 678 |
| Cruise Lines | 62 (20 active) |
| Ports | 6,700+ |
| Cabin Types | 11,000+ |
| Languages | 30 |

Data is sourced from multiple providers and updated regularly.

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com)
- **Protocol**: [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) (Streamable HTTP transport)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)
- **RAG**: OpenAI embeddings + pgvector

## About

Built by [Siloah Travel](https://siloah.travel) — a white-label cruise booking platform for travel agencies worldwide.

## License

MIT
