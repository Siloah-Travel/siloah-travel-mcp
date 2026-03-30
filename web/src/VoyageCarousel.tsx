import { useState, useCallback, useEffect } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { t } from "./i18n"

interface Voyage {
  name: string
  shipName: string
  sailDate: string
  nights: number
  departurePort: string
  arrivalPort: string
  price: number | null
  destinations: string[]
  image: string | null
  link: string
}

export function VoyageCarousel({ voyages, onSelectVoyage }: { voyages: Voyage[]; onSelectVoyage?: (index: number) => void }) {
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
      {/* Carousel viewport */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {voyages.map((v, i) => (
            <VoyageCard key={i} voyage={v} onClick={onSelectVoyage ? () => onSelectVoyage(i) : undefined} />
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {canPrev && (
        <button
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous"
          style={{
            position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)",
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.95)", border: "1px solid #e5e4df",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10,
          }}
        >
          <ChevronLeft size={18} color="#1a1a2e" />
        </button>
      )}
      {canNext && (
        <button
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next"
          style={{
            position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.95)", border: "1px solid #e5e4df",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10,
          }}
        >
          <ChevronRight size={18} color="#1a1a2e" />
        </button>
      )}
    </div>
  )
}

function VoyageCard({ voyage: v, onClick }: { voyage: Voyage; onClick?: () => void }) {
  const date = v.sailDate ? formatDate(v.sailDate) : ""
  const price = v.price ? `$${Number(v.price).toLocaleString()}` : null
  const dests = Array.isArray(v.destinations) ? v.destinations.slice(0, 4).join(" · ") : ""

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={v.name}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.() }}
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
      <div style={{ height: 150, background: "#0c1b3a", position: "relative", overflow: "hidden" }}>
        {v.image ? (
          <img
            src={v.image}
            alt={v.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.2)", fontSize: 40,
          }}>
            ⚓
          </div>
        )}
        {/* Price badge */}
        {price && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(12,27,58,0.88)", backdropFilter: "blur(8px)",
            color: "#d4aa4f", fontSize: 13, fontWeight: 600,
            padding: "3px 10px", borderRadius: 6,
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginRight: 3, textTransform: "uppercase" }}>{t("from_price")}</span>
            {price}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 3,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {v.name}
          </div>
          {v.shipName && (
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, textTransform: "capitalize" }}>
              {v.shipName}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {date && <Tag>{date}</Tag>}
            {v.nights > 0 && <Tag>{t("nights", { n: v.nights })}</Tag>}
          </div>
          {dests && (
            <div style={{
              fontSize: 11, color: "#9ca3af", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {dests}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 12, color: "#0c1b3a", fontWeight: 500, marginTop: 8,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {t("view_details")}
        </div>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 4,
      background: "#f5f5f0", color: "#6b7280", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  )
}

function formatDate(s: string) {
  try {
    const d = new Date(s + "T00:00:00")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return s
  }
}
