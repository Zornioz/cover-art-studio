import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_ANALOG,
  DEFAULT_COLOR_REMAP,
  DEFAULT_GLITCH,
  DEFAULT_MOTION
} from '../effects/types'
import type { EffectsSettings, RGB } from '../effects/types'
import { composeWithBleed } from './socialBleed'

export type MaskableEffectGroup = 'analog' | 'glitch' | 'colorRemap' | 'adjustments' | 'motion' | 'all'

export const MASKABLE_EFFECT_GROUPS: MaskableEffectGroup[] = [
  'analog',
  'glitch',
  'colorRemap',
  'adjustments',
  'motion',
  'all'
]

export const MASKABLE_EFFECT_GROUP_LABELS: Record<MaskableEffectGroup, string> = {
  analog: 'Film / Analog',
  glitch: 'Glitch / Digital',
  colorRemap: 'Farb-Remap',
  adjustments: 'Anpassungen',
  motion: 'Wave Lines',
  all: 'Alle Effekte'
}

/**
 * Returns a settings object identical to `effects` except group's sub-object is reset
 * to its neutral/default value -- i.e. "what the image would look like with just this
 * group turned off". 'all' is handled specially by callers (its "off" variant is the
 * raw source image, no pipeline render needed) and isn't valid here.
 */
export function effectsWithGroupNeutralized(
  effects: EffectsSettings,
  group: Exclude<MaskableEffectGroup, 'all'>
): EffectsSettings {
  switch (group) {
    case 'analog':
      return { ...effects, analog: { ...DEFAULT_ANALOG } }
    case 'glitch':
      return {
        ...effects,
        glitch: {
          ...DEFAULT_GLITCH,
          pixelSort: { ...DEFAULT_GLITCH.pixelSort },
          datamosh: { ...DEFAULT_GLITCH.datamosh }
        }
      }
    case 'colorRemap':
      return { ...effects, colorRemap: { ...DEFAULT_COLOR_REMAP } }
    case 'adjustments':
      return { ...effects, adjustments: { ...DEFAULT_ADJUSTMENTS } }
    case 'motion':
      return { ...effects, motion: { ...DEFAULT_MOTION, color: [...DEFAULT_MOTION.color] as RGB } }
  }
}

/**
 * Blends `withoutG` OVER `dest` wherever `forwardMask` is not fully opaque --
 * dest := withoutG*(1-maskG) + dest*maskG, standard draw-over alpha compositing with
 * (1-maskG) as the top layer's alpha. forwardMask's alpha channel is the mask value
 * (1 = this group's configured effect shows, 0 = the "without" variant shows).
 *
 * Verified algebraically: mix(fullEffected, withoutG, 1-maskG) == withoutG drawn with
 * alpha (1-maskG) over fullEffected. No persistently-synced inverse mask is kept --
 * inverting on the fly here is one cheap extra 2D op, acceptable since this already
 * only runs on settings/mask changes, not on every animation frame.
 */
export function blendGroupVariant(
  destCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  withoutG: CanvasImageSource,
  forwardMask: HTMLCanvasElement
): void {
  const inverted = document.createElement('canvas')
  inverted.width = w
  inverted.height = h
  const ictx = inverted.getContext('2d')
  if (!ictx) return
  ictx.fillStyle = '#fff'
  ictx.fillRect(0, 0, w, h)
  ictx.globalCompositeOperation = 'destination-out'
  ictx.drawImage(forwardMask, 0, 0, w, h)
  // inverted.alpha now holds (1 - forwardMask.alpha)

  const masked = document.createElement('canvas')
  masked.width = w
  masked.height = h
  const mctx = masked.getContext('2d')
  if (!mctx) return
  mctx.drawImage(withoutG, 0, 0, w, h)
  mctx.globalCompositeOperation = 'destination-in'
  mctx.drawImage(inverted, 0, 0, w, h)
  // masked = withoutG, alpha-weighted by (1 - forwardMask.alpha)

  destCtx.drawImage(masked, 0, 0, w, h)
}

/**
 * Creates a fully-opaque white mask canvas (the default, zero-regression starting
 * state: "this group's configured effect applies at full strength, everywhere").
 */
export function createOpaqueMask(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
  }
  return canvas
}

/** One-time 2D op: new mask = 1 - old mask. Not performance-sensitive (rare, explicit
 *  user action), so a fresh full-canvas invert is simpler than keeping a synced copy. */
export function invertMask(mask: HTMLCanvasElement): HTMLCanvasElement {
  const inverted = createOpaqueMask(mask.width, mask.height)
  const ctx = inverted.getContext('2d')
  if (ctx) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.drawImage(mask, 0, 0)
  }
  return inverted
}

/** Scales a preview-resolution mask up to the full export resolution -- done once per
 *  export (by the caller, before the frame loop), not per frame. */
export function scaleMaskToSize(mask: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  if (mask.width === w && mask.height === h) return mask
  const scaled = document.createElement('canvas')
  scaled.width = w
  scaled.height = h
  scaled.getContext('2d')?.drawImage(mask, 0, 0, w, h)
  return scaled
}

export function scaleAllMasksToSize(
  masks: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>,
  w: number,
  h: number
): Partial<Record<MaskableEffectGroup, HTMLCanvasElement>> {
  const result: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>> = {}
  for (const group of MASKABLE_EFFECT_GROUPS) {
    const mask = masks[group]
    if (mask) result[group] = scaleMaskToSize(mask, w, h)
  }
  return result
}

export interface BlendedBackgroundParams {
  canvasW: number
  canvasH: number
  /** Native resolution of the rendered variants (pre-bleed). Pass canvasW/canvasH and
   *  blurPx=0 when the source already fills the canvas exactly (e.g. mode B's
   *  after:render hook, where the composite IS the canvas already). */
  nativeW: number
  nativeH: number
  blurPx: number
  paintMasks: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>
}

/**
 * Renders the full-effects variant, bleeds it into destCtx, then blends in each
 * painted group's "without" variant (also bled) through that group's mask --
 * replaces a plain composeWithBleed call wherever paint-mask support is needed.
 * `renderFull`/`renderGroup` produce native-resolution bitmaps (sync or async);
 * `rawImage` is the unprocessed source, used directly as the 'all' group's variant
 * (no render needed). Satisfies the shared-canvas-aliasing rule documented on
 * blendGroupVariant: each variant is fully bled + blended before the next render call.
 */
export async function renderBlendedBackground(
  destCtx: CanvasRenderingContext2D,
  params: BlendedBackgroundParams,
  rawImage: CanvasImageSource,
  renderFull: () => CanvasImageSource | Promise<CanvasImageSource>,
  renderGroup: (
    group: Exclude<MaskableEffectGroup, 'all'>
  ) => CanvasImageSource | Promise<CanvasImageSource>
): Promise<void> {
  const { canvasW, canvasH, nativeW, nativeH, blurPx, paintMasks } = params
  const full = await renderFull()
  composeWithBleed(destCtx, full, nativeW, nativeH, canvasW, canvasH, blurPx)

  for (const group of MASKABLE_EFFECT_GROUPS) {
    const mask = paintMasks[group]
    if (!mask) continue
    const variant = group === 'all' ? rawImage : await renderGroup(group)

    const scratch = document.createElement('canvas')
    scratch.width = canvasW
    scratch.height = canvasH
    const sctx = scratch.getContext('2d')
    if (!sctx) continue
    composeWithBleed(sctx, variant, nativeW, nativeH, canvasW, canvasH, blurPx)
    blendGroupVariant(destCtx, canvasW, canvasH, scratch, mask)
  }
}

/**
 * Fully synchronous twin of renderBlendedBackground, for the live hot paths (mode A's
 * onTick, mode B's after:render hook) that use the GL-only renderPreviewFrame fast
 * path -- those callers must write their result back into the SAME synchronous call
 * stack Fabric is mid-render on; wrapping them in an async function would defer the
 * canvas write-back by a microtask and risk a stale/torn frame.
 */
export function renderBlendedBackgroundSync(
  destCtx: CanvasRenderingContext2D,
  params: BlendedBackgroundParams,
  rawImage: CanvasImageSource,
  renderFull: () => CanvasImageSource,
  renderGroup: (group: Exclude<MaskableEffectGroup, 'all'>) => CanvasImageSource
): void {
  const { canvasW, canvasH, nativeW, nativeH, blurPx, paintMasks } = params
  const full = renderFull()
  composeWithBleed(destCtx, full, nativeW, nativeH, canvasW, canvasH, blurPx)

  for (const group of MASKABLE_EFFECT_GROUPS) {
    const mask = paintMasks[group]
    if (!mask) continue
    const variant = group === 'all' ? rawImage : renderGroup(group)

    const scratch = document.createElement('canvas')
    scratch.width = canvasW
    scratch.height = canvasH
    const sctx = scratch.getContext('2d')
    if (!sctx) continue
    composeWithBleed(sctx, variant, nativeW, nativeH, canvasW, canvasH, blurPx)
    blendGroupVariant(destCtx, canvasW, canvasH, scratch, mask)
  }
}
