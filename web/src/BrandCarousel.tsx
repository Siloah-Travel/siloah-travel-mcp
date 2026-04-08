import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Ship, Anchor } from "lucide-react"
import { t } from "./i18n"
import type { Brand } from "./brands"

export function BrandCarousel({ brands, onSelectBrand }: { brands: Brand[]; onSelectBrand?: (index: number) => void }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: false,
  })

  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div style={{ position: "relative" }}>
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {brands.map((b, i) => (
            <BrandCard key={i} brand={b} onClick={onSelectBrand ? () => onSelectBrand(i) : undefined} />
          ))}
        </div>
      </div>

      {canPrev && (
        <NavButton dir="prev" onClick={() => emblaApi?.scrollPrev()} />
      )}
      {canNext && (
        <NavButton dir="next" onClick={() => emblaApi?.scrollNext()} />
      )}
    </div>
  )
}

function NavButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous" : "Next"}
      style={{
        position: "absolute",
        [dir === "prev" ? "left" : "right"]: -6,
        top: "50%", transform: "translateY(-50%)",
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(255,255,255,0.95)", border: "1px solid #e5e4df",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10,
      }}
    >
      <Icon size={18} color="#1a1a2e" />
    </button>
  )
}

function BrandCard({ brand: b, onClick }: { brand: Brand; onClick?: () => void }) {
  const coverImage = b.ships?.find((s) => s.image)?.image ?? null
  const tierKey = b.tier ? `tier_${b.tier}` : null
  const tierColors: Record<string, { bg: string; color: string }> = {
    ultra_luxury: { bg: "rgba(212,170,79,0.15)", color: "#b8923a" },
    luxury: { bg: "rgba(12,27,58,0.08)", color: "#0c1b3a" },
    popular: { bg: "rgba(107,147,192,0.12)", color: "#4a7bab" },
  }
  const tc = b.tier ? tierColors[b.tier] ?? tierColors.popular : null

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) { e.preventDefault(); onClick() }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        flex: "0 0 260px",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e5e4df",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)" }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      {/* Cover image */}
      <div style={{ height: 160, background: "#0c1b3a", position: "relative", overflow: "hidden" }}>
        {coverImage ? (
          <img src={coverImage} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Anchor size={44} color="rgba(255,255,255,0.2)" />
          </div>
        )}
        {/* Gradient overlay for logo legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,27,58,0.7) 0%, rgba(12,27,58,0.1) 60%, transparent 100%)" }} />
        {/* Logo overlay */}
        {b.logo && (
          <div style={{ position: "absolute", bottom: 10, left: 12 }}>
            <img src={b.logo} alt="" style={{ height: 22, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          </div>
        )}
        {/* Tier badge */}
        {tc && tierKey && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: tc.bg, color: tc.color,
            fontSize: 10, fontWeight: 600,
            padding: "2px 8px", borderRadius: 4,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {t(tierKey)}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
            {b.name}
          </div>

          {b.description && (
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 8 }}>
              {b.description.length > 100 ? b.description.slice(0, 100) + "..." : b.description}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" }}>
              <Ship size={12} color="#d4aa4f" />
              <span>{b.shipCount} {t("ships_label")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" }}>
              <Anchor size={12} color="#d4aa4f" />
              <span>{b.cruiseCount} {t("cruises_label")}</span>
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 12, color: "#0c1b3a", fontWeight: 500, marginTop: 8,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {t("view_brand")}
        </div>
      </div>
    </div>
  )
}
