import type { EffectPreset } from './types'

export const glitchPresets: EffectPreset[] = [
  {
    id: 'vhs-static',
    label: 'VHS Static',
    category: 'glitch',
    analog: {
      grainAmount: 0.06,
      grainMono: 0.6
    },
    glitch: {
      caAmount: 0.25,
      caAngle: 0,
      scanlineAmount: 0.35,
      scanlineSpacing: 2,
      staticAmount: 0.15,
      waveAmount: 0.004,
      waveFrequency: 20
    }
  },
  {
    id: 'datamosh-chaos',
    label: 'Datamosh Chaos',
    category: 'glitch',
    analog: {},
    glitch: {
      caAmount: 0.4,
      caAngle: 0.3,
      datamosh: {
        enabled: true,
        blockSize: 28,
        probability: 0.22,
        maxOffset: 80
      }
    }
  },
  {
    id: 'pixel-sort-storm',
    label: 'Pixel Sort Storm',
    category: 'glitch',
    analog: {},
    glitch: {
      pixelSort: {
        enabled: true,
        thresholdLow: 0.35,
        thresholdHigh: 0.95,
        direction: 'vertical'
      }
    }
  },
  {
    id: 'crt-scanlines',
    label: 'CRT Scanlines',
    category: 'glitch',
    analog: {
      vignetteAmount: 0.3,
      vignetteSoftness: 0.5,
      vignetteColor: [0, 0, 0]
    },
    glitch: {
      scanlineAmount: 0.5,
      scanlineSpacing: 3,
      caAmount: 0.15,
      caAngle: 0
    }
  }
]
