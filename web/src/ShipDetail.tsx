import { Ship as ShipIcon, Star, Users, Anchor, Layers, Calendar, ExternalLink, Play, Accessibility, ImageOff, ChevronRight } from "lucide-react"
import { t } from "./i18n"
import type { Ship, ShipCabin } from "./ships"

export function ShipDetail({ ship: s }: { ship: Ship }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 100 }}>
      {/* Hero image */}
      <div style={styles.hero}>
        {s.image ? (
          <img src={s.image} alt={s.name} style={styles.heroImg} />
        ) : (
          <div style={styles.heroPlaceholder}>
            <ShipIcon size={64} color="rgba(255,255,255,0.15)" />
          </div>
        )}
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          {s.type && (
            <div style={styles.typeBadge}>{s.type}</div>
          )}
          <h1 style={styles.heroTitle}>{s.name}</h1>
          <div style={styles.heroBrand}>{s.brand}</div>
          {s.starRating && s.starRating > 0 && (
            <div style={{ display: "flex", gap: 2, marginTop: 6 }}>
              {Array.from({ length: Math.round(s.starRating) }).map((_, i) => (
                <Star key={i} size={16} fill="#d4aa4f" color="#d4aa4f" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={styles.statsBar}>
        {s.passengers && <Stat icon={<Users size={16} />} label={t("guests", { n: "" }).trim()} value={s.passengers.toLocaleString()} />}
        {s.passengers && s.cabins && <StatDivider />}
        {s.cabins && <Stat icon={<Layers size={16} />} label={t("cabins", { n: "" }).trim()} value={s.cabins.toLocaleString()} />}
        {s.cabins && s.tonnage && <StatDivider />}
        {s.tonnage && <Stat icon={<Anchor size={16} />} label={t("gross_tonnage")} value={`${Number(s.tonnage).toLocaleString()} GT`} />}
        {s.tonnage && s.launched && <StatDivider />}
        {s.launched && <Stat icon={<Calendar size={16} />} label={t("built")} value={s.launched} />}
      </div>

      {/* YouTube video */}
      {s.videoUrl && (
        <div style={styles.section}>
          <LiteYouTube url={s.videoUrl} link={s.link} />
        </div>
      )}

      {/* Brand card */}
      {s.brandLogo && (
        <div style={styles.section}>
          <div style={styles.brandCard}>
            <img src={s.brandLogo} alt="" style={{ height: 28, width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>{s.brand}</span>
          </div>
        </div>
      )}

      {/* Upcoming voyages banner */}
      {s.cruiseCount > 0 && (
        <div style={styles.section}>
          <div style={styles.voyagesBanner}>
            <ShipIcon size={20} color="#d4aa4f" />
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {t("upcoming_voyages", { n: s.cruiseCount })}
            </span>
          </div>
        </div>
      )}

      {/* Cabin Options */}
      {s.cabinTypes && s.cabinTypes.length > 0 && (
        <div style={styles.section}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: 16 }}>{t("cabin_pricing")}</h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
            {s.cabinTypes.map((cabin, i) => (
              <CabinCard key={i} cabin={cabin} shipLink={s.link} />
            ))}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <div style={styles.section}>
        <div style={styles.contactCta}>
          <h2 style={styles.contactCtaHeading}>{t("cta_heading")}</h2>
          <p style={styles.contactCtaDesc}>{t("cta_description")}</p>
          <button style={styles.contactCtaButton} onClick={() => window.openai?.openExternal({ href: s.link })}>
            {t("cta_book")}
          </button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>siloah.travel</div>
        </div>
      </div>
    </div>
  )
}

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

function CabinCard({ cabin, shipLink }: { cabin: ShipCabin; shipLink: string }) {
  const isSuite = cabin.type === "Suite"
  const typeLabel = t(`cabin_${cabin.type.toLowerCase()}`)
  const sizeText = (() => {
    if (cabin.sizeMin && cabin.sizeMax && cabin.sizeMin !== cabin.sizeMax) return t("cabin_sqft", { min: cabin.sizeMin, max: cabin.sizeMax })
    const sz = cabin.sizeMax ?? cabin.sizeMin
    return sz ? t("cabin_sqft_single", { size: sz }) : null
  })()

  return (
    <div style={styles.cabinCard} role="button" tabIndex={0}
      onClick={() => window.openai?.openExternal({ href: shipLink })}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.openai?.openExternal({ href: shipLink }) }}>
      <div style={styles.cabinImageWrap}>
        {cabin.image ? (
          <img src={cabin.image} alt={cabin.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={styles.cabinImagePlaceholder}><ImageOff size={28} color="rgba(255,255,255,0.15)" /></div>
        )}
      </div>
      <div style={styles.cabinBody}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", flex: 1 }}>{cabin.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {cabin.accessible && <Accessibility size={13} color="rgba(12,27,58,0.5)" />}
            <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 4,
              background: isSuite ? "rgba(212,170,79,0.12)" : "rgba(12,27,58,0.06)",
              color: isSuite ? "#b8923a" : "rgba(12,27,58,0.6)",
              border: isSuite ? "1px solid rgba(212,170,79,0.25)" : "1px solid rgba(12,27,58,0.1)",
            }}>{typeLabel}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          {sizeText && <span>{sizeText}</span>}
          {cabin.maxOccupancy && <span>{t("cabin_max_guests", { n: cabin.maxOccupancy })}</span>}
        </div>
        {cabin.description && <p style={{ fontSize: 13, lineHeight: 1.6, color: "#4b5563", margin: "0 0 10px 0" }}>{cabin.description}</p>}
        {cabin.facilities && cabin.facilities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 10 }}>
            {cabin.facilities.map((f, i) => (
              <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#f5f5f0", border: "1px solid rgba(0,0,0,0.04)", color: "#6b7280" }}>{f}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f0efe9", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <span style={styles.cabinCta}>{t("view_details").replace(" \u2192", "")}<ChevronRight size={14} /></span>
        </div>
      </div>
    </div>
  )
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) return u.searchParams.get("v")
    if (u.hostname === "youtu.be") return u.pathname.slice(1)
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]
    return null
  } catch { return null }
}

function LiteYouTube({ url, link }: { url: string; link: string }) {
  const videoId = extractVideoId(url)
  if (!videoId) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.ytInner} role="button" tabIndex={0} aria-label="Watch video"
        onClick={() => window.openai?.openExternal({ href: link })}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.openai?.openExternal({ href: link }) }}>
        <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        <div style={styles.ytOverlay} />
        <div style={styles.ytPlayBtn}><div style={styles.ytPlayCircle}><Play size={28} fill="#0c1b3a" color="#0c1b3a" style={{ marginLeft: 3 }} /></div></div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hero: { position: "relative", height: 320, overflow: "hidden", background: "#0c1b3a" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  heroPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0c1b3a 0%, #1a2d52 100%)" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,27,58,0.95) 0%, rgba(12,27,58,0.3) 50%, transparent 100%)" },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px" },
  typeBadge: { display: "inline-block", padding: "3px 10px", borderRadius: 4, background: "rgba(212,170,79,0.2)", color: "#d4aa4f", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0 },
  heroBrand: { fontSize: 15, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  statsBar: { display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "20px 32px", background: "#fff", borderBottom: "1px solid #e5e4df" },
  stat: { display: "flex", alignItems: "center", gap: 10 },
  statIcon: { color: "#d4aa4f" },
  statLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: 14, fontWeight: 600, color: "#1a1a2e" },
  section: { padding: "24px 32px" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#0c1b3a", marginBottom: 16, margin: 0 },
  brandCard: { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 10, background: "#fff", border: "1px solid #e5e4df" },
  voyagesBanner: { display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderRadius: 10, background: "rgba(12,27,58,0.04)", border: "1px solid #e5e4df", color: "#0c1b3a" },
  contactCta: { background: "rgba(12,27,58,0.85)", backdropFilter: "blur(48px) saturate(1.5)", WebkitBackdropFilter: "blur(48px) saturate(1.5)", borderRadius: 12, padding: "40px 32px", textAlign: "center" as const, border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" },
  contactCtaHeading: { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 10px 0", lineHeight: 1.3 },
  contactCtaDesc: { fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: "0 0 20px 0", maxWidth: 480, marginLeft: "auto", marginRight: "auto" },
  contactCtaButton: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 28px", borderRadius: 4, background: "#d4aa4f", color: "#0c1b3a", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(212,170,79,0.3)" },
  cabinCard: { display: "flex", flexDirection: "row" as const, overflow: "hidden", borderRadius: 12, border: "1px solid #e5e4df", background: "#fff", cursor: "pointer", transition: "box-shadow 0.2s" },
  cabinImageWrap: { width: "45%", minWidth: "45%", minHeight: 200, overflow: "hidden", background: "#0c1b3a", flexShrink: 0 },
  cabinImagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0c1b3a 0%, #1a2d52 100%)" },
  cabinBody: { flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column" as const, minWidth: 0 },
  cabinCta: { display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0, whiteSpace: "nowrap" as const, padding: "6px 14px", borderRadius: 6, background: "rgba(12,27,58,0.85)", color: "#fff", fontSize: 13, fontWeight: 500 },
  ytInner: { position: "relative" as const, paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 12, background: "#0c1b3a", cursor: "pointer" },
  ytOverlay: { position: "absolute" as const, inset: 0, background: "rgba(0,0,0,0.3)" },
  ytPlayBtn: { position: "absolute" as const, inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  ytPlayCircle: { width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
}
