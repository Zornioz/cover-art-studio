export type BorderStyleId =
  | 'none'
  | 'minimal'
  | 'polaroid'
  | 'gradient'
  | 'duotone-match'
  | 'filmstrip'
  | 'rounded-card'

export interface BorderParams {
  color: string
  color2: string
  widthRatio: number // border width as a fraction of the shorter canvas side
  radiusRatio: number // corner radius as a fraction of width (rounded-card only)
}

export interface BorderDefinition {
  id: BorderStyleId
  label: string
  description: string
  defaultParams: BorderParams
  supportsRadius: boolean
  supportsSecondColor: boolean
}

export const DEFAULT_BORDER_PARAMS: BorderParams = {
  color: '#ffffff',
  color2: '#ff3b3b',
  widthRatio: 0.03,
  radiusRatio: 0.04
}

export const borderDefinitions: BorderDefinition[] = [
  {
    id: 'none',
    label: 'Kein Rahmen',
    description: 'Keine Umrandung.',
    defaultParams: DEFAULT_BORDER_PARAMS,
    supportsRadius: false,
    supportsSecondColor: false
  },
  {
    id: 'minimal',
    label: 'Schlank',
    description: 'Dünner, moderner Rand in einer Farbe.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, widthRatio: 0.015 },
    supportsRadius: false,
    supportsSecondColor: false
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    description: 'Weißer Rand mit breiterem unteren Steg.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, color: '#f5f5f0', widthRatio: 0.06 },
    supportsRadius: false,
    supportsSecondColor: false
  },
  {
    id: 'gradient',
    label: 'Gradient',
    description: 'Farbverlauf als Rahmen.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, widthRatio: 0.03 },
    supportsRadius: false,
    supportsSecondColor: true
  },
  {
    id: 'duotone-match',
    label: 'Duotone-passend',
    description: 'Gradient-Rand, abgestimmt auf die Duotone-Effektfarben.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, widthRatio: 0.025 },
    supportsRadius: false,
    supportsSecondColor: false
  },
  {
    id: 'filmstrip',
    label: 'Filmstreifen',
    description: 'Schwarzer Rand mit Perforationslöchern oben und unten.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, color: '#0a0a0a', widthRatio: 0.07 },
    supportsRadius: false,
    supportsSecondColor: false
  },
  {
    id: 'rounded-card',
    label: 'Abgerundete Karte',
    description: 'Abgerundete Ecken mit weichem Schatten.',
    defaultParams: { ...DEFAULT_BORDER_PARAMS, widthRatio: 0, radiusRatio: 0.05 },
    supportsRadius: true,
    supportsSecondColor: false
  }
]

export function getBorderDefinition(id: BorderStyleId): BorderDefinition {
  return borderDefinitions.find((b) => b.id === id) ?? borderDefinitions[0]
}
