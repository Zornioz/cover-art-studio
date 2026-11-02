export type CanvasFormatMode = 'original' | 'preset' | 'custom'

export interface CanvasFormatPreset {
  id: string
  label: string
  width: number
  height: number
}

export const CANVAS_FORMAT_PRESETS: CanvasFormatPreset[] = [
  { id: 'ig-post', label: 'Instagram Post (1:1)', width: 1080, height: 1080 },
  { id: 'ig-story', label: 'Story / Reel (9:16)', width: 1080, height: 1920 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail (16:9)', width: 1280, height: 720 }
]

export interface CanvasFormatState {
  mode: CanvasFormatMode
  presetId: string | null
  customWidth: number
  customHeight: number
  /** 0-1, UI-normalized; mapped to a px blur radius at render time. */
  bleedBlur: number
}

export const DEFAULT_CANVAS_FORMAT: CanvasFormatState = {
  mode: 'original',
  presetId: null,
  customWidth: 1080,
  customHeight: 1350,
  bleedBlur: 0.5
}

export function getCanvasFormatPreset(id: string | null): CanvasFormatPreset {
  return CANVAS_FORMAT_PRESETS.find((p) => p.id === id) ?? CANVAS_FORMAT_PRESETS[0]
}

/** Reference canvas dimension the bleedBlur UI slider (0-1) was calibrated against. */
const BLEED_BLUR_REFERENCE_DIM = 900

/** Converts the 0-1 UI bleedBlur value into a px blur radius, scaled so the blur looks
 *  the same amount of "blurred" whether applied at preview resolution or at full
 *  export resolution (otherwise a fixed px radius looks negligible on a large export). */
export function resolveBleedBlurPx(bleedBlur: number, referenceDim: number): number {
  return bleedBlur * 40 * (referenceDim / BLEED_BLUR_REFERENCE_DIM)
}

export function resolveOutputSize(
  fmt: CanvasFormatState,
  source: { width: number; height: number }
): { width: number; height: number } {
  if (fmt.mode === 'preset') {
    const p = getCanvasFormatPreset(fmt.presetId)
    return { width: p.width, height: p.height }
  }
  if (fmt.mode === 'custom') {
    return { width: Math.max(1, Math.round(fmt.customWidth)), height: Math.max(1, Math.round(fmt.customHeight)) }
  }
  return { width: source.width, height: source.height }
}
