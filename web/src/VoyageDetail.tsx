import { Ship as ShipIcon, Calendar, Moon, MapPin, Anchor, ExternalLink, Navigation, Clock, Waves, Users, Layers, Star, Play } from "lucide-react"
import { t, translateDest } from "./i18n"
import type { Voyage, ItineraryStop } from "./voyages"

export function VoyageDetail({ voyage: v }: { voyage: Voyage }) {
  const price = v.price ? `$${Number(v.price).toLocaleString()}` : null
  const hasItinerary = v.itinerary && v.itinerary.length > 0

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Hero image */}
      <div style={styles.hero}>
        {v.image ? (
          <img src={v.image} alt={v.name} style={styles.heroImg} />
        ) : (
          <div style={styles.heroPlaceholder}>
            <Anchor size={64} color="rgba(255,255,255,0.15)" />
          </div>
        )}
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          {price && (
            <div style={styles.heroPriceBadge}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginRight: 4 }}>{t("from_price").toUpperCase()}</span>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{price}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>{t("per_person")}</span>
            </div>
          )}
          <h1 style={styles.heroTitle}>{v.name}</h1>
          {v.shipName && (
            <div style={styles.heroShip}>
              <ShipIcon size={14} /> {v.shipName}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div style={styles.statsBar}>
        <Stat icon={<Calendar size={16} />} label={t("departure")} value={v.sailDate} />
        <StatDivider />
        <Stat icon={<Moon size={16} />} label={t("duration")} value={t("nights", { n: v.nights })} />
        <StatDivider />
        <Stat icon={<MapPin size={16} />} label={t("from_port")} value={v.departurePort || "—"} />
        <StatDivider />
        <Stat icon={<Navigation size={16} />} label={t("to_port")} value={v.arrivalPort || v.departurePort || "—"} />
      </div>

      {/* Destinations pills (translated) */}
      {v.destinations?.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("destinations")}</h2>
          <div style={styles.destGrid}>
            {v.destinations.map((d, i) => (
              <div key={i} style={styles.destTag}>
                <MapPin size={12} color="#d4aa4f" />
                {translateDest(d)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ship & Brand info */}
      {(v.brand || v.ship) && (
        <div style={styles.section}>
          {/* YouTube video (LiteYouTube facade) */}
          {v.ship?.videoUrl && <LiteYouTube url={v.ship.videoUrl} />}
          <div style={styles.shipBrandCard}>
            {/* Ship image */}
            {v.shipImage && (
              <div style={styles.shipImageWrap}>
                <img src={v.shipImage} alt={v.ship?.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <div style={styles.shipBrandBody}>
              {/* Brand row */}
              {v.brand && (
                <div style={styles.brandRow}>
                  {v.brand.logo && (
                    <img src={v.brand.logo} alt="" style={{ height: 24, width: "auto", objectFit: "contain" }} />
                  )}
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{v.brand.name}</span>
                </div>
              )}
              {/* Ship name + stars */}
              {v.ship && (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0c1b3a", marginBottom: 4 }}>{v.ship.name}</div>
                  {v.ship.starRating && v.ship.starRating > 0 && (
                    <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
                      {Array.from({ length: Math.round(v.ship.starRating) }).map((_, i) => (
                        <Star key={i} size={14} fill="#d4aa4f" color="#d4aa4f" />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Specs row */}
              {v.ship && (
                <div style={styles.specsRow}>
                  {v.ship.passengers && (
                    <div style={styles.specItem}>
                      <Users size={13} color="#d4aa4f" />
                      <span>{v.ship.passengers.toLocaleString()} {t("guests", { n: "" }).trim()}</span>
                    </div>
                  )}
                  {v.ship.cabins && (
                    <div style={styles.specItem}>
                      <Layers size={13} color="#d4aa4f" />
                      <span>{v.ship.cabins.toLocaleString()} {t("cabins", { n: "" }).trim()}</span>
                    </div>
                  )}
                  {v.ship.tonnage && (
                    <div style={styles.specItem}>
                      <Anchor size={13} color="#d4aa4f" />
                      <span>{v.ship.tonnage.toLocaleString()} GT</span>
                    </div>
                  )}
                  {v.ship.launched && (
                    <div style={styles.specItem}>
                      <Calendar size={13} color="#d4aa4f" />
                      <span>{t("built")} {v.ship.launched}</span>
                    </div>
                  )}
                  {v.ship.type && (
                    <div style={styles.specItem}>
                      <ShipIcon size={13} color="#d4aa4f" />
                      <span>{v.ship.type}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Itinerary — rich cards or simple timeline */}
      <div style={styles.section}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 20 }}>{t("itinerary")}</h2>
        {hasItinerary ? (
          <div style={styles.itineraryCards}>
            {v.itinerary!.map((stop, i) => (
              <ItineraryCard key={i} stop={stop} isFirst={i === 0} isLast={i === v.itinerary!.length - 1} />
            ))}
          </div>
        ) : (
          /* Fallback: simple timeline from destinations */
          <div style={styles.itineraryTimeline}>
            <TimelineItem day={1} port={v.departurePort || "—"} type="departure" />
            {v.destinations?.slice(0, 8).map((d, i) => (
              <TimelineItem key={i} day={i + 2} port={d} type="port" />
            ))}
            <TimelineItem day={v.nights + 1} port={v.arrivalPort || v.departurePort || "—"} type="arrival" />
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={styles.ctaSection}>
        <a
          href={v.link}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.ctaButton}
          onClick={() => window.openai?.openExternal({ href: v.link })}
        >
          {t("view_full")}
          <ExternalLink size={14} />
        </a>
        <div style={styles.ctaSubtext}>{t("cta_subtitle")}</div>
      </div>
    </div>
  )
}

/* --- Itinerary Card (rich, with photo) --- */

function ItineraryCard({ stop, isFirst, isLast }: {
  stop: ItineraryStop; isFirst: boolean; isLast: boolean
}) {
  const isEndpoint = isFirst || isLast
  const timeStr = [stop.arriveTime, stop.departTime].filter(Boolean).join(" — ")

  if (stop.isSeaDay) {
    return (
      <div style={styles.seaDayCard}>
        <div style={styles.seaDayLeft}>
          <div style={styles.dayBadgeSea}>
            <Waves size={12} color="#6b93c0" />
          </div>
          <div style={styles.connectorLine} />
        </div>
        <div style={styles.seaDayBody}>
          <span style={styles.dayLabel}>{t("day", { n: stop.day })}</span>
          <span style={styles.seaDayText}>{t("at_sea")}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.portCard}>
      {/* Timeline connector */}
      <div style={styles.cardTimeline}>
        <div style={{
          ...styles.dayBadge,
          background: isEndpoint ? "#d4aa4f" : "#0c1b3a",
          border: isEndpoint ? "2px solid #d4aa4f" : "2px solid #1a2d52",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{stop.day}</span>
        </div>
        {!isLast && <div style={styles.connectorLine} />}
      </div>

      {/* Card content */}
      <div style={styles.cardContent}>
        <div style={styles.cardHeader}>
          <div style={{ flex: 1 }}>
            <div style={styles.dayLabel}>{t("day", { n: stop.day })}</div>
            <div style={styles.portName}>{stop.portName}</div>
            {isEndpoint && (
              <div style={styles.endpointBadge}>
                {isFirst ? t("embarkation") : t("disembarkation")}
              </div>
            )}
            {timeStr && (
              <div style={styles.timeRow}>
                <Clock size={11} color="#9ca3af" />
                <span>{timeStr}</span>
              </div>
            )}
          </div>
        </div>

        {/* Port photo + description — left image, right text */}
        {(stop.image || stop.description) && (
          <div style={{
            marginTop: 10, borderRadius: 10, overflow: "hidden",
            border: "1px solid #e5e4df", background: "#fff",
            display: "flex", flexDirection: "row" as const, alignItems: "stretch",
          }}>
            {stop.image && (
              <img
                src={stop.image}
                alt={stop.portName}
                style={{
                  width: 160, minWidth: 160, height: "auto", minHeight: 100,
                  objectFit: "cover", display: "block", flexShrink: 0,
                }}
              />
            )}
            {stop.description && (
              <div style={{ flex: 1, padding: "12px 14px", display: "flex", alignItems: "center" }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#4b5563", margin: 0 }}>
                  {stop.description.length > 200 ? stop.description.slice(0, 200) + "…" : stop.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* --- Helper components --- */

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
      </div>
    </div>
  )
}

function StatDivider() {
  return <div style={{ width: 1, height: 36, background: "#e5e4df" }} />
}

function TimelineItem({ day, port, type }: {
  day: number; port: string; type: "departure" | "port" | "arrival"
}) {
  const dotColor = type === "departure" || type === "arrival" ? "#d4aa4f" : "#0c1b3a"
  const isEndpoint = type !== "port"
  return (
    <div style={styles.timelineItem}>
      <div style={styles.timelineLeft}>
        <div style={{
          ...styles.timelineDot,
          background: dotColor,
          width: isEndpoint ? 14 : 10,
          height: isEndpoint ? 14 : 10,
          border: isEndpoint ? "2px solid #d4aa4f" : "2px solid #0c1b3a",
        }} />
        <div style={styles.timelineLineFallback} />
      </div>
      <div style={styles.timelineContent}>
        <span style={styles.timelineDay}>{t("day", { n: day })}</span>
        <span style={styles.timelinePort}>{port}</span>
        {isEndpoint && (
          <span style={styles.timelineType}>
            {type === "departure" ? t("embarkation") : t("disembarkation")}
          </span>
        )}
      </div>
    </div>
  )
}

/* --- LiteYouTube facade --- */

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) return u.searchParams.get("v")
    if (u.hostname === "youtu.be") return u.pathname.slice(1)
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]
    return null
  } catch { return null }
}

function LiteYouTube({ url }: { url: string }) {
  const videoId = extractVideoId(url)
  if (!videoId) return null

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`

  return (
    <div style={styles.ytWrap}>
      {/* Try iframe embed first — if CSP blocks it, the thumbnail still shows */}
      <div style={styles.ytInner}>
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
        />
        <div style={styles.ytOverlay} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.ytPlayBtn}
          aria-label="Play video"
          onClick={(e) => {
            // Try to replace thumbnail with iframe embed
            const container = e.currentTarget.parentElement
            if (container) {
              e.preventDefault()
              const iframe = document.createElement("iframe")
              iframe.src = embedUrl
              iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              iframe.allowFullscreen = true
              iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;"
              container.innerHTML = ""
              container.appendChild(iframe)
            }
          }}
        >
          <div style={styles.ytPlayCircle}>
            <Play size={28} fill="#0c1b3a" color="#0c1b3a" style={{ marginLeft: 3 }} />
          </div>
        </a>
      </div>
    </div>
  )
}

/* --- Styles --- */

const styles: Record<string, React.CSSProperties> = {
  hero: { position: "relative", height: 320, overflow: "hidden", background: "#0c1b3a" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  heroPlaceholder: {
    width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #0c1b3a 0%, #1a2d52 100%)",
  },
  heroOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to top, rgba(12,27,58,0.95) 0%, rgba(12,27,58,0.3) 50%, transparent 100%)",
  },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px" },
  heroPriceBadge: { display: "inline-flex", alignItems: "baseline", color: "#d4aa4f", marginBottom: 8 },
  heroTitle: { fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0, marginBottom: 6 },
  heroShip: { fontSize: 14, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 },

  statsBar: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 24, padding: "20px 32px", background: "#fff", borderBottom: "1px solid #e5e4df",
  },
  stat: { display: "flex", alignItems: "center", gap: 10 },
  statIcon: { color: "#d4aa4f" },
  statLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: 14, fontWeight: 600, color: "#1a1a2e" },

  section: { padding: "24px 32px" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#0c1b3a", marginBottom: 16, margin: 0 },
  destGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  destTag: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20,
    background: "#f5f5f0", border: "1px solid #e5e4df", fontSize: 13, color: "#1a1a2e", fontWeight: 500,
  },

  /* --- Ship & Brand card --- */
  shipBrandCard: {
    borderRadius: 12, overflow: "hidden", border: "1px solid #e5e4df",
    background: "#fff", display: "flex", flexDirection: "row" as const,
  },
  shipImageWrap: {
    width: 200, minWidth: 200, overflow: "hidden", background: "#0c1b3a", flexShrink: 0,
  },
  shipBrandBody: {
    flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column" as const,
    justifyContent: "center", gap: 6,
  },
  brandRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
  },
  specsRow: {
    display: "flex", flexWrap: "wrap" as const, gap: 12, marginTop: 4,
  },
  specItem: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#6b7280",
  },

  /* --- Rich itinerary cards --- */
  itineraryCards: {
    display: "flex", flexDirection: "column", gap: 0,
  },
  portCard: {
    display: "flex", gap: 16, minHeight: 48,
  },
  cardTimeline: {
    display: "flex", flexDirection: "column", alignItems: "center", width: 28, paddingTop: 4, flexShrink: 0,
  },
  dayBadge: {
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  dayBadgeSea: {
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    background: "rgba(107,147,192,0.1)", border: "2px dashed rgba(107,147,192,0.3)",
  },
  connectorLine: {
    width: 2, flex: 1, background: "#e5e4df", marginTop: 4, minHeight: 16,
  },
  cardContent: {
    flex: 1, paddingBottom: 20, minWidth: 0,
  },
  cardHeader: {
    display: "flex", alignItems: "flex-start", gap: 12,
  },
  dayLabel: {
    fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.04em", marginBottom: 2,
  },
  portName: {
    fontSize: 16, fontWeight: 700, color: "#0c1b3a", lineHeight: 1.3,
  },
  endpointBadge: {
    display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 4,
    background: "rgba(212,170,79,0.12)", color: "#d4aa4f",
    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
  },
  timeRow: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 12, color: "#6b7280", marginTop: 4,
  },

  /* --- Sea day --- */
  seaDayCard: {
    display: "flex", gap: 16, minHeight: 40,
  },
  seaDayLeft: {
    display: "flex", flexDirection: "column", alignItems: "center", width: 28, paddingTop: 4, flexShrink: 0,
  },
  seaDayBody: {
    flex: 1, paddingBottom: 16, paddingTop: 4,
    display: "flex", alignItems: "center", gap: 8,
  },
  seaDayText: {
    fontSize: 14, color: "#6b93c0", fontStyle: "italic", fontWeight: 500,
  },

  /* --- Fallback timeline --- */
  itineraryTimeline: { paddingLeft: 8 },
  timelineItem: { display: "flex", gap: 16, minHeight: 48 },
  timelineLeft: { display: "flex", flexDirection: "column", alignItems: "center", width: 14, paddingTop: 4 },
  timelineDot: { borderRadius: "50%", flexShrink: 0 },
  timelineLineFallback: { width: 2, flex: 1, background: "#e5e4df", marginTop: 4 },
  timelineContent: { paddingBottom: 16, display: "flex", flexDirection: "column", gap: 2 },
  timelineDay: { fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  timelinePort: { fontSize: 15, fontWeight: 600, color: "#1a1a2e" },
  timelineType: { fontSize: 11, color: "#d4aa4f", fontWeight: 500 },

  ctaSection: { padding: "24px 32px 40px", textAlign: "center" },
  ctaButton: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 8,
    background: "#d4aa4f", color: "#0c1b3a", fontSize: 15, fontWeight: 700, textDecoration: "none",
    boxShadow: "0 4px 16px rgba(212,170,79,0.3)", cursor: "pointer",
  },
  ctaSubtext: { fontSize: 12, color: "#9ca3af", marginTop: 10 },

  /* --- YouTube --- */
  ytWrap: { marginBottom: 16 },
  ytInner: {
    position: "relative" as const, paddingBottom: "56.25%", /* 16:9 */
    height: 0, overflow: "hidden", borderRadius: 12, background: "#0c1b3a",
  },
  ytOverlay: {
    position: "absolute" as const, inset: 0,
    background: "rgba(0,0,0,0.3)",
  },
  ytPlayBtn: {
    position: "absolute" as const, inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", textDecoration: "none",
  },
  ytPlayCircle: {
    width: 64, height: 64, borderRadius: "50%",
    background: "rgba(255,255,255,0.9)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
}
