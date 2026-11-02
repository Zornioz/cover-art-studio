import type { AdjustmentSettings, AnalogSettings, ColorRemapSettings, GlitchSettings, MotionSettings } from '../types'

export interface EffectPreset {
  id: string
  label: string
  category: 'analog' | 'glitch' | 'combo'
  analog: Partial<AnalogSettings>
  glitch: Partial<GlitchSettings>
  adjustments?: Partial<AdjustmentSettings>
  colorRemap?: Partial<ColorRemapSettings>
  motion?: Partial<MotionSettings>
}
