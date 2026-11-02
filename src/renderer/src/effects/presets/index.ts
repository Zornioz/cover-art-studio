import { analogPresets } from './analogPresets'
import { glitchPresets } from './glitchPresets'
import { redPowerlinePreset } from './redPowerlinePreset'
import { darkStylePresets } from './darkStylePresets'
import type { EffectPreset } from './types'
import type { EffectsSettings } from '../types'
import { defaultEffectsSettings } from '../types'

export const allPresets: EffectPreset[] = [
  redPowerlinePreset,
  ...analogPresets,
  ...glitchPresets,
  ...darkStylePresets
]

export function applyPreset(preset: EffectPreset, current: EffectsSettings): EffectsSettings {
  const base = defaultEffectsSettings()
  return {
    analog: { ...base.analog, ...preset.analog },
    glitch: {
      ...base.glitch,
      ...preset.glitch,
      pixelSort: { ...base.glitch.pixelSort, ...preset.glitch.pixelSort },
      datamosh: { ...base.glitch.datamosh, ...preset.glitch.datamosh }
    },
    adjustments: { ...base.adjustments, ...preset.adjustments },
    colorRemap: { ...base.colorRemap, ...preset.colorRemap },
    motion: { ...base.motion, ...preset.motion },
    seed: current.seed
  }
}

export { analogPresets, glitchPresets, redPowerlinePreset, darkStylePresets }
export type { EffectPreset }
