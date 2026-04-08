import * as esbuild from "esbuild"
import { readFileSync, writeFileSync, mkdirSync } from "fs"

const widgets = ["voyages", "ships", "brands"]

async function build() {
  for (const widget of widgets) {
    // Bundle React component into a single JS file
    const result = await esbuild.build({
      entryPoints: [`src/${widget}.tsx`],
      bundle: true,
      format: "esm",
      minify: true,
      write: false,
      jsx: "automatic",
      target: "es2020",
      external: [], // bundle everything
    })

    const js = result.outputFiles[0].text

    // Read the CSS (Tailwind + apps-sdk-ui tokens)
    let css = ""
    try {
      css = readFileSync(`src/${widget}.css`, "utf-8")
    } catch {
      // no widget-specific CSS
    }

    // Wrap into a self-contained HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>html,body{margin:0;overflow:hidden}body{overflow-y:auto;scrollbar-width:none}body::-webkit-scrollbar{display:none}${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>`

    mkdirSync("dist", { recursive: true })
    writeFileSync(`dist/${widget}.html`, html)
    console.log(`✓ dist/${widget}.html (${(html.length / 1024).toFixed(1)} KB)`)
  }
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
