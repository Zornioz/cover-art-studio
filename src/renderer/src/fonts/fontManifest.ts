export type FontCategory = 'sans' | 'display' | 'glitch' | 'serif' | 'script'

export interface FontDefinition {
  id: string
  family: string
  category: FontCategory
}

export const fontManifest: FontDefinition[] = [
  { id: 'inter', family: 'Inter', category: 'sans' },
  { id: 'archivo', family: 'Archivo', category: 'sans' },
  { id: 'space-grotesk', family: 'Space Grotesk', category: 'sans' },
  { id: 'sora', family: 'Sora', category: 'sans' },
  { id: 'oswald', family: 'Oswald', category: 'sans' },

  { id: 'anton', family: 'Anton', category: 'display' },
  { id: 'bebas-neue', family: 'Bebas Neue', category: 'display' },
  { id: 'permanent-marker', family: 'Permanent Marker', category: 'display' },
  { id: 'rubik-mono-one', family: 'Rubik Mono One', category: 'display' },

  { id: 'vt323', family: 'VT323', category: 'glitch' },
  { id: 'orbitron', family: 'Orbitron', category: 'glitch' },
  { id: 'press-start-2p', family: 'Press Start 2P', category: 'glitch' },

  { id: 'playfair-display', family: 'Playfair Display', category: 'serif' },
  { id: 'spectral', family: 'Spectral', category: 'serif' },
  { id: 'dm-serif-display', family: 'DM Serif Display', category: 'serif' },

  { id: 'caveat', family: 'Caveat', category: 'script' },
  { id: 'pacifico', family: 'Pacifico', category: 'script' }
]

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Modern / Sans',
  display: 'Fett / Display',
  glitch: 'Glitch / Techno',
  serif: 'Serif / Editorial',
  script: 'Schreibschrift'
}

export const DEFAULT_FONT_FAMILY = 'Inter'
