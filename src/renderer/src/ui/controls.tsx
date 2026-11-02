import type { ReactNode } from 'react'

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const to255 = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to255(r)}${to255(g)}${to255(b)}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Hue only, as a 0-1 fraction of 360°. Used by the color-remap UI so users pick
 *  a swatch ("blue") instead of dialing in a raw hue angle. */
export function hueFromHex(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const maxc = Math.max(r, g, b)
  const minc = Math.min(r, g, b)
  const d = maxc - minc
  if (d < 0.0001) return 0
  let h: number
  if (maxc === r) h = ((g - b) / d) % 6
  else if (maxc === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h /= 6
  return h < 0 ? h + 1 : h
}

/** Inverse of hueFromHex, for rendering a representative swatch color from a stored hue. */
export function hexFromHue(hue: number): string {
  return rgbToHex(hslToRgb(hue, 1, 0.5))
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s <= 0.0001) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)]
}

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}): JSX.Element {
  const { label, value, min, max, step = (max - min) / 100, onChange } = props
  return (
    <label className="flex flex-col gap-1 text-xs text-white/70">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-white/40">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-app-accent"
      />
    </label>
  )
}

export function Toggle(props: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-center justify-between text-xs text-white/70">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="accent-app-accent"
      />
    </label>
  )
}

export function ColorField(props: {
  label: string
  value: [number, number, number]
  onChange: (value: [number, number, number]) => void
}): JSX.Element {
  return (
    <label className="flex items-center justify-between text-xs text-white/70">
      <span>{props.label}</span>
      <input
        type="color"
        value={rgbToHex(props.value)}
        onChange={(e) => props.onChange(hexToRgb(e.target.value))}
        className="h-6 w-10 cursor-pointer rounded border border-app-border bg-transparent"
      />
    </label>
  )
}

/** Color-swatch picker for a hue-only value (0-1 fraction of 360°) — lets users pick
 *  "blue" instead of dialing a raw hue angle; saturation/lightness of the pick are
 *  discarded, only the hue is kept. */
export function HueField(props: {
  label: string
  value: number
  onChange: (hue: number) => void
}): JSX.Element {
  return (
    <label className="flex items-center justify-between text-xs text-white/70">
      <span>{props.label}</span>
      <input
        type="color"
        value={hexFromHue(props.value)}
        onChange={(e) => props.onChange(hueFromHex(e.target.value))}
        className="h-6 w-10 cursor-pointer rounded border border-app-border bg-transparent"
      />
    </label>
  )
}

export function Section(props: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-2 border-b border-app-border px-3 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {props.title}
      </h3>
      <div className="flex flex-col gap-2.5">{props.children}</div>
    </div>
  )
}
