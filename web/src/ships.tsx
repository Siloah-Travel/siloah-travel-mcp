import { createRoot } from "react-dom/client"
import { useToolOutput, useAutoResize } from "./hooks"
import { ShipCarousel } from "./ShipCarousel"

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

interface ShipData {
  ships: Ship[]
}

function App() {
  const data = useToolOutput<ShipData>()
  useAutoResize()

  if (!data) {
    return <div style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 }}>Loading ships…</div>
  }

  if (!data.ships?.length) {
    return <div style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 14 }}>No ships found matching your criteria.</div>
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        {data.ships.length} ship{data.ships.length > 1 ? "s" : ""} found
      </div>
      <ShipCarousel ships={data.ships} />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
