import type { Textbox } from 'fabric'
import { evaluateAnimation } from './animationPresets'
import type { TextLayerState } from '../canvas/layerModel'

/**
 * Applies the layer's animation at a given normalized progress (0..1) to a live Fabric
 * Textbox. Used identically by the rAF preview loop and the deterministic frame exporter —
 * only the progress source differs between the two callers.
 */
export function applyAnimatedState(obj: Textbox, layer: TextLayerState, progress: number): void {
  const { animation } = layer
  if (animation.presetId === 'none') return

  const result = evaluateAnimation(
    animation.presetId,
    progress,
    animation.params,
    animation.seed,
    layer.left,
    layer.top,
    layer.text.length,
    animation.durationMs
  )

  if (result.visibleCharCount !== undefined) {
    // Freeze the box width so revealing characters doesn't reflow/resize the textbox.
    obj.set('width', layer.width)
    obj.set('text', layer.text.slice(0, result.visibleCharCount))
  }

  obj.set({
    ...(result.left !== undefined ? { left: result.left } : {}),
    ...(result.top !== undefined ? { top: result.top } : {}),
    ...(result.opacity !== undefined ? { opacity: result.opacity } : {}),
    ...(result.scaleX !== undefined ? { scaleX: layer.scaleX * result.scaleX } : {}),
    ...(result.scaleY !== undefined ? { scaleY: layer.scaleY * result.scaleY } : {}),
    ...(result.skewX !== undefined ? { skewX: result.skewX } : {}),
    ...(result.fill !== undefined ? { fill: result.fill } : {})
  })
}

/** Resets a Textbox back to the layer's static (non-animated) base state. */
export function resetAnimatedState(obj: Textbox, layer: TextLayerState): void {
  obj.set({
    text: layer.text,
    left: layer.left,
    top: layer.top,
    opacity: layer.opacity,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    skewX: 0,
    fill: layer.fill
  })
}
