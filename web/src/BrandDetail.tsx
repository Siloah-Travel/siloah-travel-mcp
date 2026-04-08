import { Ship as ShipIcon, Star, Users, Anchor, ExternalLink } from "lucide-react"
import { t } from "./i18n"
import type { Brand, BrandShip } from "./brands"

export function BrandDetail({ brand: b }: { brand: Brand }) {
  const tierKey = b.tier ? `tier_${b.tier}` : null
  const tierColors: Record<string, { bg: string; color: string; border: string }> = {
    ultra_luxury: { bg: "rgba(212,170,79,0.15)", color: "#b8923a", border: "rgba(212,170,79,0.25)" },
    luxury: { bg: "rgba(12,27,58,0.08)", color: "#0c1b3a", border: "rgba(12,27,58,0.15)" },
    popular: { bg: "rgba(107,147,192,0.12)", color: "#4a7bab", border: "rgba(107,147,192,0.2)" },
  }
  const tc = b.tier ? tierColors[b.tier] ?? tierColors.popular : null
  const coverImage = b.ships?.find((s) => s.image)?.image ?? null

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 100 }}>
      {/* Hero */}
      <div style={styles.hero}>
        {coverImage && (
          <img src={coverImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          {b.logo && (
            <img src={b.logo} alt="" style={{ height: 40, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 12 }} />
          )}
          {tc && tierKey && (
            <div style={{
              display: "inline-block", padding: "3px 12px", borderRadius: 4, marginBottom: 10,
              background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
              fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {t(tierKey)}
            </div>
          )}
          <h1 style={styles.heroTitle}>{b.name}</h1>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={styles.statsBar}>
        <Stat icon={<ShipIcon size={16} />} label={t("ships_label")} value={String(b.shipCount)} />
        <StatDivider />
        <Stat icon={<Anchor size={16} />} label={t("cruises_label")} value={String(b.cruiseCount)} />
      </div>

      {/* Description */}
      {b.description && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("brand_overview")}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4b5563", margin: 0 }}>{b.description}</p>
        </div>
      )}

      {/* Fleet */}
      {b.ships && b.ships.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("brand_ships")}</h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
            {b.ships.map((ship, i) => (
              <ShipCard key={i} ship={ship} />
            ))}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <div style={styles.section}>
        <div style={styles.contactCta}>
          <h2 style={styles.contactCtaHeading}>{t("cta_heading")}</h2>
          <p style={styles.contactCtaDesc}>{t("cta_description")}</p>
          <button style={styles.contactCtaButton} onClick={() => window.openai?.openExternal({ href: b.link })}>
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

function ShipCard({ ship: s }: { ship: BrandShip }) {
  return (
    <div style={styles.shipCard} role="button" tabIndex={0}
      onClick={() => window.openai?.openExternal({ href: s.link })}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.openai?.openExternal({ href: s.link }) }}>
      <div style={styles.shipImageWrap}>
        {s.image ? (
          <img src={s.image} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={styles.shipImagePlaceholder}><ShipIcon size={28} color="rgba(255,255,255,0.15)" /></div>
        )}
      </div>
      <div style={styles.shipBody}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0c1b3a", marginBottom: 4 }}>{s.name}</div>
        {s.starRating && s.starRating > 0 && (
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {Array.from({ length: Math.round(s.starRating) }).map((_, i) => (
              <Star key={i} size={13} fill="#d4aa4f" color="#d4aa4f" />
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
          {s.type && <div style={styles.shipSpec}><ShipIcon size={12} color="#d4aa4f" /><span>{s.type}</span></div>}
          {s.passengers && <div style={styles.shipSpec}><Users size={12} color="#d4aa4f" /><span>{s.passengers.toLocaleString()} {t("guests", { n: "" }).trim()}</span></div>}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <span style={styles.shipCta}>{t("view_details").replace(" \u2192", "")}<ExternalLink size={12} /></span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hero: { position: "relative", height: 280, overflow: "hidden", background: "#0c1b3a" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,27,58,0.95) 0%, rgba(12,27,58,0.4) 50%, rgba(12,27,58,0.2) 100%)" },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px" },
  heroTitle: { fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0 },
  statsBar: { display: "flex", alignItems: "center", justifyContent: "center", gap: 40, padding: "20px 32px", background: "#fff", borderBottom: "1px solid #e5e4df" },
  stat: { display: "flex", alignItems: "center", gap: 10 },
  statIcon: { color: "#d4aa4f" },
  statLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontSize: 18, fontWeight: 700, color: "#1a1a2e" },
  section: { padding: "24px 32px" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#0c1b3a", margin: "0 0 16px 0" },
  shipCard: { display: "flex", flexDirection: "row" as const, overflow: "hidden", borderRadius: 12, border: "1px solid #e5e4df", background: "#fff", cursor: "pointer", transition: "box-shadow 0.2s", textDecoration: "none", color: "inherit" },
  shipImageWrap: { width: "40%", minWidth: "40%", minHeight: 140, overflow: "hidden", background: "#0c1b3a", flexShrink: 0 },
  shipImagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0c1b3a 0%, #1a2d52 100%)" },
  shipBody: { flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column" as const, minWidth: 0 },
  shipSpec: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" },
  shipCta: { display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, padding: "6px 14px", borderRadius: 6, background: "rgba(12,27,58,0.85)", color: "#fff", fontSize: 13, fontWeight: 500 },
  contactCta: { background: "rgba(12,27,58,0.85)", backdropFilter: "blur(48px) saturate(1.5)", WebkitBackdropFilter: "blur(48px) saturate(1.5)", borderRadius: 12, padding: "40px 32px", textAlign: "center" as const, border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" },
  contactCtaHeading: { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 10px 0", lineHeight: 1.3 },
  contactCtaDesc: { fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: "0 0 20px 0", maxWidth: 480, marginLeft: "auto", marginRight: "auto" },
  contactCtaButton: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 28px", borderRadius: 4, background: "#d4aa4f", color: "#0c1b3a", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(212,170,79,0.3)" },
}
