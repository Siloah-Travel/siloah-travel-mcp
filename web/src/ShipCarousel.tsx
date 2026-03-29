import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Star, Anchor, Users, Ship as ShipIcon } from "lucide-react"
import { t } from "./i18n"

interface Ship {
  name: string
  brand: string
  tonnage: number | null
  passengers: number | null
  cabins: number | null
  launched: string | null
  type: string | null
  starRating: number | null
  cruiseCount: number
  image: string | null
  link: string
}

export function ShipCarousel({ ships, onSelectShip }: { ships: Ship[]; onSelectShip?: (index: number) => void }) {
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
          {ships.map((s, i) => (
            <ShipCard key={i} ship={s} onClick={onSelectShip ? () => onSelectShip(i) : undefined} />
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

function ShipCard({ ship: s, onClick }: { ship: Ship; onClick?: () => void }) {
  const specs: string[] = []
  if (s.passengers) specs.push(`${s.passengers.toLocaleString()} guests`)
  if (s.cabins) specs.push(`${s.cabins.toLocaleString()} cabins`)
  if (s.tonnage) specs.push(`${Number(s.tonnage).toLocaleString()} GT`)
  if (s.launched) specs.push(`Built ${s.launched}`)

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) { e.preventDefault(); onClick() }
  }

  return (
    <a
      href={s.link}
      target="_blank"
      rel="noopener noreferrer"
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
      {/* Image */}
      <div style={{ height: 160, background: "#0c1b3a", position: "relative", overflow: "hidden" }}>
        {s.image ? (
          <img
            src={s.image}
            alt={s.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.2)", fontSize: 44,
          }}>
            <Anchor size={44} />
          </div>
        )}
        {/* Type badge */}
        {s.type && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(12,27,58,0.88)", backdropFilter: "blur(8px)",
            color: "#d4aa4f", fontSize: 10, fontWeight: 600,
            padding: "2px 8px", borderRadius: 4,
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {s.type}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>
            {s.name}
          </div>
          {s.brand && (
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              {s.brand}
            </div>
          )}

          {/* Star rating */}
          {s.starRating && s.starRating > 0 && (
            <div style={{ display: "flex", gap: 1, marginBottom: 6 }}>
              {Array.from({ length: Math.round(s.starRating) }).map((_, i) => (
                <Star key={i} size={13} fill="#d4aa4f" color="#d4aa4f" />
              ))}
            </div>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {specs.map((sp, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4,
                  background: "#f5f5f0", color: "#6b7280", whiteSpace: "nowrap",
                }}>
                  {sp}
                </span>
              ))}
            </div>
          )}

          {/* Voyage count */}
          {s.cruiseCount > 0 && (
            <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
              <ShipIcon size={12} />
              {t("upcoming_voyages", { n: s.cruiseCount })}
            </div>
          )}
        </div>

        <div style={{
          fontSize: 12, color: "#0c1b3a", fontWeight: 500, marginTop: 8,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {t("view_ship")}
        </div>
      </div>
    </a>
  )
}
