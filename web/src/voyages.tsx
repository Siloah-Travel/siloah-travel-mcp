import { createRoot } from "react-dom/client"
import { useState, useCallback } from "react"
import { useToolOutput, useAutoResize, useDisplayMode } from "./hooks"
import { VoyageCarousel } from "./VoyageCarousel"
import { VoyageDetail } from "./VoyageDetail"
import { setLocale, t } from "./i18n"
import { ChevronLeft, Ship, Calendar, Anchor } from "lucide-react"

export interface ItineraryStop {
  day: number
  portName: string
  arriveTime: string | null
  departTime: string | null
  image: string | null
  description: string | null
  isSeaDay: boolean
}

export interface VoyageBrand {
  name: string
  logo: string | null
}

export interface VoyageShip {
  name: string
  tonnage: number | null
  passengers: number | null
  cabins: number | null
  launched: string | null
  starRating: number | null
  type: string | null
  videoUrl: string | null
}

export interface Voyage {
  name: string
  shipName: string
  sailDate: string
  nights: number
  departurePort: string
  arrivalPort: string
  price: number | null
  destinations: string[]
  image: string | null
  shipImage: string | null
  link: string
  itinerary?: ItineraryStop[]
  brand?: VoyageBrand | null
  ship?: VoyageShip | null
}

interface VoyageData {
  total: number
  locale?: string
  voyages: Voyage[]
}

interface WidgetState {
  view: "carousel" | "detail"
  selectedIndex: number
}

function App() {
  const data = useToolOutput<VoyageData>()
  const displayMode = useDisplayMode()
  useAutoResize()

  // Set locale from server response
  if (data?.locale) setLocale(data.locale)

  const [state, setState] = useState<WidgetState>(() => {
    const saved = window.openai?.widgetState as WidgetState | undefined
    return saved?.view ? saved : { view: "carousel", selectedIndex: 0 }
  })

  const selectVoyage = useCallback(async (index: number) => {
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
    return <div style={styles.empty}>{t("loading_voyages")}</div>
  }
  if (!data.voyages?.length) {
    return <div style={styles.empty}>{t("no_voyages")}</div>
  }

  // Fullscreen master-detail view
  if (state.view === "detail" && displayMode === "fullscreen") {
    const selected = data.voyages[state.selectedIndex] ?? data.voyages[0]
    return (
      <div style={styles.fullscreen}>
        <div style={styles.sidebar}>
          <button onClick={backToCarousel} style={styles.backBtn}>
            <ChevronLeft size={16} /> {t("back_to_chat")}
          </button>
          <div style={styles.sidebarTitle}>
            {data.total > data.voyages.length
              ? t("showing_of", { count: data.voyages.length, total: data.total.toLocaleString() })
              : t("voyages_found", { count: data.voyages.length })}
          </div>
          <div style={styles.sidebarList}>
            {data.voyages.map((v, i) => (
              <SidebarItem
                key={i}
                voyage={v}
                locale={data.locale}
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
          <VoyageDetail voyage={selected} />
        </div>
      </div>
    )
  }

  // Inline carousel view
  const summary = data.total > data.voyages.length
    ? t("showing_of", { count: data.voyages.length, total: data.total.toLocaleString() })
    : t("voyages_found", { count: data.voyages.length })

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{summary}</div>
      <VoyageCarousel voyages={data.voyages} onSelectVoyage={selectVoyage} />
    </div>
  )
}

function SidebarItem({ voyage: v, locale, selected, onClick }: {
  voyage: Voyage; locale?: string; selected: boolean; onClick: () => void
}) {
  const price = v.price ? `$${Number(v.price).toLocaleString()}` : null
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
        {v.image ? (
          <img src={v.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Anchor size={20} color="rgba(255,255,255,0.3)" />
        )}
      </div>
      <div style={styles.sidebarItemBody}>
        <div style={styles.sidebarItemTitle}>{v.name}</div>
        <div style={styles.sidebarItemMeta}>
          <Ship size={11} /> {v.shipName}
        </div>
        <div style={styles.sidebarItemMeta}>
          <Calendar size={11} /> {formatDate(v.sailDate, locale)} · {t("nights", { n: v.nights })}
        </div>
        {price && (
          <div style={styles.sidebarItemPrice}>
            <span style={{ fontSize: 10, color: "#9ca3af", marginRight: 3 }}>{t("from_price")}</span>
            {price}
          </div>
        )}
      </div>
    </button>
  )
}

function formatDate(s: string, locale?: string) {
  try {
    const loc = locale === "zh-TW" || locale === "zh-CN" ? "zh" : locale ?? "en"
    return new Date(s + "T00:00:00").toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })
  } catch { return s }
}

const styles: Record<string, React.CSSProperties> = {
  empty: { textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 },
  fullscreen: {
    display: "flex", height: "100vh", width: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#fafaf7", color: "#1a1a2e",
  },
  sidebar: {
    width: 320, minWidth: 320, height: "100%",
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
  sidebarItemPrice: {
    fontSize: 13, fontWeight: 600, color: "#d4aa4f", marginTop: 2,
  },
  detailPanel: { flex: 1, overflowY: "auto", height: "100%" },
}

createRoot(document.getElementById("root")!).render(<App />)
