import { createRoot } from "react-dom/client"
import { useState, useCallback } from "react"
import { useToolOutput, useAutoResize, useDisplayMode } from "./hooks"
import { ShipCarousel } from "./ShipCarousel"
import { ShipDetail } from "./ShipDetail"
import { setLocale, t } from "./i18n"
import { ChevronLeft, Ship, Star, Users, Anchor } from "lucide-react"

export interface Ship {
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

interface ShipData {
  locale?: string
  ships: Ship[]
}

interface WidgetState {
  view: "carousel" | "detail"
  selectedIndex: number
}

function App() {
  const data = useToolOutput<ShipData>()
  const displayMode = useDisplayMode()
  useAutoResize()

  if (data?.locale) setLocale(data.locale)

  const [state, setState] = useState<WidgetState>(() => {
    const saved = window.openai?.widgetState as WidgetState | undefined
    return saved?.view ? saved : { view: "carousel", selectedIndex: 0 }
  })

  const selectShip = useCallback(async (index: number) => {
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
    return <div style={styles.empty}>{t("loading_ships")}</div>
  }
  if (!data.ships?.length) {
    return <div style={styles.empty}>{t("no_ships")}</div>
  }

  // Fullscreen master-detail
  if (state.view === "detail" && displayMode === "fullscreen") {
    const selected = data.ships[state.selectedIndex] ?? data.ships[0]
    return (
      <div style={styles.fullscreen}>
        <div style={styles.sidebar}>
          <button onClick={backToCarousel} style={styles.backBtn}>
            <ChevronLeft size={16} /> {t("back_to_chat")}
          </button>
          <div style={styles.sidebarTitle}>
            {t("ships_found", { count: data.ships.length })}
          </div>
          <div style={styles.sidebarList}>
            {data.ships.map((s, i) => (
              <SidebarItem
                key={i}
                ship={s}
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
          <ShipDetail ship={selected} />
        </div>
      </div>
    )
  }

  // Inline carousel
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        {t("ships_found", { count: data.ships.length })}
      </div>
      <ShipCarousel ships={data.ships} onSelectShip={selectShip} />
    </div>
  )
}

function SidebarItem({ ship: s, selected, onClick }: {
  ship: Ship; selected: boolean; onClick: () => void
}) {
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
        {s.image ? (
          <img src={s.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Anchor size={20} color="rgba(255,255,255,0.3)" />
        )}
      </div>
      <div style={styles.sidebarItemBody}>
        <div style={styles.sidebarItemTitle}>{s.name}</div>
        <div style={styles.sidebarItemMeta}>
          <Ship size={11} /> {s.brand}
        </div>
        {s.starRating && s.starRating > 0 && (
          <div style={{ display: "flex", gap: 1, marginTop: 2 }}>
            {Array.from({ length: Math.round(s.starRating) }).map((_, i) => (
              <Star key={i} size={10} fill="#d4aa4f" color="#d4aa4f" />
            ))}
          </div>
        )}
        {s.passengers && (
          <div style={styles.sidebarItemMeta}>
            <Users size={11} /> {s.passengers.toLocaleString()} guests
          </div>
        )}
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
