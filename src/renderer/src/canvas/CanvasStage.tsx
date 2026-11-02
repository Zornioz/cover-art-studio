import { useCallback, useEffect, useRef } from 'react'
import { Canvas, FabricImage, Path, Rect, Textbox, type FabricObject } from 'fabric'
import { EffectsPipeline } from '../effects/effectsPipeline'
import { useProjectStore } from '../state/projectStore'
import type { TextLayerState } from './layerModel'
import type { ImageLayerState } from './imageLayerModel'
import { buildBorderObjects, type BorderObject } from '../borders/applyBorder'
import { rgbToHex } from '../ui/controls'
import { useLiveRenderLoop } from './liveRenderLoop'
import { resolveOutputSize, resolveBleedBlurPx } from './canvasFormat'
import { composeWithBleed } from './socialBleed'
import { computePreviewScale } from './exportRenderer'
import { applyLayerZOrder } from './layerOrder'
import { useToolModeInteractivity } from './toolModeInteractivity'
import { useCutoutTool } from './cutoutTool'
import { usePaintBrushTool } from './paintBrushTool'
import { drawEffectedThroughTextMask } from './textMask'
import {
  effectsWithGroupNeutralized,
  renderBlendedBackground,
  renderBlendedBackgroundSync
} from './paintMaskBlend'

export const MAX_PREVIEW_DIM = 900

interface LayeredObject extends FabricObject {
  layerId?: string
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Draws only the visible text layers onto a transparent canvas (alpha = text coverage). */
function renderTextMask(canvas: Canvas, width: number, height: number): HTMLCanvasElement {
  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const mctx = mask.getContext('2d')
  if (!mctx) return mask
  const scale = canvas.getRetinaScaling()
  mctx.scale(scale, scale)
  for (const obj of canvas.getObjects()) {
    if (obj instanceof Textbox) obj.render(mctx)
  }
  return mask
}

function applyLayerToTextbox(obj: Textbox, layer: TextLayerState): void {
  if (obj.text !== layer.text) obj.set('text', layer.text)
  obj.set({
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fill: layer.fill,
    textAlign: layer.textAlign,
    fontWeight: layer.fontWeight,
    charSpacing: layer.letterSpacing,
    opacity: layer.opacity,
    width: layer.width,
    visible: layer.visible
  })
}

function applyLayerToImage(obj: FabricImage, layer: ImageLayerState): void {
  obj.set({
    left: layer.left,
    top: layer.top,
    angle: layer.angle,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    opacity: layer.opacity,
    visible: layer.visible
  })
  // Rebuilt every sync pass (only runs when imageLayers changes, not per-frame) -- not
  // worth tracking whether maskPath actually changed just to skip a cheap Path parse.
  obj.clipPath = layer.maskPath ? new Path(layer.maskPath, { absolutePositioned: true }) : undefined
}

function CanvasStage(): JSX.Element {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const pipelineRef = useRef<EffectsPipeline | null>(null)
  const bgImageRef = useRef<FabricImage | null>(null)
  const loadedDataRef = useRef<string | null>(null)
  const imageElRef = useRef<HTMLImageElement | null>(null)
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const timeRef = useRef(0)

  const sourceImage = useProjectStore((s) => s.sourceImage)
  const effects = useProjectStore((s) => s.effects)
  const textLayers = useProjectStore((s) => s.textLayers)
  const imageLayers = useProjectStore((s) => s.imageLayers)
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer)
  const setSelectedLayerId = useProjectStore((s) => s.setSelectedLayerId)
  const borderStyleId = useProjectStore((s) => s.borderStyleId)
  const borderParams = useProjectStore((s) => s.borderParams)
  const canvasFormat = useProjectStore((s) => s.canvasFormat)
  const effectsAffectText = useProjectStore((s) => s.effectsAffectText)
  const effectsTextOnly = useProjectStore((s) => s.effectsTextOnly)
  const activeTool = useProjectStore((s) => s.activeTool)
  const paintMasks = useProjectStore((s) => s.paintMasks)

  // Refs mirroring the latest store values, read by the after:render hook and the
  // rAF tick below -- both run outside React's render cycle and must see live values
  // without re-subscribing every frame. Declared/synced before the effects that rely
  // on them so they're up to date within the same commit.
  const effectsRef = useRef(effects)
  useEffect(() => {
    effectsRef.current = effects
  }, [effects])
  const effectsAffectTextRef = useRef(effectsAffectText)
  useEffect(() => {
    effectsAffectTextRef.current = effectsAffectText
  }, [effectsAffectText])
  const effectsTextOnlyRef = useRef(effectsTextOnly)
  useEffect(() => {
    effectsTextOnlyRef.current = effectsTextOnly
    // The effected composite is rebuilt in after:render, so a target switch needs a redraw.
    fabricRef.current?.requestRenderAll()
  }, [effectsTextOnly])
  const canvasFormatRef = useRef(canvasFormat)
  useEffect(() => {
    canvasFormatRef.current = canvasFormat
  }, [canvasFormat])
  const paintMasksRef = useRef(paintMasks)
  useEffect(() => {
    paintMasksRef.current = paintMasks
  }, [paintMasks])

  useEffect(() => {
    if (!canvasElRef.current) return

    const canvas = new Canvas(canvasElRef.current, {
      preserveObjectStacking: true,
      backgroundColor: '#000000'
    })
    fabricRef.current = canvas
    pipelineRef.current = new EffectsPipeline()

    const syncSelection = (target: FabricObject | undefined): void => {
      setSelectedLayerId((target as LayeredObject | undefined)?.layerId ?? null)
    }

    canvas.on('selection:created', (e) => syncSelection(e.selected?.[0]))
    canvas.on('selection:updated', (e) => syncSelection(e.selected?.[0]))
    canvas.on('selection:cleared', () => setSelectedLayerId(null))
    canvas.on('object:modified', (e) => {
      const obj = e.target as LayeredObject | undefined
      if (!obj?.layerId) return
      const { textLayers: currentText, imageLayers: currentImages } = useProjectStore.getState()
      if (currentText.some((l) => l.id === obj.layerId)) {
        updateTextLayer(obj.layerId, {
          left: obj.left ?? 0,
          top: obj.top ?? 0,
          width: (obj as Textbox).width ?? 320,
          angle: obj.angle ?? 0,
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1
        })
      } else if (currentImages.some((l) => l.id === obj.layerId)) {
        useProjectStore.getState().updateImageLayer(obj.layerId, {
          left: obj.left ?? 0,
          top: obj.top ?? 0,
          angle: obj.angle ?? 0,
          scaleX: obj.scaleX ?? 1,
          scaleY: obj.scaleY ?? 1
        })
      }
    })

    // Applies the same global effects (grain/duotone/CA/motion lines/...) to the full
    // composite -- background + text + border -- instead of only the background, so
    // text/border look consistent with a heavily styled image. Fabric keeps selection
    // handles on a separate overlay canvas (upperCanvasEl/contextTop), so replacing the
    // content canvas's pixels here doesn't break dragging/selection.
    canvas.on('after:render', ({ ctx }) => {
      if (!effectsAffectTextRef.current) return
      const pipeline = pipelineRef.current
      if (!pipeline) return
      const lowerEl = canvas.lowerCanvasEl
      if (lowerEl.width === 0 || lowerEl.height === 0) return

      // Snapshot the raw composite BEFORE any GL pass runs -- this is both the source
      // texture for the full-effects render below and, for free, the 'all' paint-mask
      // group's "without" variant (the un-effected image).
      const rawSnapshot = document.createElement('canvas')
      rawSnapshot.width = lowerEl.width
      rawSnapshot.height = lowerEl.height
      rawSnapshot.getContext('2d')?.drawImage(lowerEl, 0, 0)

      const outCanvas = document.createElement('canvas')
      outCanvas.width = lowerEl.width
      outCanvas.height = lowerEl.height
      const outCtx = outCanvas.getContext('2d')
      if (!outCtx) return

      renderBlendedBackgroundSync(
        outCtx,
        {
          canvasW: lowerEl.width,
          canvasH: lowerEl.height,
          nativeW: lowerEl.width,
          nativeH: lowerEl.height,
          blurPx: 0,
          paintMasks: paintMasksRef.current
        },
        rawSnapshot,
        () => {
          pipeline.setSourceImage(lowerEl, lowerEl.width, lowerEl.height)
          return pipeline.renderPreviewFrame(
            effectsRef.current,
            lowerEl.width,
            lowerEl.height,
            timeRef.current
          )
        },
        (group) => {
          pipeline.setSourceImage(rawSnapshot, lowerEl.width, lowerEl.height)
          return pipeline.renderPreviewFrame(
            effectsWithGroupNeutralized(effectsRef.current, group),
            lowerEl.width,
            lowerEl.height,
            timeRef.current
          )
        }
      )

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, lowerEl.width, lowerEl.height)
      if (effectsTextOnlyRef.current) {
        // Text-only target: raw composite as the base, effected version only where text is.
        ctx.drawImage(rawSnapshot, 0, 0, lowerEl.width, lowerEl.height)
        drawEffectedThroughTextMask(
          ctx,
          outCanvas,
          renderTextMask(canvas, lowerEl.width, lowerEl.height),
          lowerEl.width,
          lowerEl.height
        )
      } else {
        ctx.drawImage(outCanvas, 0, 0, lowerEl.width, lowerEl.height)
      }
      ctx.restore()
    })

    return () => {
      canvas.dispose()
      pipelineRef.current?.dispose()
      fabricRef.current = null
      bgImageRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      const canvas = fabricRef.current
      const pipeline = pipelineRef.current
      if (!canvas || !pipeline || !sourceImage) return

      if (loadedDataRef.current !== sourceImage.data) {
        const img = await loadImage(sourceImage.data)
        if (cancelled) return
        pipeline.setSourceImage(img, img.naturalWidth, img.naturalHeight)
        imageElRef.current = img
        loadedDataRef.current = sourceImage.data
      }
      const img = imageElRef.current
      if (!img) return

      const outputSize = resolveOutputSize(canvasFormat, {
        width: img.naturalWidth,
        height: img.naturalHeight
      })
      const previewScale = computePreviewScale(outputSize.width, outputSize.height, MAX_PREVIEW_DIM)
      const canvasW = Math.max(1, Math.round(outputSize.width * previewScale))
      const canvasH = Math.max(1, Math.round(outputSize.height * previewScale))
      if (canvas.getWidth() !== canvasW || canvas.getHeight() !== canvasH) {
        canvas.setDimensions({ width: canvasW, height: canvasH })
      }

      const imgPreviewW = img.naturalWidth * previewScale
      const imgPreviewH = img.naturalHeight * previewScale
      const blurPx = resolveBleedBlurPx(canvasFormat.bleedBlur, Math.max(canvasW, canvasH))

      if (!scratchCanvasRef.current) scratchCanvasRef.current = document.createElement('canvas')
      const scratch = scratchCanvasRef.current
      scratch.width = canvasW
      scratch.height = canvasH
      const scratchCtx = scratch.getContext('2d')
      if (!scratchCtx) return

      if (effectsAffectText) {
        // Raw (un-effected) composite -- the shared GL pass runs later, over the full
        // background+text+border composite, via the after:render hook above.
        composeWithBleed(scratchCtx, img, img.naturalWidth, img.naturalHeight, canvasW, canvasH, blurPx)
      } else {
        await renderBlendedBackground(
          scratchCtx,
          {
            canvasW,
            canvasH,
            nativeW: imgPreviewW,
            nativeH: imgPreviewH,
            blurPx,
            paintMasks: useProjectStore.getState().paintMasks
          },
          img,
          () => pipeline.render(effects, imgPreviewW, imgPreviewH, timeRef.current),
          (group) =>
            pipeline.render(
              effectsWithGroupNeutralized(effects, group),
              imgPreviewW,
              imgPreviewH,
              timeRef.current
            )
        )
        if (cancelled) return
      }

      if (!bgImageRef.current) {
        const bgImage = new FabricImage(scratch, { selectable: false, evented: false })
        bgImageRef.current = bgImage
        canvas.backgroundImage = bgImage
      } else {
        bgImageRef.current.setElement(scratch)
      }
      canvas.renderAll()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [sourceImage, effects, canvasFormat, effectsAffectText])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const existing = new Map<string, Textbox>()
    canvas.getObjects().forEach((obj) => {
      const id = (obj as LayeredObject).layerId
      if (id && obj instanceof Textbox) existing.set(id, obj)
    })

    existing.forEach((obj, id) => {
      if (!textLayers.find((l) => l.id === id)) {
        canvas.remove(obj)
      }
    })

    textLayers.forEach((layer) => {
      const found = existing.get(layer.id)
      if (!found) {
        const obj: LayeredObject = new Textbox(layer.text, {
          left: layer.left,
          top: layer.top,
          angle: layer.angle,
          scaleX: layer.scaleX,
          scaleY: layer.scaleY,
          width: layer.width,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          fill: layer.fill,
          textAlign: layer.textAlign,
          fontWeight: layer.fontWeight,
          charSpacing: layer.letterSpacing,
          opacity: layer.opacity
        })
        obj.layerId = layer.id
        canvas.add(obj)
      } else {
        applyLayerToTextbox(found, layer)
      }
    })

    applyLayerZOrder(canvas, textLayers, useProjectStore.getState().imageLayers)
    canvas.renderAll()
  }, [textLayers])

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      const canvas = fabricRef.current
      if (!canvas) return

      const existing = new Map<string, FabricImage>()
      canvas.getObjects().forEach((obj) => {
        const id = (obj as LayeredObject).layerId
        if (id && obj instanceof FabricImage) existing.set(id, obj)
      })

      existing.forEach((obj, id) => {
        if (!imageLayers.find((l) => l.id === id)) canvas.remove(obj)
      })

      for (const layer of imageLayers) {
        const found = existing.get(layer.id)
        if (!found) {
          const obj = (await FabricImage.fromURL(layer.data)) as FabricImage & LayeredObject
          if (cancelled) return
          obj.layerId = layer.id
          applyLayerToImage(obj, layer)
          canvas.add(obj)
        } else {
          applyLayerToImage(found, layer)
        }
      }

      if (cancelled) return
      applyLayerZOrder(canvas, useProjectStore.getState().textLayers, imageLayers)
      canvas.renderAll()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [imageLayers])

  useEffect(() => {
    const canvas = fabricRef.current
    const bgImage = bgImageRef.current
    if (!canvas || !sourceImage) return

    canvas
      .getObjects()
      .filter((obj) => (obj as BorderObject).isBorderLayer)
      .forEach((obj) => canvas.remove(obj))

    if (bgImage) bgImage.clipPath = undefined

    if (borderStyleId === 'rounded-card') {
      if (bgImage) {
        const w = canvas.getWidth()
        const h = canvas.getHeight()
        const radius = Math.min(w, h) * borderParams.radiusRatio
        bgImage.clipPath = new Rect({
          width: w,
          height: h,
          rx: radius,
          ry: radius,
          originX: 'center',
          originY: 'center'
        })
      }
    } else {
      const params =
        borderStyleId === 'duotone-match'
          ? {
              ...borderParams,
              color: rgbToHex(effects.analog.duotoneShadow),
              color2: rgbToHex(effects.analog.duotoneHighlight)
            }
          : borderParams
      const objects = buildBorderObjects(canvas.getWidth(), canvas.getHeight(), borderStyleId, params)
      objects.forEach((obj) => {
        canvas.add(obj)
        canvas.sendObjectToBack(obj)
      })
    }

    canvas.renderAll()
  }, [
    sourceImage,
    borderStyleId,
    borderParams,
    canvasFormat,
    effects.analog.duotoneShadow,
    effects.analog.duotoneHighlight
  ])

  const needsLoop = effects.motion.enabled || textLayers.some((l) => l.animation.presetId !== 'none')

  // Mode A (effectsAffectText off): re-renders the background through the cheap GL-only
  // fast path (no CPU pixel-sort/datamosh -- those stay a settings-change-only pass).
  // Used both by onTick (when the motion effect is animating) and directly by the paint
  // tool (so a brush stroke shows up immediately even with motion off).
  const recomputeModeABackground = useCallback((elapsedSec: number) => {
    const canvas = fabricRef.current
    const pipeline = pipelineRef.current
    const img = imageElRef.current
    const scratch = scratchCanvasRef.current
    if (!canvas || !pipeline || !img || !scratch) return

    const outputSize = resolveOutputSize(canvasFormatRef.current, {
      width: img.naturalWidth,
      height: img.naturalHeight
    })
    const previewScale = computePreviewScale(outputSize.width, outputSize.height, MAX_PREVIEW_DIM)
    const canvasW = Math.max(1, Math.round(outputSize.width * previewScale))
    const canvasH = Math.max(1, Math.round(outputSize.height * previewScale))
    const imgPreviewW = img.naturalWidth * previewScale
    const imgPreviewH = img.naturalHeight * previewScale
    const blurPx = resolveBleedBlurPx(canvasFormatRef.current.bleedBlur, Math.max(canvasW, canvasH))

    scratch.width = canvasW
    scratch.height = canvasH
    const scratchCtx = scratch.getContext('2d')
    if (!scratchCtx) return

    renderBlendedBackgroundSync(
      scratchCtx,
      {
        canvasW,
        canvasH,
        nativeW: imgPreviewW,
        nativeH: imgPreviewH,
        blurPx,
        paintMasks: paintMasksRef.current
      },
      img,
      () => {
        pipeline.setSourceImage(img, img.naturalWidth, img.naturalHeight)
        return pipeline.renderPreviewFrame(effectsRef.current, imgPreviewW, imgPreviewH, elapsedSec)
      },
      (group) => {
        pipeline.setSourceImage(img, img.naturalWidth, img.naturalHeight)
        return pipeline.renderPreviewFrame(
          effectsWithGroupNeutralized(effectsRef.current, group),
          imgPreviewW,
          imgPreviewH,
          elapsedSec
        )
      }
    )

    bgImageRef.current?.setElement(scratch)
    canvas.renderAll()
  }, [])

  const onTick = useCallback(
    (elapsedSec: number) => {
      timeRef.current = elapsedSec
      // Mode B re-renders via the after:render hook, which canvas.requestRenderAll()
      // (called by the live-render loop right after this) already triggers.
      if (effectsAffectTextRef.current || !effectsRef.current.motion.enabled) return
      recomputeModeABackground(elapsedSec)
    },
    [recomputeModeABackground]
  )

  // Forces a background/composite redraw after a paint stroke changes a mask, without
  // waiting for the next settings change or motion tick.
  const redrawAfterPaint = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (!effectsAffectTextRef.current) recomputeModeABackground(timeRef.current)
    canvas.requestRenderAll()
  }, [recomputeModeABackground])

  useLiveRenderLoop(() => fabricRef.current, textLayers, needsLoop, onTick)
  useToolModeInteractivity(() => fabricRef.current, activeTool)
  useCutoutTool(() => fabricRef.current)
  usePaintBrushTool(() => fabricRef.current, redrawAfterPaint)

  return (
    <div className="flex items-center justify-center">
      <canvas ref={canvasElRef} className="rounded-sm shadow-2xl shadow-black/60" />
    </div>
  )
}

export default CanvasStage
