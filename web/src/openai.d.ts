/** OpenAI Apps SDK — window.openai type declarations */

type DisplayMode = "inline" | "pip" | "fullscreen"

interface OpenAIHost {
  displayMode: DisplayMode
  requestDisplayMode(args: { mode: DisplayMode }): Promise<{ mode: DisplayMode }>
  widgetState: unknown
  setWidgetState(state: unknown): void
  toolOutput: unknown
  toolInput: unknown
  theme: string
  locale: string
  maxHeight: number
  openExternal(args: { href: string }): void
}

interface Window {
  openai?: OpenAIHost
}
