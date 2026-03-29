import { createRoot } from "react-dom/client"
import { useToolOutput, useAutoResize } from "./hooks"
import { VoyageCarousel } from "./VoyageCarousel"

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

interface VoyageData {
  total: number
  voyages: Voyage[]
}

function App() {
  const data = useToolOutput<VoyageData>()
  useAutoResize()

  if (!data) {
    return <div style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 }}>Loading voyages…</div>
  }

  if (!data.voyages?.length) {
    return <div style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 }}>No voyages found matching your criteria.</div>
  }

  const summary = data.total > data.voyages.length
    ? `Showing ${data.voyages.length} of ${data.total.toLocaleString()} voyages`
    : `${data.voyages.length} voyage${data.voyages.length > 1 ? "s" : ""} found`

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{summary}</div>
      <VoyageCarousel voyages={data.voyages} />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
