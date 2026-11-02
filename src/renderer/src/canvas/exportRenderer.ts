import { StaticCanvas, FabricImage, Textbox, Rect, Path } from 'fabric'
import { EffectsPipeline } from '../effects/effectsPipeline'
import { buildBorderObjects } from '../borders/applyBorder'
import { applyAnimatedState } from '../animation/applyAnimatedState'
import { rgbToHex } from '../ui/controls'
import { resolveOutputSize, resolveBleedBlurPx } from './canvasFormat'
import { composeWithBleed } from './socialBleed'
import { scalePathData } from './svgPath'
import { effectsWithGroupNeutralized, renderBlendedBackground } from './paintMaskBlend'
import { drawEffectedThroughTextMask } from './textMask'
import type { CanvasFormatState } from './canvasFormat'
import type { EffectsSettings } from '../effects/types'
import type { TextLayerState } from './layerModel'
import type { ImageLayerState } from './imageLayerModel'
import type { MaskableEffectGroup } from './paintMaskBlend'
import type { BorderParams, BorderStyleId } from '../borders/borderDefinitions'

export interface ExportContext {
  sourceImage: { data: string; width: number; height: number }
  effects: EffectsSettings
  textLayers: TextLayerState[]
  imageLayers: ImageLayerState[]
  borderStyleId: BorderStyleId
  borderParams: BorderParams
  canvasFormat: CanvasFormatState
  /** When true, the same global effects applied to the image are also applied to the
   *  final composite (text + border included), rather than only to the background. */
  effectsAffectText: boolean
  /** With effectsAffectText on: the effects only show where text layers are. */
  effectsTextOnly: boolean
  /** Already scaled to this export's full output resolution (see
   *  scaleAllMasksToSize) -- the live preview keeps masks at preview resolution. */
  paintMasks: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>
  /** The downscale factor used to build the live preview canvas (<=1). Export re-renders
   *  at full output resolution, so stored preview-space layer geometry must be scaled up
   *  by 1/previewScale to land in the same relative position/size. */
  previewScale: number
}

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Loads every image layer's data URL once, up front -- compositeExportFrame stays
 *  synchronous and is called once per exported frame, so re-decoding the same data
 *  URL on every frame of a GIF/video would be wasteful. */
export async function preloadImageLayers(
  layers: ImageLayerState[]
): Promise<Map<string, HTMLImageElement>> {
  const entries = await Promise.all(
    layers.map(async (l) => [l.id, await loadImage(l.data)] as const)
  )
  return new Map(entries)
}

export interface PreparedExportBackground {
  effectsCanvas: HTMLCanvasElement
  width: number
  height: number
  dispose: () => void
}

/**
 * Renders one frame's background at full output resolution using an EXISTING pipeline
 * (the caller owns its lifecycle) -- used by the per-frame animated-export loop so a
 * fresh WebGL context isn't created every frame. When `effectsAffectText` is on, the
 * background stays raw/un-effected (bled only): the shared GL pass runs once, later,
 * over the full composite instead (see compositeExportFrameFinal).
 */
export async function renderBackgroundCanvas(
  pipeline: EffectsPipeline,
  img: HTMLImageElement,
  ctx: ExportContext,
  timeSec: number
): Promise<HTMLCanvasElement> {
  const { sourceImage, effects, canvasFormat, effectsAffectText } = ctx
  const outputSize = resolveOutputSize(canvasFormat, sourceImage)
  const blurPx = resolveBleedBlurPx(canvasFormat.bleedBlur, Math.max(outputSize.width, outputSize.height))

  const scratch = document.createElement('canvas')
  scratch.width = outputSize.width
  scratch.height = outputSize.height
  const scratchCtx = scratch.getContext('2d')
  if (!scratchCtx) throw new Error('2D-Kontext konnte nicht erstellt werden.')

  if (effectsAffectText) {
    composeWithBleed(
      scratchCtx,
      img,
      sourceImage.width,
      sourceImage.height,
      outputSize.width,
      outputSize.height,
      blurPx
    )
  } else {
    await renderBlendedBackground(
      scratchCtx,
      {
        canvasW: outputSize.width,
        canvasH: outputSize.height,
        nativeW: sourceImage.width,
        nativeH: sourceImage.height,
        blurPx,
        paintMasks: ctx.paintMasks
      },
      img,
      () => {
        pipeline.setSourceImage(img, sourceImage.width, sourceImage.height)
        return pipeline.render(effects, sourceImage.width, sourceImage.height, timeSec)
      },
      (group) => {
        pipeline.setSourceImage(img, sourceImage.width, sourceImage.height)
        return pipeline.render(
          effectsWithGroupNeutralized(effects, group),
          sourceImage.width,
          sourceImage.height,
          timeSec
        )
      }
    )
  }

  return scratch
}

/** One-shot background render: creates and owns its own EffectsPipeline, freed via
 *  the returned dispose(). Used by the non-animated / non-shared-effects fast path,
 *  where the background is rendered exactly once and reused across every frame. */
export async function prepareExportBackground(ctx: ExportContext): Promise<PreparedExportBackground> {
  const pipeline = new EffectsPipeline()
  const img = await loadImage(ctx.sourceImage.data)
  const effectsCanvas = await renderBackgroundCanvas(pipeline, img, ctx, 0)
  return {
    effectsCanvas,
    width: effectsCanvas.width,
    height: effectsCanvas.height,
    dispose: () => pipeline.dispose()
  }
}

/** Composites one frame (border + text layers, with optional per-layer animation progress)
 *  on top of a pre-rendered background. Synchronous — safe to call once per export frame.
 *  Works identically whether `background` is already GL-effected or still raw (the raw
 *  case is the first half of compositeExportFrameFinal's effects-affect-text path). */
export function compositeExportFrame(
  background: PreparedExportBackground,
  ctx: ExportContext,
  progressByLayerId: Map<string, number> | null,
  preloadedImages: Map<string, HTMLImageElement>,
  /** Renders only the text layers onto a transparent canvas (no background, border or
   *  image layers) -- its alpha channel is the "text only" effects mask. */
  textOnly = false
): HTMLCanvasElement {
  const { width, height, effectsCanvas } = background
  const { effects, textLayers, imageLayers, borderStyleId, borderParams, previewScale } = ctx
  const exportScale = previewScale > 0 && previewScale < 1 ? 1 / previewScale : 1

  const staticCanvas = new StaticCanvas(undefined, { width, height })
  const bgImage = new FabricImage(effectsCanvas, { selectable: false, evented: false })
  if (!textOnly) staticCanvas.backgroundImage = bgImage

  // Border and background are skipped in the text-mask pass.
  if (!textOnly && borderStyleId === 'rounded-card') {
    const radius = Math.min(width, height) * borderParams.radiusRatio
    bgImage.clipPath = new Rect({
      width,
      height,
      rx: radius,
      ry: radius,
      originX: 'center',
      originY: 'center'
    })
  } else if (!textOnly && borderStyleId !== 'none') {
    const params =
      borderStyleId === 'duotone-match'
        ? {
            ...borderParams,
            color: rgbToHex(effects.analog.duotoneShadow),
            color2: rgbToHex(effects.analog.duotoneHighlight)
          }
        : borderParams
    buildBorderObjects(width, height, borderStyleId, params).forEach((obj) => staticCanvas.add(obj))
  }

  // One combined, z-order-sorted pass over text + image layers, matching the live
  // preview's applyLayerZOrder -- whichever type, layers interleave by `order`.
  type Entry =
    | { kind: 'text'; order: number; layer: TextLayerState }
    | { kind: 'image'; order: number; layer: ImageLayerState }
  const entries: Entry[] = [
    ...textLayers.map((layer) => ({ kind: 'text' as const, order: layer.order, layer })),
    ...imageLayers.map((layer) => ({ kind: 'image' as const, order: layer.order, layer }))
  ].sort((a, b) => a.order - b.order)

  for (const entry of entries) {
    if (!entry.layer.visible) continue
    if (textOnly && entry.kind !== 'text') continue

    if (entry.kind === 'text') {
      const layer = entry.layer
      const obj = new Textbox(layer.text, {
        left: layer.left * exportScale,
        top: layer.top * exportScale,
        width: layer.width * exportScale,
        angle: layer.angle,
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize * exportScale,
        fill: layer.fill,
        textAlign: layer.textAlign,
        fontWeight: layer.fontWeight,
        charSpacing: layer.letterSpacing,
        opacity: layer.opacity
      })

      const progress = progressByLayerId?.get(layer.id)
      if (progress !== undefined && layer.animation.presetId !== 'none') {
        applyAnimatedState(
          obj,
          {
            ...layer,
            left: layer.left * exportScale,
            top: layer.top * exportScale,
            width: layer.width * exportScale,
            animation: {
              ...layer.animation,
              params: {
                ...layer.animation.params,
                distance: layer.animation.params.distance * exportScale,
                amplitude: layer.animation.params.amplitude * exportScale
              }
            }
          },
          progress
        )
      }

      staticCanvas.add(obj)
    } else {
      const layer = entry.layer
      const preloaded = preloadedImages.get(layer.id)
      if (!preloaded) continue
      const obj = new FabricImage(preloaded, {
        left: layer.left * exportScale,
        top: layer.top * exportScale,
        angle: layer.angle,
        // scaleX/scaleY are unitless ratios of the image's own natural size, like
        // text's scaleX/scaleY -- only position scales with exportScale, not these.
        scaleX: layer.scaleX,
        scaleY: layer.scaleY,
        opacity: layer.opacity
      })
      if (layer.maskPath) {
        obj.clipPath = new Path(scalePathData(layer.maskPath, exportScale), {
          absolutePositioned: true
        })
      }
      staticCanvas.add(obj)
    }
  }

  staticCanvas.renderAll()
  const out = staticCanvas.toCanvasElement()
  staticCanvas.dispose()
  return out
}

/**
 * Composites one frame and, when `ctx.effectsAffectText` is on, runs the FULL global
 * effects pipeline (GL + CPU pixel-sort/datamosh) once more over the entire raw
 * composite (background + text + border), so text/border share the same look as the
 * image -- export affords the extra cost that the live preview's GL-only hot path
 * avoids. `sharedEffectsPipeline` is reused across the whole export loop by the
 * caller; pass null when `effectsAffectText` is off.
 */
export async function compositeExportFrameFinal(
  background: PreparedExportBackground,
  ctx: ExportContext,
  progressByLayerId: Map<string, number> | null,
  preloadedImages: Map<string, HTMLImageElement>,
  sharedEffectsPipeline: EffectsPipeline | null,
  timeSec: number
): Promise<HTMLCanvasElement> {
  const composited = compositeExportFrame(background, ctx, progressByLayerId, preloadedImages)
  if (!ctx.effectsAffectText || !sharedEffectsPipeline) return composited

  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = composited.width
  finalCanvas.height = composited.height
  const finalCtx = finalCanvas.getContext('2d')
  if (!finalCtx) return composited

  await renderBlendedBackground(
    finalCtx,
    {
      canvasW: composited.width,
      canvasH: composited.height,
      nativeW: composited.width,
      nativeH: composited.height,
      blurPx: 0,
      paintMasks: ctx.paintMasks
    },
    composited,
    () => {
      sharedEffectsPipeline.setSourceImage(composited, composited.width, composited.height)
      return sharedEffectsPipeline.render(ctx.effects, composited.width, composited.height, timeSec)
    },
    (group) => {
      sharedEffectsPipeline.setSourceImage(composited, composited.width, composited.height)
      return sharedEffectsPipeline.render(
        effectsWithGroupNeutralized(ctx.effects, group),
        composited.width,
        composited.height,
        timeSec
      )
    }
  )

  if (!ctx.effectsTextOnly) return finalCanvas

  // Text-only target: keep the raw composite and lay the effected version over it only
  // where text layers are.
  const textMask = compositeExportFrame(background, ctx, progressByLayerId, preloadedImages, true)
  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = composited.width
  resultCanvas.height = composited.height
  const resultCtx = resultCanvas.getContext('2d')
  if (!resultCtx) return composited
  resultCtx.drawImage(composited, 0, 0)
  drawEffectedThroughTextMask(resultCtx, finalCanvas, textMask, composited.width, composited.height)
  return resultCanvas
}

/** Static (non-animated) single-frame export at full resolution. */
export async function renderStaticExport(ctx: ExportContext): Promise<HTMLCanvasElement> {
  const background = await prepareExportBackground(ctx)
  try {
    const preloadedImages = await preloadImageLayers(ctx.imageLayers)
    const sharedEffectsPipeline = ctx.effectsAffectText ? new EffectsPipeline() : null
    try {
      return await compositeExportFrameFinal(
        background,
        ctx,
        null,
        preloadedImages,
        sharedEffectsPipeline,
        0
      )
    } finally {
      sharedEffectsPipeline?.dispose()
    }
  } finally {
    background.dispose()
  }
}

export function computePreviewScale(width: number, height: number, maxPreviewDim: number): number {
  return Math.min(1, maxPreviewDim / Math.max(width, height))
}
