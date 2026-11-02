export interface ProjectFile {
  formatVersion: 1
  appVersion: string
  name: string
  sourceImage: {
    data: string // base64 data URL, embedded so the project file is self-contained
    width: number
    height: number
    fileName: string
  } | null
  effects: {
    analog: Record<string, number | string | boolean | number[]>
    glitch: Record<string, unknown>
    adjustments?: Record<string, number>
    colorRemap?: Record<string, unknown>
    motion?: Record<string, unknown>
    seed: number
  }
  border: {
    styleId: string
    params: Record<string, number | string>
  }
  canvasFormat?: Record<string, unknown>
  effectsAffectText?: boolean
  /** With effectsAffectText on: apply the effects to the text layers only. */
  effectsTextOnly?: boolean
  textLayers: Record<string, unknown>[]
  imageLayers?: Record<string, unknown>[]
  /** PNG data URL per painted-on maskable effect group (see MaskableEffectGroup). */
  paintMasks?: Partial<Record<string, string>>
}
