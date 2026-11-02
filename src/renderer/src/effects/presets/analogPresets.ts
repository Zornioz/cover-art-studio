import type { EffectPreset } from './types'

export const analogPresets: EffectPreset[] = [
  {
    id: 'kodak-warm',
    label: 'Kodak Warm',
    category: 'analog',
    analog: {
      grainAmount: 0.08,
      grainSize: 1.2,
      grainMono: 0.3,
      vignetteAmount: 0.3,
      vignetteSoftness: 0.6,
      vignetteColor: [0.05, 0.02, 0],
      halationAmount: 0.25,
      duotoneAmount: 0.18,
      duotoneShadow: [0.05, 0.02, 0.0],
      duotoneHighlight: [1.0, 0.75, 0.4]
    },
    glitch: {}
  },
  {
    id: 'classic-bw-grain',
    label: 'Classic B&W Grain',
    category: 'analog',
    analog: {
      grainAmount: 0.14,
      grainSize: 1.0,
      grainMono: 1,
      vignetteAmount: 0.35,
      vignetteSoftness: 0.5,
      vignetteColor: [0, 0, 0],
      halationAmount: 0,
      duotoneAmount: 1,
      duotoneShadow: [0.03, 0.03, 0.03],
      duotoneHighlight: [0.95, 0.95, 0.92]
    },
    glitch: {}
  },
  {
    id: 'faded-matte',
    label: 'Faded Matte',
    category: 'analog',
    analog: {
      grainAmount: 0.05,
      grainSize: 1.5,
      grainMono: 0.5,
      vignetteAmount: 0.15,
      vignetteSoftness: 0.8,
      vignetteColor: [0.1, 0.1, 0.12],
      halationAmount: 0.1,
      duotoneAmount: 0.12,
      duotoneShadow: [0.12, 0.12, 0.14],
      duotoneHighlight: [0.95, 0.92, 0.85]
    },
    glitch: {}
  }
]
