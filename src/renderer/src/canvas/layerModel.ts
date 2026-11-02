import { defaultAnimation, type LayerAnimationState } from '../animation/animationPresets'

export interface TextLayerState {
  id: string
  text: string
  fontFamily: string
  fontSize: number
  fill: string
  left: number
  top: number
  width: number
  angle: number
  scaleX: number
  scaleY: number
  textAlign: 'left' | 'center' | 'right'
  fontWeight: 'normal' | 'bold'
  letterSpacing: number
  opacity: number
  animation: LayerAnimationState
  /** Z-order across BOTH text and image layers — lower draws first (further back). */
  order: number
  visible: boolean
}

let counter = 0
export function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

export function createTextLayer(partial?: Partial<TextLayerState>): TextLayerState {
  return {
    id: nextId('text'),
    text: 'Neuer Text',
    fontFamily: 'Inter',
    fontSize: 48,
    fill: '#ffffff',
    left: 60,
    top: 60,
    width: 320,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    textAlign: 'left',
    fontWeight: 'normal',
    letterSpacing: 0,
    opacity: 1,
    animation: defaultAnimation(),
    order: 0,
    visible: true,
    ...partial
  }
}
