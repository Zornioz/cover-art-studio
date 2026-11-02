import './fonts.css'
import { fontManifest } from './fontManifest'

let readyPromise: Promise<void> | null = null

/**
 * Eagerly triggers glyph loading for every bundled font and resolves once all are ready.
 * Must be awaited before mounting the editor — Fabric.js renders text with whatever font
 * is already loaded at draw time, so an un-loaded @font-face silently falls back to default.
 */
export function ensureFontsReady(): Promise<void> {
  if (!readyPromise) {
    const loads = fontManifest.map((font) =>
      document.fonts.load(`16px "${font.family}"`).catch(() => {
        // Non-fatal: the browser falls back to a default font for this family.
      })
    )
    readyPromise = Promise.all(loads).then(() => document.fonts.ready).then(() => undefined)
  }
  return readyPromise
}
