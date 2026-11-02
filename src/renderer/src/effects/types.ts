export type RGB = [number, number, number]

export interface AnalogSettings {
  grainAmount: number // 0-1
  grainSize: number // 0.5-4 px cell scale
  grainMono: number // 0 = colored grain, 1 = monochrome grain
  vignetteAmount: number // 0-1
  vignetteSoftness: number // 0-1
  vignetteColor: RGB
  halationAmount: number // 0-1
  duotoneAmount: number // 0-1
  duotoneShadow: RGB
  duotoneHighlight: RGB
}

export interface GlitchSettings {
  caAmount: number // 0-1
  caAngle: number // radians
  scanlineAmount: number // 0-1
  scanlineSpacing: number // px
  staticAmount: number // 0-1
  waveAmount: number // 0-0.05 uv units
  waveFrequency: number // cycles across image height
  lightTrailAmount: number // 0-1
  lightTrailAngle: number // radians
  pixelSort: {
    enabled: boolean
    thresholdLow: number // 0-1
    thresholdHigh: number // 0-1
    direction: 'horizontal' | 'vertical'
  }
  datamosh: {
    enabled: boolean
    blockSize: number // px
    probability: number // 0-1
    maxOffset: number // px
  }
}

export interface AdjustmentSettings {
  brightness: number // -0.5..0.5, additive
  contrast: number // 0.5..1.5, 1 = none
  saturation: number // 0..2, 1 = none
}

export interface ColorRemapSettings {
  enabled: boolean
  sourceHue: number // 0-1 fraction of 360°
  tolerance: number // 0-1, half-width of the affected hue band
  targetHue: number // 0-1 fraction of 360°
  strength: number // 0-1
}

export interface MotionSettings {
  enabled: boolean
  density: number // 2-60 line bands across the image
  speed: number // cycles/sec of scroll, also drives export loop snapping
  amplitude: number // 0-0.1, perpendicular wobble magnitude (uv units)
  thickness: number // 0-1, fraction of each band cycle that's lit
  angle: number // radians, band orientation
  color: RGB
  strength: number // 0-1, additive blend amount
}

export interface EffectsSettings {
  analog: AnalogSettings
  glitch: GlitchSettings
  adjustments: AdjustmentSettings
  colorRemap: ColorRemapSettings
  motion: MotionSettings
  /** Reseeded per preview frame (animated static) or per export frame (deterministic). */
  seed: number
}

export const DEFAULT_ANALOG: AnalogSettings = {
  grainAmount: 0,
  grainSize: 1.2,
  grainMono: 1,
  vignetteAmount: 0,
  vignetteSoftness: 0.5,
  vignetteColor: [0, 0, 0],
  halationAmount: 0,
  duotoneAmount: 0,
  duotoneShadow: [0.02, 0.0, 0.0],
  duotoneHighlight: [1.0, 0.1, 0.1]
}

export const DEFAULT_GLITCH: GlitchSettings = {
  caAmount: 0,
  caAngle: 0,
  scanlineAmount: 0,
  scanlineSpacing: 3,
  staticAmount: 0,
  waveAmount: 0,
  waveFrequency: 12,
  lightTrailAmount: 0,
  lightTrailAngle: 0,
  pixelSort: {
    enabled: false,
    thresholdLow: 0.2,
    thresholdHigh: 0.8,
    direction: 'horizontal'
  },
  datamosh: {
    enabled: false,
    blockSize: 24,
    probability: 0.12,
    maxOffset: 60
  }
}

export const DEFAULT_ADJUSTMENTS: AdjustmentSettings = {
  brightness: 0,
  contrast: 1,
  saturation: 1
}

export const DEFAULT_COLOR_REMAP: ColorRemapSettings = {
  enabled: false,
  sourceHue: 210 / 360,
  tolerance: 30 / 360,
  targetHue: 0,
  strength: 0.8
}

export const DEFAULT_MOTION: MotionSettings = {
  enabled: false,
  density: 14,
  speed: 0.6,
  amplitude: 0.02,
  thickness: 0.12,
  angle: 0,
  color: [1, 1, 1],
  strength: 0.5
}

export function defaultEffectsSettings(): EffectsSettings {
  return {
    analog: { ...DEFAULT_ANALOG },
    glitch: {
      ...DEFAULT_GLITCH,
      pixelSort: { ...DEFAULT_GLITCH.pixelSort },
      datamosh: { ...DEFAULT_GLITCH.datamosh }
    },
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    colorRemap: { ...DEFAULT_COLOR_REMAP },
    motion: { ...DEFAULT_MOTION, color: [...DEFAULT_MOTION.color] as RGB },
    seed: Math.random() * 1000
  }
}
