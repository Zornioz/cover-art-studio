import { nextId } from './layerModel'

export interface ImageLayerState {
  id: string
  data: string // base64 data URL
  naturalWidth: number
  naturalHeight: number
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  opacity: number
  visible: boolean
  /** SVG path data (M/L/Z grammar only), in canvas-absolute coordinates, or null for no cutout. */
  maskPath: string | null
  /** Z-order across BOTH text and image layers — lower draws first (further back). */
  order: number
}

export function createImageLayer(partial: Partial<ImageLayerState> & { data: string; naturalWidth: number; naturalHeight: number }): ImageLayerState {
  return {
    id: nextId('image'),
    left: 0,
    top: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    opacity: 1,
    visible: true,
    maskPath: null,
    order: 0,
    ...partial
  }
}
