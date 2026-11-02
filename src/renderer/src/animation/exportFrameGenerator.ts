import {
  prepareExportBackground,
  compositeExportFrame,
  compositeExportFrameFinal,
  renderBackgroundCanvas,
  preloadImageLayers,
  loadImage
} from '../canvas/exportRenderer'
import type { ExportContext, PreparedExportBackground } from '../canvas/exportRenderer'
import { EffectsPipeline } from '../effects/effectsPipeline'
import { snapToSeamlessLoop } from './loopUtils'

export interface FrameExportOptions {
  fps: number
  durationMs: number
}

/** Default export duration: covers every animated layer's delay+duration in full, or
 *  (when no text is animated but the motion effect is) three of its loop cycles. */
export function computeDefaultDurationMs(ctx: ExportContext): number {
  const durations = ctx.textLayers
    .filter((l) => l.animation.presetId !== 'none')
    .map((l) => l.animation.delayMs + l.animation.durationMs)
  if (durations.length > 0) return Math.max(...durations)
  if (ctx.effects.motion.enabled && ctx.effects.motion.speed > 0) {
    return Math.round(3 * (1000 / ctx.effects.motion.speed))
  }
  return 1500
}

function buildProgressByLayerId(ctx: ExportContext, frameTimeMs: number): Map<string, number> {
  const progressByLayerId = new Map<string, number>()
  for (const layer of ctx.textLayers) {
    if (layer.animation.presetId === 'none') continue
    const { delayMs, durationMs } = layer.animation
    const progress =
      frameTimeMs < delayMs ? 0 : Math.min(1, (frameTimeMs - delayMs) / Math.max(1, durationMs))
    progressByLayerId.set(layer.id, progress)
  }
  return progressByLayerId
}

/**
 * Renders a deterministic sequence of frames for animated export (GIF/WebM/MP4).
 * Frame progress is derived from frameIndex/fps, never wall-clock time, so re-running an
 * export on the same project produces identical frames every time.
 */
export async function generateExportFrames(
  ctx: ExportContext,
  options: FrameExportOptions,
  onProgress?: (frameIndex: number, totalFrames: number) => void
): Promise<HTMLCanvasElement[]> {
  const needsPerFrameBackground = ctx.effects.motion.enabled || ctx.effectsAffectText
  const frames: HTMLCanvasElement[] = []

  if (!needsPerFrameBackground) {
    // Fast path: background rendered once and reused across every frame, since only
    // text-layer properties change between frames.
    const totalFrames = Math.max(1, Math.round((options.durationMs / 1000) * options.fps))
    const background = await prepareExportBackground(ctx)
    try {
      const preloadedImages = await preloadImageLayers(ctx.imageLayers)
      for (let i = 0; i < totalFrames; i++) {
        const frameTimeMs = (i / options.fps) * 1000
        frames.push(
          compositeExportFrame(background, ctx, buildProgressByLayerId(ctx, frameTimeMs), preloadedImages)
        )
        onProgress?.(i + 1, totalFrames)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    } finally {
      background.dispose()
    }
    return frames
  }

  // Animated-background path: the motion effect and/or the shared text/border effects
  // pass need a fresh WebGL render every frame, so one pipeline is kept alive across the
  // whole loop instead of recreating a WebGL context per frame.
  const effectiveDurationMs = ctx.effects.motion.enabled
    ? snapToSeamlessLoop(options.durationMs, ctx.effects.motion.speed)
    : options.durationMs
  const totalFrames = Math.max(1, Math.round((effectiveDurationMs / 1000) * options.fps))

  const backgroundPipeline = new EffectsPipeline()
  const sharedEffectsPipeline = ctx.effectsAffectText ? new EffectsPipeline() : null
  const img = await loadImage(ctx.sourceImage.data)
  const preloadedImages = await preloadImageLayers(ctx.imageLayers)

  try {
    for (let i = 0; i < totalFrames; i++) {
      const frameTimeMs = (i / options.fps) * 1000
      const timeSec = frameTimeMs / 1000

      const bgCanvas = await renderBackgroundCanvas(backgroundPipeline, img, ctx, timeSec)
      const background: PreparedExportBackground = {
        effectsCanvas: bgCanvas,
        width: bgCanvas.width,
        height: bgCanvas.height,
        dispose: () => {}
      }

      const frame = await compositeExportFrameFinal(
        background,
        ctx,
        buildProgressByLayerId(ctx, frameTimeMs),
        preloadedImages,
        sharedEffectsPipeline,
        timeSec
      )
      frames.push(frame)
      onProgress?.(i + 1, totalFrames)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  } finally {
    backgroundPipeline.dispose()
    sharedEffectsPipeline?.dispose()
  }

  return frames
}
