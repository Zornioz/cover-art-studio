import { useEffect } from 'react'
import type { Canvas, Textbox } from 'fabric'
import { applyAnimatedState, resetAnimatedState } from '../animation/applyAnimatedState'
import type { TextLayerState } from './layerModel'

interface LayeredTextbox extends Textbox {
  layerId?: string
}

/**
 * Single requestAnimationFrame loop driving both per-text-layer animation and the
 * continuous motion-effect clock, so the two don't become separate, competing
 * render-triggering loops (replaces the old useAnimationPreviewLoop). Only runs
 * continuously while `needsLoop` is true (a motion effect is enabled, or a text layer
 * is animating) -- otherwise nothing spins the GPU/CPU while the canvas is static.
 */
export function useLiveRenderLoop(
  fabricCanvasGetter: () => Canvas | null,
  textLayers: TextLayerState[],
  needsLoop: boolean,
  onTick: (elapsedSec: number) => void
): void {
  useEffect(() => {
    if (!needsLoop) return

    const animated = textLayers.filter((l) => l.animation.presetId !== 'none')
    let rafId = 0
    const startTime = performance.now()

    const tick = (): void => {
      const now = performance.now()
      onTick((now - startTime) / 1000)

      const canvas = fabricCanvasGetter()
      if (canvas) {
        for (const layer of animated) {
          const obj = canvas.getObjects().find((o) => (o as LayeredTextbox).layerId === layer.id) as
            | LayeredTextbox
            | undefined
          if (!obj) continue
          const cycle = layer.animation.delayMs + layer.animation.durationMs
          if (cycle <= 0) continue
          const elapsedMs = (now - startTime) % cycle
          const progress =
            elapsedMs < layer.animation.delayMs
              ? 0
              : (elapsedMs - layer.animation.delayMs) / layer.animation.durationMs
          applyAnimatedState(obj, layer, progress)
        }
        canvas.requestRenderAll()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      const canvas = fabricCanvasGetter()
      if (!canvas) return
      for (const layer of animated) {
        const obj = canvas.getObjects().find((o) => (o as LayeredTextbox).layerId === layer.id) as
          | LayeredTextbox
          | undefined
        if (obj) resetAnimatedState(obj, layer)
      }
      canvas.requestRenderAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textLayers, needsLoop])
}
