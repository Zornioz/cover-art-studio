import { mulberry32 } from '../effects/cpu/seededRandom'

export type AnimationPresetId =
  | 'none'
  | 'fade-in'
  | 'slide-in'
  | 'typewriter'
  | 'glitch-jitter'
  | 'pulse'
  | 'flicker'
  | 'color-shift'

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom'

export interface AnimationParams {
  direction: SlideDirection
  distance: number // px, slide-in
  amplitude: number // px (jitter) or scale fraction (pulse)
  cycles: number // pulse: sine cycles over the duration
  colorFrom: string
  colorTo: string
  stepsPerSecond: number // glitch-jitter / flicker step rate
}

export interface LayerAnimationState {
  presetId: AnimationPresetId
  durationMs: number
  delayMs: number
  seed: number
  params: AnimationParams
}

export const DEFAULT_ANIMATION_PARAMS: AnimationParams = {
  direction: 'left',
  distance: 120,
  amplitude: 8,
  cycles: 3,
  colorFrom: '#ff3b3b',
  colorTo: '#ffffff',
  stepsPerSecond: 12
}

export const ANIMATION_PRESET_LABELS: Record<AnimationPresetId, string> = {
  none: 'Keine',
  'fade-in': 'Fade In',
  'slide-in': 'Slide In',
  typewriter: 'Typewriter',
  'glitch-jitter': 'Glitch Jitter',
  pulse: 'Pulse',
  flicker: 'Flicker',
  'color-shift': 'Color Shift'
}

export const ANIMATION_PRESET_IDS: AnimationPresetId[] = [
  'none',
  'fade-in',
  'slide-in',
  'typewriter',
  'glitch-jitter',
  'pulse',
  'flicker',
  'color-shift'
]

export function defaultAnimation(): LayerAnimationState {
  return {
    presetId: 'none',
    durationMs: 1200,
    delayMs: 0,
    seed: Math.floor(Math.random() * 100000),
    params: { ...DEFAULT_ANIMATION_PARAMS }
  }
}

export interface AnimatedProps {
  left?: number
  top?: number
  opacity?: number
  scaleX?: number
  scaleY?: number
  skewX?: number
  fill?: string
  visibleCharCount?: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const pa = parseInt(hexA.slice(1), 16)
  const pb = parseInt(hexB.slice(1), 16)
  const ar = (pa >> 16) & 255
  const ag = (pa >> 8) & 255
  const ab = pa & 255
  const br = (pb >> 16) & 255
  const bg = (pb >> 8) & 255
  const bb = pb & 255
  const r = Math.round(lerp(ar, br, t))
  const g = Math.round(lerp(ag, bg, t))
  const b = Math.round(lerp(ab, bb, t))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Pure function: (base state, normalized progress, params, seed) -> property overrides.
 * The SAME function drives both the live rAF preview and the deterministic frame-by-frame
 * export — only how `progress` is computed differs (wall-clock vs frameIndex/totalFrames).
 * Never use Math.random() here; use the seeded PRNG so re-exports are bit-identical.
 */
export function evaluateAnimation(
  presetId: AnimationPresetId,
  progress: number,
  params: AnimationParams,
  seed: number,
  baseLeft: number,
  baseTop: number,
  textLength: number,
  durationMs: number
): AnimatedProps {
  const t = Math.min(1, Math.max(0, progress))
  const totalSteps = Math.max(1, Math.round((durationMs / 1000) * params.stepsPerSecond))

  switch (presetId) {
    case 'none':
      return {}

    case 'fade-in':
      return { opacity: easeOutCubic(t) }

    case 'slide-in': {
      const e = easeOutCubic(t)
      const dx =
        params.direction === 'left' ? -params.distance : params.direction === 'right' ? params.distance : 0
      const dy =
        params.direction === 'top' ? -params.distance : params.direction === 'bottom' ? params.distance : 0
      return {
        left: lerp(baseLeft + dx, baseLeft, e),
        top: lerp(baseTop + dy, baseTop, e),
        opacity: easeOutCubic(t)
      }
    }

    case 'typewriter':
      return { visibleCharCount: Math.round(t * textLength) }

    case 'pulse': {
      const s = 1 + params.amplitude * 0.02 * Math.sin(t * Math.PI * 2 * params.cycles)
      return { scaleX: s, scaleY: s }
    }

    case 'glitch-jitter': {
      const step = Math.floor(t * totalSteps)
      const rand = mulberry32(seed + step * 7919)
      const jx = (rand() * 2 - 1) * params.amplitude
      const jy = (rand() * 2 - 1) * params.amplitude
      const skew = (rand() * 2 - 1) * 6
      return { left: baseLeft + jx, top: baseTop + jy, skewX: skew }
    }

    case 'flicker': {
      const step = Math.floor(t * totalSteps)
      const rand = mulberry32(seed + step * 104729)
      const on = rand() > 0.35
      return { opacity: on ? 1 : rand() * 0.3 }
    }

    case 'color-shift':
      return { fill: lerpColor(params.colorFrom, params.colorTo, (Math.sin(t * Math.PI * 2) + 1) / 2) }

    default:
      return {}
  }
}
