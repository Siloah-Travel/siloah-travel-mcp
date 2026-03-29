import { useState, useEffect } from "react"

/** Listen for tool results from ChatGPT host — supports both MCP bridge and window.openai */
export function useToolOutput<T>(): T | null {
  const [data, setData] = useState<T | null>(() => {
    // ChatGPT shortcut: data available immediately
    const w = window as unknown as { openai?: { toolOutput?: T } }
    return w.openai?.toolOutput ?? null
  })

  useEffect(() => {
    // ChatGPT event: openai:set_globals
    const onGlobals = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const d = detail?.globals?.toolOutput as T | undefined
      if (d) setData(d)
    }

    // MCP Apps bridge: ui/notifications/tool-result
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return
      const msg = e.data
      if (!msg || msg.jsonrpc !== "2.0") return
      if (msg.method === "ui/notifications/tool-result") {
        const d = msg.params?.structuredContent as T | undefined
        if (d) setData(d)
      }
    }

    window.addEventListener("openai:set_globals", onGlobals, { passive: true })
    window.addEventListener("message", onMessage, { passive: true })
    return () => {
      window.removeEventListener("openai:set_globals", onGlobals)
      window.removeEventListener("message", onMessage)
    }
  }, [])

  return data
}

/** Report widget height to host for auto-sizing */
export function useAutoResize() {
  useEffect(() => {
    const report = () => {
      const h = Math.ceil(document.documentElement.getBoundingClientRect().height)
      window.parent.postMessage(
        { jsonrpc: "2.0", method: "ui/notifications/size-changed", params: { height: h } },
        "*"
      )
    }
    const ro = new ResizeObserver(report)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])
}
