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
import BRANDS_WIDGET_HTML from "../web/dist/brands.html"

interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  OPENAI_API_KEY: string
}

// --- Supabase client ---

function getDb(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
}

// --- Locale normalization ---
const LOCALE_ALIASES: Record<string, string> = {
  zh: "zh-TW", "zh-hans": "zh-CN", "zh-hant": "zh-TW",
}
function normalizeLocale(raw?: string): string | null {
  if (!raw || raw === "en") return null
  const lc = raw.toLowerCase()
  return LOCALE_ALIASES[lc] ?? raw
}

// --- Helpers ---
const CLASS_ORDER = ["Suite", "Balcony", "Outside", "Inside"]
function normalizeCls(cls: string): string {
  return cls.includes("Suite") || cls.includes("suite") ? "Suite"
    : cls.includes("Balcon") || cls.includes("balcon") ? "Balcony"
    : cls.includes("Outside") || cls.includes("outside") || cls.includes("Ocean") || cls.includes("ocean") ? "Outside"
    : "Inside"
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
  locale?: string
}) {
  const db = getDb(env)
  const locale = normalizeLocale(params.locale)

  // Use get_voyage_list v2 RPC (replaces search_voyages — same params, full translations)
  const rpcParams: Record<string, unknown> = { p_limit: 20, p_offset: 0, p_skip_count: true }
  if (locale) rpcParams.p_locale = locale
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

  const { data: voyages, error } = await db.rpc("get_voyage_list", rpcParams)
  if (error) return { error: error.message }
  if (!voyages || voyages.length === 0) return { total: 0, locale: locale ?? "en", voyages: [] }

  const R2 = "https://media.siloah.travel"
  const voyageIds = voyages.map((v: Record<string, unknown>) => v.id as string)

  // --- Round 1: get_voyage_detail v2 for all voyages in parallel ---
  const detailResults = await Promise.all(
    voyageIds.map((id) => db.rpc("get_voyage_detail", { p_cruise_id: id, p_locale: locale ?? "en" }))
  )
  const detailMap: Record<string, Record<string, unknown>> = {}
  for (let i = 0; i < voyageIds.length; i++) {
    if (detailResults[i].data) detailMap[voyageIds[i]] = detailResults[i].data as Record<string, unknown>
  }

  // Collect IDs for image queries (v2 detail has translations but may not include images)
  const shipIds = new Set<string>()
  const cabinIds = new Set<string>()
  const cpIds = new Set<string>()
  for (const d of Object.values(detailMap)) {
    const ship = d.ship as Record<string, unknown> | null
    if (ship?.id) shipIds.add(ship.id as string)
    for (const c of (d.cabins ?? []) as Array<Record<string, unknown>>) {
      if (c.id) cabinIds.add(c.id as string)
    }
    for (const it of (d.itinerary ?? []) as Array<Record<string, unknown>>) {
      if (it.cp_id) cpIds.add(it.cp_id as string)
    }
  }

  // --- Round 2: images only (translations handled by v2 RPC) ---
  const shipIdArr = [...shipIds], cabinIdArr = [...cabinIds], cpIdArr = [...cpIds]

  const shipPhotoPromise = shipIdArr.length > 0
    ? db.from("cruise_media").select("entity_id, r2_key")
        .eq("entity_type", "ship").in("role", ["cover", "default"])
        .in("entity_id", shipIdArr).not("r2_key", "is", null)
        .order("role").order("sort_order")
    : Promise.resolve({ data: null })

  const cabinImagePromise = cabinIdArr.length > 0
    ? db.from("cruise_media").select("entity_id, r2_key")
        .eq("entity_type", "cabin_type").in("role", ["default", "cover", "gallery"])
        .in("entity_id", cabinIdArr).not("r2_key", "is", null)
        .order("role").order("sort_order").limit(200)
    : Promise.resolve({ data: null })

  const portPhotoPromise = cpIdArr.length > 0
    ? db.from("cruise_media").select("entity_id, r2_key")
        .eq("entity_type", "canonical_port").in("entity_id", cpIdArr)
        .not("r2_key", "is", null).order("role").order("sort_order")
    : Promise.resolve({ data: null })

  const [shipPhotoResult, cabinImageResult, portPhotoResult] = await Promise.all([
    shipPhotoPromise, cabinImagePromise, portPhotoPromise,
  ])

  // Build image lookup maps
  const shipPhotoMap: Record<string, string> = {}
  if (shipPhotoResult.data) for (const m of shipPhotoResult.data) shipPhotoMap[m.entity_id] ??= `${R2}/${m.r2_key}`
  const cabinImageMap: Record<string, string> = {}
  if (cabinImageResult.data) for (const m of cabinImageResult.data) cabinImageMap[m.entity_id] ??= `${R2}/${(m.r2_key as string).replace("/lg/", "/sm/")}`
  const portPhotoMap: Record<string, string> = {}
  if (portPhotoResult.data) for (const m of portPhotoResult.data) portPhotoMap[m.entity_id] ??= `${R2}/${(m.r2_key as string).replace("/lg/", "/sm/")}`

  // --- Assemble response ---
  return {
    total: voyages[0]?.total_count ?? 0,
    locale: locale ?? "en",
    voyages: voyages.map((v: Record<string, unknown>) => {
      const cruiseId = v.id as string
      const detail = detailMap[cruiseId]
      const lineSlug = (v.line_nice_url as string) ?? ""
      const sailMonth = (v.sail_date as string).slice(0, 7)
      const base = `https://siloah.travel${locale ? `/${locale}` : ""}/cruise/voyages`
      const voyageLink = `${base}?line=${lineSlug}&month=${sailMonth}`

      // If detail RPC failed, return basic card data only
      if (!detail) {
        return {
          name: v.name,
          shipName: "", sailDate: v.sail_date, nights: v.nights,
          departurePort: v.start_port_name, arrivalPort: v.end_port_name,
          price: v.cheapest_price, destinations: v.destinations,
          image: v.cover_image ? `${R2}/${v.cover_image}` : null,
          shipImage: v.ship_image ? `${R2}/${v.ship_image}` : null,
          link: voyageLink,
          itinerary: [], brand: null, ship: null, cabins: [],
        }
      }

      const cruise = detail.cruise as Record<string, unknown>
      const ship = detail.ship as Record<string, unknown> | null
      const brand = detail.brand as Record<string, unknown> | null
      const sId = (ship?.id as string) ?? ""

      // Itinerary from v2 RPC (translations built-in)
      const rawItin = (detail.itinerary ?? []) as Array<Record<string, unknown>>
      const itinerary = rawItin.map((it) => {
        const cpId = it.cp_id as string | null
        const portName = (it.cp_name as string) || (it.port_name as string) || ""
        const nameLC = ((it.port_name as string) || "").toLowerCase()
        const isSeaDay = !portName || nameLC.includes("at sea") || nameLC.includes("sea day")
        const desc = (it.article_summary as string) ?? (it.cp_description as string) ?? null
        return {
          day: it.day as number,
          portName,
          arriveTime: it.arrive_time ? String(it.arrive_time).slice(0, 5) : null,
          departTime: it.depart_time ? String(it.depart_time).slice(0, 5) : null,
          image: cpId ? (portPhotoMap[cpId] ?? null) : null,
          description: desc,
          isSeaDay,
        }
      })

      // Cabins from v2 RPC (translations built-in) + prices
      const rpcCabins = (detail.cabins ?? []) as Array<Record<string, unknown>>
      const rpcPrices = (detail.prices ?? []) as Array<Record<string, unknown>>
      const priceByExtId: Record<string, number> = {}
      for (const p of rpcPrices) {
        const eid = p.cabin_type_id as string
        const price = p.price as number
        if (eid && price > 0 && (!priceByExtId[eid] || price < priceByExtId[eid])) {
          priceByExtId[eid] = price
        }
      }

      const cabins = rpcCabins.map((c) => {
        const cId = c.id as string
        const cls = (c.accommodation_class as string) || (c.cabin_type as string) || "Inside"
        const rawDesc = (c.description as string) ?? ""
        const plainDesc = rawDesc.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
        return {
          name: c.cabin_name as string,
          type: normalizeCls(cls),
          description: plainDesc.length > 300 ? plainDesc.slice(0, 300) + "…" : plainDesc || null,
          sizeMin: c.cabin_size_min as number | null,
          sizeMax: c.cabin_size_max as number | null,
          maxOccupancy: c.max_occupancy as number | null,
          accessible: c.accessible as boolean,
          facilities: ((c.facilities as string[]) ?? []).slice(0, 6),
          image: cabinImageMap[cId] ?? null,
          price: priceByExtId[c.external_id as string] ?? null,
        }
      }).sort((a, b) => CLASS_ORDER.indexOf(a.type) - CLASS_ORDER.indexOf(b.type))

      const brandLogo = brand?.logo
        ? ((brand.logo as string).startsWith("http") ? brand.logo as string : `${R2}/${brand.logo}`)
        : null

      return {
        name: cruise.name ?? v.name,
        shipName: (ship?.name as string) ?? "",
        sailDate: v.sail_date,
        nights: v.nights,
        departurePort: v.start_port_name,
        arrivalPort: v.end_port_name,
        price: v.cheapest_price,
        destinations: v.destinations,
        image: v.cover_image ? `${R2}/${v.cover_image}` : null,
        shipImage: v.ship_image ? `${R2}/${v.ship_image}` : (shipPhotoMap[sId] ? shipPhotoMap[sId].replace("/lg/", "/sm/") : null),
        link: voyageLink,
        itinerary,
        brand: brand ? {
          name: brand.name as string,
          logo: brandLogo,
        } : null,
        ship: ship ? {
          name: ship.name as string,
          tonnage: ship.tonnage as number | null,
          passengers: ship.occupancy as number | null,
          cabins: ship.total_cabins as number | null,
          launched: ship.launched ? String(ship.launched).slice(0, 4) : null,
          starRating: ship.star_rating as number | null,
          type: ship.ship_type as string | null,
          videoUrl: (ship.video_url as string) ?? null,
        } : null,
        cabins,
      }
    }),
  }
}

async function searchBrands(env: Env, params: { name?: string; tier?: string; locale?: string }) {
  const db = getDb(env)
  const locale = normalizeLocale(params.locale)
  const R2 = "https://media.siloah.travel"

  // Use get_brand_list RPC — returns all enabled brands with translations
  const { data: allBrands, error } = await db.rpc("get_brand_list", { p_locale: locale ?? "en" })
  if (error) return { error: error.message }

  // Client-side filtering (RPC returns all brands)
  let brands = (allBrands ?? []) as Array<Record<string, unknown>>
  if (params.tier) brands = brands.filter((b) => b.tier === params.tier)
  if (params.name) {
    const q = params.name.toLowerCase()
    brands = brands.filter((b) =>
      ((b.name as string) ?? "").toLowerCase().includes(q) ||
      ((b.name_en as string) ?? "").toLowerCase().includes(q) ||
      ((b.nice_url as string) ?? "").includes(q.replace(/\s+/g, "-"))
    )
  }
  brands = brands.slice(0, 10)

  const lineIds = brands.map((b) => b.id as string)

  // Fetch ships for these brands + ship images
  let shipsByLine: Record<string, Array<{ id: string; name: string; nice_url: string; ship_type: string | null; occupancy: number | null; star_rating: number | null }>> = {}
  let shipImageMap: Record<string, string> = {}

  if (lineIds.length > 0) {
    const { data: shipsData } = await db.from("ships")
      .select("id, name, nice_url, line_id, ship_type, occupancy, star_rating")
      .eq("is_enabled", true)
      .in("line_id", lineIds)
      .order("line_id").order("name", { ascending: true })
      .limit(500)

    if (shipsData) {
      const shipIds = shipsData.map((s: { id: string }) => s.id)
      for (const s of shipsData as Array<{ id: string; name: string; nice_url: string; line_id: string; ship_type: string | null; occupancy: number | null; star_rating: number | null }>) {
        ;(shipsByLine[s.line_id] ??= []).push(s)
      }

      if (shipIds.length > 0) {
        const { data: media } = await db.from("cruise_media")
          .select("entity_id, r2_key")
          .eq("entity_type", "ship")
          .in("role", ["cover", "default"])
          .in("entity_id", shipIds).not("r2_key", "is", null)
          .order("role", { ascending: true })
          .order("sort_order", { ascending: true })
        if (media) for (const m of media) shipImageMap[m.entity_id] ??= `${R2}/${m.r2_key}`
      }
    }
  }

  return {
    locale: locale ?? "en",
    brands: brands.map((b) => {
      const desc = (b.description as string) ?? (b.description_en as string) ?? ""
      return {
        name: b.name as string,
        tier: b.tier as string,
        description: desc.length > 300 ? desc.slice(0, 300) + "…" : desc,
        shipCount: b.ship_count as number,
        cruiseCount: b.cruise_count as number,
        logo: b.logo ? ((b.logo as string).startsWith("http") ? b.logo as string : `${R2}/${b.logo}`) : null,
        link: `https://siloah.travel${locale ? `/${locale}` : ""}/cruise/${b.nice_url}`,
        ships: (shipsByLine[b.id as string] ?? []).map((s) => ({
          name: s.name,
          type: s.ship_type,
          passengers: s.occupancy,
          starRating: s.star_rating,
          image: shipImageMap[s.id] ?? null,
          link: `https://siloah.travel${locale ? `/${locale}` : ""}/cruise/${s.nice_url}`,
        })),
      }
    }),
  }
}

async function searchShips(env: Env, params: {
  name?: string; brandName?: string; shipType?: string
  minPassengers?: number; maxPassengers?: number; locale?: string
}) {
  const db = getDb(env)
  const locale = normalizeLocale(params.locale)

  // Initial filtered search (no get_ship_list RPC yet)
  let query = db.from("ships")
    .select("id, name, nice_url, line_id, line_name, tonnage, occupancy, total_cabins, launched, ship_type, star_rating, cruise_count, cruise_lines!line_id!inner(is_enabled)")
    .eq("is_enabled", true)
    .eq("cruise_lines.is_enabled", true)
    .order("name", { ascending: true })
  if (params.name) query = query.ilike("name", `%${params.name}%`)
  if (params.brandName) query = query.ilike("line_name", `%${params.brandName}%`)
  if (params.shipType) query = query.eq("ship_type", params.shipType)
  if (params.minPassengers) query = query.gte("occupancy", params.minPassengers)
  if (params.maxPassengers) query = query.lte("occupancy", params.maxPassengers)
  const { data, error } = await query.limit(10)
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { locale: locale ?? "en", ships: [] }

  const R2 = "https://media.siloah.travel"

  // Fetch full detail for each ship via get_ship_detail RPC (replaces 9+ queries)
  const detailResults = await Promise.all(
    data.map((s) => db.rpc("get_ship_detail", { p_ship_id: s.id, p_locale: locale ?? "en" }))
  )
  const detailMap: Record<string, Record<string, unknown>> = {}
  for (let i = 0; i < data.length; i++) {
    if (detailResults[i].data) detailMap[data[i].id] = detailResults[i].data as Record<string, unknown>
  }

  return {
    locale: locale ?? "en",
    ships: data.map((s) => {
      const detail = detailMap[s.id]
      const ship = detail?.ship as Record<string, unknown> | undefined
      const brand = detail?.brand as Record<string, unknown> | undefined
      const cabins = (detail?.cabins ?? []) as Array<Record<string, unknown>>

      const brandLogo = brand?.logo
        ? ((brand.logo as string).startsWith("http") ? brand.logo as string : `${R2}/${brand.logo}`)
        : null
      const heroImage = ship?.hero_image
        ? `${R2}/${ship.hero_image}`
        : null
      const videoUrls = (ship?.video_urls ?? []) as string[]

      return {
        name: (ship?.name as string) ?? s.name,
        brand: (brand?.name as string) ?? s.line_name,
        brandLogo,
        tonnage: s.tonnage,
        passengers: s.occupancy,
        cabins: s.total_cabins,
        launched: s.launched?.slice(0, 4) ?? null,
        type: s.ship_type,
        starRating: s.star_rating,
        cruiseCount: s.cruise_count,
        image: heroImage,
        videoUrl: videoUrls[0] ?? null,
        link: `https://siloah.travel${locale ? `/${locale}` : ""}/cruise/${s.nice_url}`,
        cabinTypes: cabins.map((c) => {
          const cls = (c.accommodation_class as string) || (c.cabin_type as string) || "Inside"
          const rawDesc = (c.description as string) ?? ""
          const plainDesc = rawDesc.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
          const images = (c.images ?? []) as string[]
          const firstImage = images[0] ? `${R2}/${(images[0] as string).replace("/lg/", "/sm/")}` : null
          return {
            name: (c.cabin_name as string),
            type: normalizeCls(cls),
            description: plainDesc.length > 300 ? plainDesc.slice(0, 300) + "…" : plainDesc || null,
            sizeMin: c.cabin_size_min as number | null,
            sizeMax: c.cabin_size_max as number | null,
            maxOccupancy: c.max_occupancy as number | null,
            accessible: c.accessible as boolean,
            facilities: ((c.facilities as string[]) ?? []).slice(0, 6),
            image: firstImage,
          }
        }).sort((a, b) => CLASS_ORDER.indexOf(a.type) - CLASS_ORDER.indexOf(b.type)),
      }
    }),
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
const BRANDS_WIDGET_URI = "ui://siloah/brands.html"

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
            prefersBorder: false,
            csp: {
              resourceDomains: ["https://media.siloah.travel", "https://i.ytimg.com", "https://www.youtube.com"],
            },
          },
        },
      }],
    })
  )

  // --- Register UI resource for brand cards ---
  registerAppResource(
    server,
    "Brand Cards",
    BRANDS_WIDGET_URI,
    { description: "Interactive cruise line search results displayed as rich cards" },
    async () => ({
      contents: [{
        uri: BRANDS_WIDGET_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: BRANDS_WIDGET_HTML,
        _meta: {
          ui: {
            prefersBorder: false,
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
            prefersBorder: false,
            csp: {
              resourceDomains: ["https://media.siloah.travel", "https://i.ytimg.com", "https://www.youtube.com"],
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
      description: `Search cruise voyages with multilingual support (30 languages). To find voyages visiting a place, ALWAYS use viaCountryCode (ISO 3166-1 alpha-2) instead of viaCity — it is much faster. Map cities to their country: 'Bali' → 'ID', 'Santorini' → 'GR', 'Tokyo' → 'JP', 'Barcelona' → 'ES', 'Dubrovnik' → 'HR'. The 'destination' field is ONLY for broad ocean regions (Mediterranean, Caribbean, etc.). IMPORTANT: Always pass the 'locale' parameter matching the user's language. Each result includes a 'link' field — ALWAYS use these links verbatim when presenting results. NEVER construct or modify URLs yourself.`,
      inputSchema: {
        destination: z.string().optional().describe("Broad ocean region ONLY. One of: Mediterranean, Caribbean, Alaska, Antarctica, Europe, Asia, Oceania, NorthAmerica, SouthAmerica, Africa, Transatlantic, Baltic, NorthernEurope. Do NOT put country names here."),
        departureCountryCode: z.string().optional().describe("ISO 3166-1 alpha-2 code of departure country, e.g. 'US', 'GB', 'AU', 'JP'"),
        departureCity: z.string().optional().describe("Departure port city in English, e.g. 'Auckland', 'Miami', 'Southampton'"),
        arrivalCountryCode: z.string().optional().describe("ISO 3166-1 alpha-2 code of arrival country"),
        arrivalCity: z.string().optional().describe("Arrival port city in English, e.g. 'Sydney', 'Venice'"),
        viaCountryCode: z.string().optional().describe("ISO 3166-1 alpha-2 code of a country the voyage visits/passes through. PREFERRED over viaCity — always use this when the place maps to a country. Examples: 'Bali' → 'ID', 'Santorini' → 'GR', 'Tokyo' → 'JP', 'Dubrovnik' → 'HR', 'Barcelona' → 'ES', 'Alaska' → 'US'. Use viaCity ONLY for very specific small ports that need exact name matching."),
        viaCity: z.string().optional().describe("Exact port/city name in English. SLOW — prefer viaCountryCode instead. Only use this as a last resort for very specific small ports where country code alone is too broad."),
        brandName: z.string().optional().describe("Cruise line/brand name, e.g. 'Silversea', 'MSC', 'Ponant', 'Viking'"),
        monthFrom: z.string().optional().describe("Start month in YYYY-MM format, e.g. '2027-07'. Use this when user says 'in July 2027' or 'next summer'."),
        minNights: z.number().optional().describe("Minimum number of nights"),
        maxNights: z.number().optional().describe("Maximum number of nights"),
        maxPrice: z.number().optional().describe("Maximum price per person in USD"),
        locale: z.string().optional().describe("Language code for localized results. ALWAYS pass this based on the user's language. Supported: en, zh-TW, zh-CN, ja, ko, ar, tr, he, fa, th, vi, ms, id, hi, ta, de, fr, es, it, pt, nl, no, ru, bn, ur, fil, sw, pl, uk, mn. Examples: Chinese user → 'zh-TW', Japanese → 'ja', French → 'fr', Korean → 'ko'."),
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

  // --- searchBrands (with widget UI) ---
  registerAppTool(
    server,
    "searchBrands",
    {
      title: "Search Brands",
      description: "Search cruise brands/lines with multilingual support (30 languages). Returns brand info, fleet details, and links to siloah.travel. IMPORTANT: Always pass the 'locale' parameter matching the user's language. Each result includes a 'link' field — ALWAYS use these links verbatim. NEVER construct or modify URLs yourself.",
      inputSchema: {
        name: z.string().optional().describe("Brand name, e.g. 'Silversea', 'Ponant'"),
        tier: z.string().optional().describe("Tier: 'ultra_luxury', 'luxury', 'popular'"),
        locale: z.string().optional().describe("Language code for localized results. ALWAYS pass this based on the user's language. Supported: en, zh-TW, zh-CN, ja, ko, ar, tr, he, fa, th, vi, ms, id, hi, ta, de, fr, es, it, pt, nl, no, ru, bn, ur, fil, sw, pl, uk, mn."),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: BRANDS_WIDGET_URI },
        "openai/toolInvocation/invoking": "Searching cruise lines...",
        "openai/toolInvocation/invoked": "Cruise lines found.",
      },
    },
    async (params) => {
      const result = await searchBrands(env, params)
      return {
        structuredContent: result as Record<string, unknown>,
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // --- searchShips (with widget UI) ---
  registerAppTool(
    server,
    "searchShips",
    {
      title: "Search Ships",
      description: "Search cruise ships by name, brand, type, or passenger capacity with multilingual support (30 languages). IMPORTANT: Always pass the 'locale' parameter matching the user's language. Each result includes a 'link' field — ALWAYS use these links verbatim. NEVER construct or modify URLs yourself.",
      inputSchema: {
        name: z.string().optional().describe("Ship name, e.g. 'Silver Nova'"),
        brandName: z.string().optional().describe("Cruise line, e.g. 'Silversea'"),
        shipType: z.string().optional().describe("Type: 'ocean', 'river', 'expedition'"),
        minPassengers: z.number().optional().describe("Min passenger capacity"),
        maxPassengers: z.number().optional().describe("Max passenger capacity"),
        locale: z.string().optional().describe("Language code for localized results. ALWAYS pass this based on the user's language. Supported: en, zh-TW, zh-CN, ja, ko, ar, tr, he, fa, th, vi, ms, id, hi, ta, de, fr, es, it, pt, nl, no, ru, bn, ur, fil, sw, pl, uk, mn."),
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
    description: "Search 26,000+ luxury cruise voyages, 200+ ships, and 20 premium cruise brands worldwide. All results include a 'link' field with a direct URL to siloah.travel. IMPORTANT: Always present these links verbatim to the user — never construct, modify, or guess URLs yourself.",
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
          { name: "viaCity", in: "query", schema: { type: "string" }, description: "Via city/place in English. Slow — prefer viaCountryCode instead" },
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
            image: { type: "string", nullable: true }, link: { type: "string", description: "Direct URL to this voyage on siloah.travel. ALWAYS use verbatim — never construct your own URLs." },
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
            logo: { type: "string", nullable: true }, link: { type: "string", description: "Direct URL to this brand on siloah.travel. ALWAYS use verbatim — never construct your own URLs." },
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
            image: { type: "string", nullable: true }, link: { type: "string", description: "Direct URL to this ship on siloah.travel. ALWAYS use verbatim — never construct your own URLs." },
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
        locale: p.get("locale") || undefined,
      }).then(jsonResponse)
    }

    if (url.pathname === "/api/brands" && request.method === "GET") {
      const p = url.searchParams
      return searchBrands(env, {
        name: p.get("name") || undefined,
        tier: p.get("tier") || undefined,
        locale: p.get("locale") || undefined,
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
        locale: p.get("locale") || undefined,
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
