import { createRoot } from "react-dom/client"
import { useState, useCallback } from "react"
import { useToolOutput, useAutoResize, useDisplayMode } from "./hooks"
import { BrandCarousel } from "./BrandCarousel"
import { BrandDetail } from "./BrandDetail"
import { setLocale, t } from "./i18n"
import { ChevronLeft, Anchor } from "lucide-react"

export interface BrandShip {
  name: string
  type: string | null
  passengers: number | null
  starRating: number | null
  image: string | null
  link: string
}

export interface Brand {
  name: string
  tier: string | null
  description: string
  shipCount: number
  cruiseCount: number
  logo: string | null
  link: string
  ships: BrandShip[]
}

interface BrandData {
  locale?: string
  brands: Brand[]
}

interface WidgetState {
  view: "carousel" | "detail"
  selectedIndex: number
}

function App() {
  const data = useToolOutput<BrandData>()
  const displayMode = useDisplayMode()
  useAutoResize()

  if (data?.locale) setLocale(data.locale)

  const [state, setState] = useState<WidgetState>(() => {
    const saved = window.openai?.widgetState as WidgetState | undefined
    return saved?.view ? saved : { view: "carousel", selectedIndex: 0 }
  })

  const selectBrand = useCallback(async (index: number) => {
    const newState: WidgetState = { view: "detail", selectedIndex: index }
    setState(newState)
    window.openai?.setWidgetState(newState)
    await window.openai?.requestDisplayMode({ mode: "fullscreen" })
  }, [])

  const backToCarousel = useCallback(async () => {
    const newState: WidgetState = { view: "carousel", selectedIndex: 0 }
    setState(newState)
    window.openai?.setWidgetState(newState)
    await window.openai?.requestDisplayMode({ mode: "inline" })
  }, [])

  if (!data) {
    return <div style={styles.empty}>{t("loading_brands")}</div>
  }
  if (!data.brands?.length) {
    return <div style={styles.empty}>{t("no_brands")}</div>
  }

  // Fullscreen master-detail
  if (state.view === "detail" && displayMode === "fullscreen") {
    const selected = data.brands[state.selectedIndex] ?? data.brands[0]
    return (
      <div style={styles.fullscreen}>
        <div style={styles.sidebar}>
          <button onClick={backToCarousel} style={styles.backBtn}>
            <ChevronLeft size={16} /> {t("back_to_chat")}
          </button>
          <div style={styles.sidebarTitle}>
            {t("brands_found", { count: data.brands.length })}
          </div>
          <div style={styles.sidebarList}>
            {data.brands.map((b, i) => (
              <SidebarItem
                key={i}
                brand={b}
                selected={i === state.selectedIndex}
                onClick={() => {
                  const newState: WidgetState = { view: "detail", selectedIndex: i }
                  setState(newState)
                  window.openai?.setWidgetState(newState)
                }}
              />
            ))}
          </div>
        </div>
        <div style={styles.detailPanel}>
          <BrandDetail brand={selected} />
        </div>
      </div>
    )
  }

  // Inline carousel
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        {t("brands_found", { count: data.brands.length })}
      </div>
      <BrandCarousel brands={data.brands} onSelectBrand={selectBrand} />
    </div>
  )
}

function SidebarItem({ brand: b, selected, onClick }: {
  brand: Brand; selected: boolean; onClick: () => void
}) {
  const tierKey = b.tier ? `tier_${b.tier}` : null
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.sidebarItem,
        background: selected ? "rgba(212,170,79,0.12)" : "transparent",
        borderLeft: selected ? "3px solid #d4aa4f" : "3px solid transparent",
      }}
    >
      <div style={styles.sidebarThumb}>
        {b.ships?.find((s) => s.image)?.image ? (
          <img src={b.ships.find((s) => s.image)!.image!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : b.logo ? (
          <img src={b.logo} alt="" style={{ width: "80%", height: "80%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        ) : (
          <Anchor size={20} color="rgba(255,255,255,0.3)" />
        )}
      </div>
      <div style={styles.sidebarItemBody}>
        <div style={styles.sidebarItemTitle}>{b.name}</div>
        {tierKey && (
          <div style={styles.sidebarItemMeta}>{t(tierKey)}</div>
        )}
        <div style={styles.sidebarItemMeta}>
          {b.shipCount} {t("ships_label")} · {b.cruiseCount} {t("cruises_label")}
        </div>
      </div>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  empty: { textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 },
  fullscreen: {
    display: "flex", height: "100vh", width: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#fafaf7", color: "#1a1a2e",
  },
  sidebar: {
    width: 300, minWidth: 300, height: "100%",
    background: "#0c1b3a", color: "#fff",
    display: "flex", flexDirection: "column",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },
  backBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "14px 16px", fontSize: 13, color: "rgba(255,255,255,0.6)",
    background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer", width: "100%", textAlign: "left",
  },
  sidebarTitle: {
    padding: "12px 16px 8px", fontSize: 12, fontWeight: 600,
    color: "#d4aa4f", textTransform: "uppercase", letterSpacing: "0.05em",
  },
  sidebarList: { flex: 1, overflowY: "auto", paddingBottom: 16 },
  sidebarItem: {
    display: "flex", gap: 10, padding: "10px 16px 10px 13px",
    width: "100%", border: "none", cursor: "pointer", textAlign: "left",
    transition: "background 0.15s",
  },
  sidebarThumb: {
    width: 56, height: 56, minWidth: 56, borderRadius: 8,
    overflow: "hidden", background: "rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sidebarItemBody: { flex: 1, minWidth: 0 },
  sidebarItemTitle: {
    fontSize: 13, fontWeight: 600, color: "#fff",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2,
  },
  sidebarItemMeta: {
    fontSize: 11, color: "rgba(255,255,255,0.5)",
    display: "flex", alignItems: "center", gap: 4, marginBottom: 1,
  },
  detailPanel: { flex: 1, overflowY: "auto", height: "100%" },
}

createRoot(document.getElementById("root")!).render(<App />)
