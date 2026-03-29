import { useState, useEffect } from "react"

/** Unwrap data — handles string JSON, double-wrapped structuredContent, etc. */
function unwrap<T>(raw: unknown): T | null {
  if (raw == null) return null
  let obj = raw
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj) } catch { return null }
  }
  if (typeof obj !== "object") return null
  const sc = (obj as Record<string, unknown>).structuredContent
  if (sc && typeof sc === "object") return sc as T
  return obj as T
}

/** Listen for tool results from ChatGPT host */
export function useToolOutput<T>(): T | null {
  const [data, setData] = useState<T | null>(() => {
    return unwrap<T>(window.openai?.toolOutput)
  })

  useEffect(() => {
    const onGlobals = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const d = unwrap<T>(detail?.globals?.toolOutput)
      if (d) setData(d)
    }

    const onMessage = (e: MessageEvent) => {
      const msg = e.data
      if (!msg) return
      if (msg.jsonrpc === "2.0" && msg.method === "ui/notifications/tool-result") {
        const d = unwrap<T>(msg.params?.structuredContent) ?? unwrap<T>(msg.params)
        if (d) setData(d)
        return
      }
      if (msg.type === "tool_result" || msg.type === "structuredContent") {
        const d = unwrap<T>(msg.data ?? msg.structuredContent ?? msg)
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

/** Track display mode changes */
export function useDisplayMode() {
  const [mode, setMode] = useState<string>(() => window.openai?.displayMode ?? "inline")

  useEffect(() => {
    const check = () => {
      const m = window.openai?.displayMode
      if (m) setMode(m)
    }
    // Poll for mode changes since there's no dedicated event
    const interval = setInterval(check, 300)
    window.addEventListener("openai:set_globals", check, { passive: true })
    return () => {
      clearInterval(interval)
      window.removeEventListener("openai:set_globals", check)
    }
  }, [])

  return mode
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
