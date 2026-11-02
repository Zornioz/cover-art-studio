import type { EffectPreset } from './types'

/**
 * Recreates the "red power-line" reference look: near-black shadows, saturated red
 * highlights, scattered static/sparkle noise, a touch of directional light-trail blur
 * on bright wires, light scanlines, and a soft vignette.
 */
export const redPowerlinePreset: EffectPreset = {
  id: 'red-powerline-static',
  label: 'Red Power-Line',
  category: 'combo',
  analog: {
    grainAmount: 0.05,
    grainSize: 1,
    grainMono: 0.7,
    vignetteAmount: 0.35,
    vignetteSoftness: 0.55,
    vignetteColor: [0, 0, 0],
    halationAmount: 0.15,
    duotoneAmount: 0.95,
    duotoneShadow: [0.04, 0.0, 0.0],
    duotoneHighlight: [1.0, 0.08, 0.08]
  },
  glitch: {
    caAmount: 0.1,
    caAngle: 0.0,
    scanlineAmount: 0.18,
    scanlineSpacing: 2,
    staticAmount: 0.3,
    waveAmount: 0,
    waveFrequency: 10,
    lightTrailAmount: 0.3,
    lightTrailAngle: Math.PI / 2.1
  }
}
