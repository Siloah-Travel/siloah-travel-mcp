import { Ship as ShipIcon, Star, Users, Anchor, ExternalLink, Layers, Calendar } from "lucide-react"
import { t } from "./i18n"
import type { Ship } from "./ships"

export function ShipDetail({ ship: s }: { ship: Ship }) {
  const specs = [
    s.passengers && { label: t("guests", { n: "" }).replace(/\s*$/, ""), value: s.passengers.toLocaleString(), icon: <Users size={16} /> },
    s.cabins && { label: t("cabins", { n: "" }).replace(/\s*$/, ""), value: s.cabins.toLocaleString(), icon: <Layers size={16} /> },
    s.tonnage && { label: t("gross_tonnage"), value: `${Number(s.tonnage).toLocaleString()} GT`, icon: <Anchor size={16} /> },
    s.launched && { label: t("built"), value: s.launched, icon: <Calendar size={16} /> },
    s.type && { label: t("type"), value: s.type, icon: <ShipIcon size={16} /> },
  ].filter(Boolean) as { label: string; value: string; icon: React.ReactNode }[]

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Hero */}
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

      {/* Specs grid */}
      {specs.length > 0 && (
        <div style={styles.specsGrid}>
          {specs.map((sp, i) => (
            <div key={i} style={styles.specCard}>
              <div style={styles.specIcon}>{sp.icon}</div>
              <div style={styles.specLabel}>{sp.label}</div>
              <div style={styles.specValue}>{sp.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Voyages count */}
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

      {/* CTA */}
      <div style={styles.ctaSection}>
        <a
          href={s.link}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.ctaButton}
          onClick={() => window.openai?.openExternal({ href: s.link })}
        >
          {t("view_ship_full")}
          <ExternalLink size={14} />
        </a>
        <div style={styles.ctaSubtext}>
          {t("cta_ship_subtitle")}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    position: "relative", height: 320, overflow: "hidden", background: "#0c1b3a",
  },
  heroImg: {
    width: "100%", height: "100%", objectFit: "cover", display: "block",
  },
  heroPlaceholder: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #0c1b3a 0%, #1a2d52 100%)",
  },
  heroOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to top, rgba(12,27,58,0.95) 0%, rgba(12,27,58,0.3) 50%, transparent 100%)",
  },
  heroContent: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px",
  },
  typeBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 4,
    background: "rgba(212,170,79,0.2)", color: "#d4aa4f",
    fontSize: 11, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0,
  },
  heroBrand: {
    fontSize: 15, color: "rgba(255,255,255,0.6)", marginTop: 4,
  },

  specsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12, padding: "24px 32px",
    background: "#fff", borderBottom: "1px solid #e5e4df",
  },
  specCard: {
    padding: "16px", borderRadius: 10,
    background: "#fafaf7", border: "1px solid #e5e4df",
    textAlign: "center",
  },
  specIcon: { color: "#d4aa4f", marginBottom: 6, display: "flex", justifyContent: "center" },
  specLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" },
  specValue: { fontSize: 16, fontWeight: 700, color: "#0c1b3a", marginTop: 2 },

  section: { padding: "24px 32px" },
  voyagesBanner: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "16px 20px", borderRadius: 10,
    background: "rgba(12,27,58,0.04)", border: "1px solid #e5e4df",
    color: "#0c1b3a",
  },

  ctaSection: { padding: "24px 32px 40px", textAlign: "center" },
  ctaButton: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "14px 32px", borderRadius: 8,
    background: "#d4aa4f", color: "#0c1b3a",
    fontSize: 15, fontWeight: 700, textDecoration: "none",
    boxShadow: "0 4px 16px rgba(212,170,79,0.3)", cursor: "pointer",
  },
  ctaSubtext: { fontSize: 12, color: "#9ca3af", marginTop: 10 },
}
