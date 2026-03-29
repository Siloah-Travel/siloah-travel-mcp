/**
 * Siloah Travel MCP Server
 *
 * Stateless MCP server on Cloudflare Workers (no Durable Objects).
 * Exposes cruise search tools for LLMs and AI agents.
 *
 * MCP endpoint: POST /mcp (Streamable HTTP transport)
 * REST endpoints: GET /api/voyages, /api/brands, /api/ships, /api/search
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { z } from "zod"
import VOYAGES_WIDGET_HTML from "../web/dist/voyages.html"
import SHIPS_WIDGET_HTML from "../web/dist/ships.html"

interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  OPENAI_API_KEY: string
}

// --- Supabase client ---

function getDb(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
}

// --- Tool implementations ---

async function searchVoyages(env: Env, params: {
  destination?: string
  departureCountryCode?: string
  departureCity?: string
  arrivalCountryCode?: string
  arrivalCity?: string
  viaCountryCode?: string
  viaCity?: string
  brandName?: string
  monthFrom?: string
  minNights?: number
  maxNights?: number
  maxPrice?: number
}) {
  const db = getDb(env)

  // Single RPC call — brand name resolution + slug retrieval all inside the RPC
  const rpcParams: Record<string, unknown> = { p_limit: 20, p_offset: 0, p_skip_count: true }
  if (params.brandName) rpcParams.p_brand_name = params.brandName
  if (params.destination) rpcParams.p_destinations = [params.destination]
  if (params.minNights) rpcParams.p_duration_min = params.minNights
  if (params.maxNights) rpcParams.p_duration_max = params.maxNights
  if (params.maxPrice) rpcParams.p_price_max = params.maxPrice
  if (params.monthFrom) rpcParams.p_month = params.monthFrom
  if (params.departureCountryCode) rpcParams.p_departure_iso = params.departureCountryCode
  if (params.departureCity) rpcParams.p_departure_port_name = params.departureCity
  if (params.arrivalCountryCode) rpcParams.p_arrival_iso = params.arrivalCountryCode
  if (params.arrivalCity) rpcParams.p_arrival_port_name = params.arrivalCity
  if (params.viaCountryCode) rpcParams.p_via_iso = params.viaCountryCode
  if (params.viaCity) rpcParams.p_via_port_name = params.viaCity

  const { data: voyages, error } = await db.rpc("search_voyages", rpcParams)
  if (error) return { error: error.message }
  if (!voyages || voyages.length === 0) return { total: 0, voyages: [] }

  const R2 = "https://media.siloah.travel"
  return {
    total: voyages[0]?.total_count ?? 0,
    voyages: voyages.map((v: Record<string, unknown>) => {
      const lineSlug = (v.line_nice_url as string) ?? ""
      const shipNiceUrl = (v.ship_nice_url as string) ?? ""
      const shipSlug = shipNiceUrl.includes("/") ? shipNiceUrl.split("/").pop() : shipNiceUrl
      const slug = `${lineSlug}-${shipSlug}-${v.sail_date}-${v.nights}n`
      return {
        name: v.name,
        shipName: shipNiceUrl ? String(shipSlug).replace(/-/g, " ") : "",
        sailDate: v.sail_date,
        nights: v.nights,
        departurePort: v.start_port_name,
        arrivalPort: v.end_port_name,
        price: v.cheapest_price,
        destinations: v.destinations,
        image: v.cover_image ? `${R2}/${v.cover_image}` : null,
        link: `https://siloah.travel/cruise/voyages/${slug}`,
      }
    }),
  }
}

async function searchBrands(env: Env, params: { name?: string; tier?: string }) {
  const db = getDb(env)
  let query = db.from("cruise_lines")
    .select("name, nice_url, description, tier, ship_count, cruise_count, currency, logo")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
  if (params.name) query = query.or(`name.ilike.%${params.name}%,nice_url.ilike.%${params.name.toLowerCase().replace(/\s+/g, "-")}%`)
  if (params.tier) query = query.eq("tier", params.tier)
  const { data, error } = await query.limit(10)
  if (error) return { error: error.message }
  return {
    brands: (data ?? []).map((b) => ({
      name: b.name,
      tier: b.tier,
      description: b.description?.slice(0, 200) ?? "",
      shipCount: b.ship_count,
      cruiseCount: b.cruise_count,
      logo: b.logo ? (b.logo.startsWith("http") ? b.logo : `https://media.siloah.travel/${b.logo}`) : null,
      link: `https://siloah.travel/cruise/${b.nice_url}`,
    })),
  }
}

async function searchShips(env: Env, params: {
  name?: string; brandName?: string; shipType?: string
  minPassengers?: number; maxPassengers?: number
}) {
  const db = getDb(env)
  let query = db.from("ships")
    .select("id, name, nice_url, line_name, tonnage, occupancy, total_cabins, launched, ship_type, star_rating, cruise_count")
    .eq("is_enabled", true)
    .order("name", { ascending: true })
  if (params.name) query = query.ilike("name", `%${params.name}%`)
  if (params.brandName) query = query.ilike("line_name", `%${params.brandName}%`)
  if (params.shipType) query = query.eq("ship_type", params.shipType)
  if (params.minPassengers) query = query.gte("occupancy", params.minPassengers)
  if (params.maxPassengers) query = query.lte("occupancy", params.maxPassengers)
  const { data, error } = await query.limit(10)
  if (error) return { error: error.message }

  // Fetch hero images for all ships in one query
  const R2 = "https://media.siloah.travel"
  const shipIds = (data ?? []).map((s) => s.id)
  let imageMap: Record<string, string> = {}
  if (shipIds.length > 0) {
    const { data: media } = await db.from("cruise_media")
      .select("entity_id, r2_key")
      .eq("entity_type", "ship")
      .eq("role", "hero")
      .in("entity_id", shipIds)
      .not("r2_key", "is", null)
    if (media) {
      for (const m of media) imageMap[m.entity_id] = `${R2}/${m.r2_key}`
    }
  }

  return {
    ships: (data ?? []).map((s) => ({
      name: s.name,
      brand: s.line_name,
      tonnage: s.tonnage,
      passengers: s.occupancy,
      cabins: s.total_cabins,
      launched: s.launched?.slice(0, 4) ?? null,
      type: s.ship_type,
      starRating: s.star_rating,
      cruiseCount: s.cruise_count,
      image: imageMap[s.id] ?? null,
      link: `https://siloah.travel/cruise/${s.nice_url}`,
    })),
  }
}

// --- searchByContent (RAG) ---

async function searchByContent(env: Env, params: { query: string; source?: string }) {
  const db = getDb(env)
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  // Generate embedding
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: params.query,
  })
  const queryEmbedding = embeddingRes.data[0].embedding

  // Search via RPC
  const { data, error } = await db.rpc("search_content", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: 20,
    filter_source: params.source || null,
  })

  if (error) return { error: error.message }

  return {
    results: (data ?? []).map((r: { content: string; metadata: Record<string, unknown>; similarity: number; source_table: string; field_name: string }) => ({
      content: r.content,
      source: r.source_table,
      field: r.field_name,
      name: r.metadata?.name ?? "",
      brand: r.metadata?.brand ?? "",
      similarity: Math.round(r.similarity * 100) / 100,
    })),
  }
}

// --- Widget URIs ---

const VOYAGES_WIDGET_URI = "ui://siloah/voyages.html"
const SHIPS_WIDGET_URI = "ui://siloah/ships.html"

// --- Create MCP server with tools ---

function createMcpServer(env: Env) {
  const server = new McpServer({
    name: "Siloah Travel",
    version: "1.0.0",
  })

  const readOnlyAnnotations = {
    readOnlyHint: true as const,
    destructiveHint: false as const,
    openWorldHint: false as const,
  }

  // --- Register UI resource for voyage cards ---
  registerAppResource(
    server,
    "Voyage Cards",
    VOYAGES_WIDGET_URI,
    { description: "Interactive voyage search results displayed as rich cards" },
    async () => ({
      contents: [{
        uri: VOYAGES_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: VOYAGES_WIDGET_HTML,
        _meta: {
          ui: {
            prefersBorder: true,
            csp: {
              resourceDomains: ["https://media.siloah.travel"],
            },
          },
        },
      }],
    })
  )

  // --- Register UI resource for ship cards ---
  registerAppResource(
    server,
    "Ship Cards",
    SHIPS_WIDGET_URI,
    { description: "Interactive ship search results displayed as rich cards" },
    async () => ({
      contents: [{
        uri: SHIPS_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: SHIPS_WIDGET_HTML,
        _meta: {
          ui: {
            prefersBorder: true,
            csp: {
              resourceDomains: ["https://media.siloah.travel"],
            },
          },
        },
      }],
    })
  )

  // --- searchVoyages (with widget UI) ---
  registerAppTool(
    server,
    "searchVoyages",
    {
      title: "Search Voyages",
      description: "Search cruise voyages by destination, date, brand, price, and ports. Returns up to 10 results with links to siloah.travel.",
      inputSchema: {
        destination: z.string().optional().describe("Region: Mediterranean, Caribbean, Alaska, Antarctica, Europe, Asia, Oceania, NorthAmerica, SouthAmerica, Africa, Transatlantic, Baltic, NorthernEurope"),
        departureCountryCode: z.string().optional().describe("Departure country ISO code, e.g. 'NZ', 'JP', 'TW'"),
        departureCity: z.string().optional().describe("Departure port city in English, e.g. 'Auckland', 'Miami'"),
        arrivalCountryCode: z.string().optional().describe("Arrival country ISO code, e.g. 'AU', 'IT'"),
        arrivalCity: z.string().optional().describe("Arrival port city in English, e.g. 'Sydney', 'Venice'"),
        viaCountryCode: z.string().optional().describe("Via country ISO code, e.g. 'JP', 'GR'"),
        viaCity: z.string().optional().describe("Via city/place in English, e.g. 'Santorini', 'Bali'"),
        brandName: z.string().optional().describe("Cruise line name, e.g. 'Silversea', 'MSC'"),
        monthFrom: z.string().optional().describe("Start month YYYY-MM, e.g. '2027-07'"),
        minNights: z.number().optional().describe("Minimum nights"),
        maxNights: z.number().optional().describe("Maximum nights"),
        maxPrice: z.number().optional().describe("Max price per person USD"),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: VOYAGES_WIDGET_URI },
        "openai/toolInvocation/invoking": "Searching luxury cruise voyages…",
        "openai/toolInvocation/invoked": "Voyages found.",
      },
    },
    async (params) => {
      const result = await searchVoyages(env, params)
      return {
        // structuredContent → sent to the widget for rendering
        structuredContent: result as Record<string, unknown>,
        // content → narration for the model (text summary)
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // --- searchBrands (text-only, no widget yet) ---
  registerAppTool(
    server,
    "searchBrands",
    {
      title: "Search Brands",
      description: "Search cruise brands/lines. Returns brand info with links to siloah.travel.",
      inputSchema: {
        name: z.string().optional().describe("Brand name, e.g. 'Silversea', 'Ponant'"),
        tier: z.string().optional().describe("Tier: 'ultra_luxury', 'luxury', 'popular'"),
      },
      annotations: readOnlyAnnotations,
      _meta: {},
    },
    async (params) => {
      const result = await searchBrands(env, params)
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  // --- searchShips (with widget UI) ---
  registerAppTool(
    server,
    "searchShips",
    {
      title: "Search Ships",
      description: "Search cruise ships by name, brand, type, or passenger capacity. Returns ship specs with links to siloah.travel.",
      inputSchema: {
        name: z.string().optional().describe("Ship name, e.g. 'Silver Nova'"),
        brandName: z.string().optional().describe("Cruise line, e.g. 'Silversea'"),
        shipType: z.string().optional().describe("Type: 'ocean', 'river', 'expedition'"),
        minPassengers: z.number().optional().describe("Min passenger capacity"),
        maxPassengers: z.number().optional().describe("Max passenger capacity"),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: SHIPS_WIDGET_URI },
        "openai/toolInvocation/invoking": "Searching cruise ships…",
        "openai/toolInvocation/invoked": "Ships found.",
      },
    },
    async (params) => {
      const result = await searchShips(env, params)
      return {
        structuredContent: result as Record<string, unknown>,
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // --- searchByContent (RAG, text-only) ---
  registerAppTool(
    server,
    "searchByContent",
    {
      title: "Search Knowledge Base",
      description: "Search Siloah Travel's knowledge base for detailed information about ship restaurants, dining, facilities, amenities, cabin types, port guides, or brand features. Use this when the question is about specific details, not for searching voyages.",
      inputSchema: {
        query: z.string().describe("The question or topic to search for, in English. E.g. 'Silver Nova restaurants', 'Silversea butler service', 'Santorini port guide'"),
        source: z.string().optional().describe("Filter by source: ships, ship_dining, ship_facilities, cabin_types, cruise_lines, cruises, canonical_ports. Leave empty to search all."),
      },
      annotations: readOnlyAnnotations,
      _meta: {},
    },
    async (params) => {
      const result = await searchByContent(env, params)
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] }
    }
  )

  return server
}

// --- OpenAPI spec for ChatGPT Actions ---

const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Siloah Travel — Luxury Cruise Search API",
    description: "Search 26,000+ luxury cruise voyages, 200+ ships, and 20 premium cruise brands worldwide. All results include links to siloah.travel for full details and booking.",
    version: "1.0.0",
  },
  servers: [{ url: "https://mcp.siloah.travel" }],
  paths: {
    "/api/voyages": {
      get: {
        operationId: "searchVoyages",
        summary: "Search cruise voyages by destination, date, brand, price, and ports",
        parameters: [
          { name: "destination", in: "query", schema: { type: "string" }, description: "Region: Mediterranean, Caribbean, Alaska, Antarctica, Europe, Asia, Oceania, NorthAmerica, SouthAmerica, Africa, Transatlantic, Baltic, NorthernEurope" },
          { name: "departureCountryCode", in: "query", schema: { type: "string" }, description: "Departure country ISO 3166-1 alpha-2 code, e.g. 'NZ', 'JP', 'TW'" },
          { name: "departureCity", in: "query", schema: { type: "string" }, description: "Departure port city in English, e.g. 'Auckland', 'Miami'" },
          { name: "arrivalCountryCode", in: "query", schema: { type: "string" }, description: "Arrival country ISO code" },
          { name: "arrivalCity", in: "query", schema: { type: "string" }, description: "Arrival port city in English" },
          { name: "viaCountryCode", in: "query", schema: { type: "string" }, description: "Via country ISO code" },
          { name: "viaCity", in: "query", schema: { type: "string" }, description: "Via city/place in English, e.g. 'Santorini', 'Bali'" },
          { name: "brandName", in: "query", schema: { type: "string" }, description: "Cruise line name, e.g. 'Silversea', 'MSC'" },
          { name: "monthFrom", in: "query", schema: { type: "string" }, description: "Start month YYYY-MM" },
          { name: "minNights", in: "query", schema: { type: "integer" }, description: "Minimum nights" },
          { name: "maxNights", in: "query", schema: { type: "integer" }, description: "Maximum nights" },
          { name: "maxPrice", in: "query", schema: { type: "number" }, description: "Max price per person USD" },
        ],
        responses: { "200": { description: "Voyage search results", content: { "application/json": { schema: { type: "object", properties: {
          total: { type: "integer", description: "Total matching voyages" },
          voyages: { type: "array", items: { type: "object", properties: {
            name: { type: "string" }, brandName: { type: "string" }, shipName: { type: "string" },
            sailDate: { type: "string" }, nights: { type: "integer" },
            departurePort: { type: "string" }, arrivalPort: { type: "string" },
            price: { type: "number", nullable: true }, destinations: { type: "array", items: { type: "string" } },
            image: { type: "string", nullable: true }, link: { type: "string" },
          } } },
        } } } } } },
      },
    },
    "/api/brands": {
      get: {
        operationId: "searchBrands",
        summary: "Search cruise line brands by name or tier",
        parameters: [
          { name: "name", in: "query", schema: { type: "string" }, description: "Brand name, e.g. 'Silversea'" },
          { name: "tier", in: "query", schema: { type: "string", enum: ["ultra_luxury", "luxury", "popular"] }, description: "Brand tier" },
        ],
        responses: { "200": { description: "Brand search results", content: { "application/json": { schema: { type: "object", properties: {
          brands: { type: "array", items: { type: "object", properties: {
            name: { type: "string" }, tier: { type: "string" }, description: { type: "string" },
            shipCount: { type: "integer" }, cruiseCount: { type: "integer" },
            logo: { type: "string", nullable: true }, link: { type: "string" },
          } } },
        } } } } } },
      },
    },
    "/api/ships": {
      get: {
        operationId: "searchShips",
        summary: "Search cruise ships by name, brand, type, or passenger capacity",
        parameters: [
          { name: "name", in: "query", schema: { type: "string" }, description: "Ship name, e.g. 'Silver Nova'" },
          { name: "brandName", in: "query", schema: { type: "string" }, description: "Cruise line name" },
          { name: "shipType", in: "query", schema: { type: "string", enum: ["ocean", "river", "expedition"] }, description: "Ship type" },
          { name: "minPassengers", in: "query", schema: { type: "integer" }, description: "Min passenger capacity" },
          { name: "maxPassengers", in: "query", schema: { type: "integer" }, description: "Max passenger capacity" },
        ],
        responses: { "200": { description: "Ship search results", content: { "application/json": { schema: { type: "object", properties: {
          ships: { type: "array", items: { type: "object", properties: {
            name: { type: "string" }, brand: { type: "string" }, tonnage: { type: "number", nullable: true },
            passengers: { type: "integer", nullable: true }, cabins: { type: "integer", nullable: true },
            launched: { type: "string", nullable: true }, type: { type: "string", nullable: true },
            starRating: { type: "number", nullable: true }, cruiseCount: { type: "integer" },
            image: { type: "string", nullable: true }, link: { type: "string" },
          } } },
        } } } } } },
      },
    },
    "/api/search": {
      get: {
        operationId: "searchByContent",
        summary: "Search knowledge base for ship restaurants, facilities, cabin details, port guides, and brand features",
        parameters: [
          { name: "query", in: "query", required: true, schema: { type: "string" }, description: "Question or topic in English, e.g. 'Silver Nova restaurants', 'Santorini port guide'" },
          { name: "source", in: "query", schema: { type: "string", enum: ["ships", "ship_dining", "ship_facilities", "cabin_types", "cruise_lines", "cruises", "canonical_ports"] }, description: "Filter by source. Leave empty to search all." },
        ],
        responses: { "200": { description: "Knowledge base search results", content: { "application/json": { schema: { type: "object", properties: {
          results: { type: "array", items: { type: "object", properties: {
            content: { type: "string" }, source: { type: "string" }, field: { type: "string" },
            name: { type: "string" }, brand: { type: "string" }, similarity: { type: "number" },
          } } },
        } } } } } },
      },
    },
  },
}

// --- CORS headers ---

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id",
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

// --- Worker entry point (no Durable Objects) ---

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS })
    }

    // Health check
    if (url.pathname === "/health") {
      return jsonResponse({
        name: "Siloah Travel MCP Server",
        version: "1.0.0",
        tools: ["searchVoyages", "searchBrands", "searchShips", "searchByContent"],
        docs: "https://siloah.travel/developers",
      })
    }

    // OpenAPI spec (for ChatGPT Actions)
    if (url.pathname === "/openapi.json" || url.pathname === "/.well-known/openapi.json") {
      return jsonResponse(OPENAPI_SPEC)
    }

    // REST API endpoints (for ChatGPT Actions)
    if (url.pathname === "/api/voyages" && request.method === "GET") {
      const p = url.searchParams
      return searchVoyages(env, {
        destination: p.get("destination") || undefined,
        departureCountryCode: p.get("departureCountryCode") || undefined,
        departureCity: p.get("departureCity") || undefined,
        arrivalCountryCode: p.get("arrivalCountryCode") || undefined,
        arrivalCity: p.get("arrivalCity") || undefined,
        viaCountryCode: p.get("viaCountryCode") || undefined,
        viaCity: p.get("viaCity") || undefined,
        brandName: p.get("brandName") || undefined,
        monthFrom: p.get("monthFrom") || undefined,
        minNights: p.get("minNights") ? parseInt(p.get("minNights")!) : undefined,
        maxNights: p.get("maxNights") ? parseInt(p.get("maxNights")!) : undefined,
        maxPrice: p.get("maxPrice") ? parseFloat(p.get("maxPrice")!) : undefined,
      }).then(jsonResponse)
    }

    if (url.pathname === "/api/brands" && request.method === "GET") {
      const p = url.searchParams
      return searchBrands(env, {
        name: p.get("name") || undefined,
        tier: p.get("tier") || undefined,
      }).then(jsonResponse)
    }

    if (url.pathname === "/api/ships" && request.method === "GET") {
      const p = url.searchParams
      return searchShips(env, {
        name: p.get("name") || undefined,
        brandName: p.get("brandName") || undefined,
        shipType: p.get("shipType") || undefined,
        minPassengers: p.get("minPassengers") ? parseInt(p.get("minPassengers")!) : undefined,
        maxPassengers: p.get("maxPassengers") ? parseInt(p.get("maxPassengers")!) : undefined,
      }).then(jsonResponse)
    }

    if (url.pathname === "/api/search" && request.method === "GET") {
      const p = url.searchParams
      const query = p.get("query")
      if (!query) return jsonResponse({ error: "query parameter is required" })
      return searchByContent(env, {
        query,
        source: p.get("source") || undefined,
      }).then(jsonResponse)
    }

    // MCP endpoint — stateless Streamable HTTP (no Durable Objects)
    if (url.pathname === "/" || url.pathname === "/mcp") {
      if (request.method === "GET") {
        return jsonResponse({
          name: "Siloah Travel MCP Server",
          version: "1.0.0",
          description: "Search 26,000+ luxury cruise voyages, 200+ ships, and 20 premium cruise brands worldwide.",
          mcpEndpoint: "POST /mcp",
        })
      }

      if (request.method === "POST") {
        const server = createMcpServer(env)
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless — no session tracking
          enableJsonResponse: true,      // simpler JSON responses (no SSE)
        })
        await server.connect(transport)
        const response = await transport.handleRequest(request)
        // Add CORS headers
        const headers = new Headers(response.headers)
        headers.set("Access-Control-Allow-Origin", "*")
        return new Response(response.body, {
          status: response.status,
          headers,
        })
      }

      // DELETE for session cleanup — just return 200 since we're stateless
      if (request.method === "DELETE") {
        return new Response(null, { status: 200, headers: CORS })
      }
    }

    return new Response("Not Found", { status: 404 })
  },
}
