import type { EffectPreset } from './types'

/**
 * Dark artist-style combos: duotone/grain/vignette grading plus a selective hue
 * remap, so a single click pushes the image toward a specific dark aesthetic
 * (retrocore / cyberpunk / glitch) rather than just tinting it.
 */
export const darkStylePresets: EffectPreset[] = [
  {
    id: 'dark-retrocore',
    label: 'Dark Retrocore',
    category: 'combo',
    analog: {
      grainAmount: 0.08,
      grainSize: 1.1,
      grainMono: 0.5,
      vignetteAmount: 0.4,
      vignetteSoftness: 0.5,
      vignetteColor: [0, 0, 0],
      duotoneAmount: 0.6,
      duotoneShadow: [0.02, 0.0, 0.05],
      duotoneHighlight: [1.0, 0.2, 0.6]
    },
    glitch: {
      scanlineAmount: 0.2,
      scanlineSpacing: 3
    },
    colorRemap: {
      enabled: true,
      sourceHue: 210 / 360,
      tolerance: 35 / 360,
      targetHue: 320 / 360,
      strength: 0.8
    }
  },
  {
    id: 'dark-cyberpunk',
    label: 'Dark Cyberpunk',
    category: 'combo',
    analog: {
      vignetteAmount: 0.35,
      vignetteSoftness: 0.55,
      vignetteColor: [0, 0.02, 0.04],
      duotoneAmount: 0.5,
      duotoneShadow: [0, 0.02, 0.04],
      duotoneHighlight: [0.1, 1.0, 0.9]
    },
    glitch: {
      caAmount: 0.3,
      caAngle: 0
    },
    colorRemap: {
      enabled: true,
      sourceHue: 0,
      tolerance: 25 / 360,
      targetHue: 185 / 360,
      strength: 0.7
    }
  },
  {
    id: 'dark-glitch',
    label: 'Dark Glitch',
    category: 'combo',
    analog: {
      grainAmount: 0.1,
      grainSize: 1,
      grainMono: 0.8,
      vignetteAmount: 0.45,
      vignetteSoftness: 0.5,
      vignetteColor: [0, 0, 0]
    },
    glitch: {
      caAmount: 0.35,
      scanlineAmount: 0.25,
      scanlineSpacing: 2,
      staticAmount: 0.15
    },
    colorRemap: {
      enabled: true,
      sourceHue: 120 / 360,
      tolerance: 40 / 360,
      targetHue: 350 / 360,
      strength: 0.6
    }
  }
]
