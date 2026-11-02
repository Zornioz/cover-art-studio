import { useEffect, useRef } from 'react'
import type { Canvas, TPointerEventInfo, TPointerEvent } from 'fabric'
import { useProjectStore } from '../state/projectStore'
import type { PaintBrushState } from '../state/projectStore'

interface Point {
  x: number
  y: number
}

function stampBrush(ctx: CanvasRenderingContext2D, p: Point, brush: PaintBrushState): void {
  const radius = brush.size / 2
  const innerStop = Math.max(0, Math.min(1, 1 - brush.softness))
  const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
  gradient.addColorStop(0, `rgba(255,255,255,${brush.strength})`)
  gradient.addColorStop(innerStop, `rgba(255,255,255,${brush.strength})`)
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.save()
  ctx.globalCompositeOperation = brush.polarity === 'erase' ? 'destination-out' : 'source-over'
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Stamps along the segment from `from` to `to` at a fixed step so a fast drag still
 *  paints a continuous stroke instead of discrete, gapped circles. */
function stampSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, brush: PaintBrushState): void {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const step = Math.max(2, brush.size / 6)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    stampBrush(ctx, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, brush)
  }
}

/**
 * Paint-with-effects brush: active only while activeTool === 'paint'. Paints directly
 * into the currently selected effect group's mask canvas (allocated lazily via
 * ensurePaintMask), bypassing Zustand's set() for the per-stamp pixel writes so 60fps
 * dragging doesn't trigger a React re-render every stamp -- `onPainted` is called after
 * each segment so the caller can force a redraw through the normal render paths.
 */
export function usePaintBrushTool(canvasGetter: () => Canvas | null, onPainted: () => void): void {
  const activeTool = useProjectStore((s) => s.activeTool)
  const paintBrush = useProjectStore((s) => s.paintBrush)
  const ensurePaintMask = useProjectStore((s) => s.ensurePaintMask)

  const lastPointRef = useRef<Point | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasGetter()
    if (!canvas || activeTool !== 'paint') return

    const getMaskCtx = (): CanvasRenderingContext2D | null => {
      const mask = ensurePaintMask(paintBrush.group, canvas.getWidth(), canvas.getHeight())
      return mask.getContext('2d')
    }

    const getPoint = (e: TPointerEventInfo<TPointerEvent>): Point => {
      const p = canvas.getScenePoint(e.e)
      return { x: p.x, y: p.y }
    }

    const onDown = (e: TPointerEventInfo<TPointerEvent>): void => {
      draggingRef.current = true
      const p = getPoint(e)
      lastPointRef.current = p
      const ctx = getMaskCtx()
      if (ctx) stampBrush(ctx, p, paintBrush)
      onPainted()
    }

    const onMove = (e: TPointerEventInfo<TPointerEvent>): void => {
      if (!draggingRef.current || !lastPointRef.current) return
      const p = getPoint(e)
      const ctx = getMaskCtx()
      if (ctx) stampSegment(ctx, lastPointRef.current, p, paintBrush)
      lastPointRef.current = p
      onPainted()
    }

    const onUp = (): void => {
      draggingRef.current = false
      lastPointRef.current = null
    }

    canvas.on('mouse:down', onDown)
    canvas.on('mouse:move', onMove)
    canvas.on('mouse:up', onUp)

    return () => {
      canvas.off('mouse:down', onDown)
      canvas.off('mouse:move', onMove)
      canvas.off('mouse:up', onUp)
      draggingRef.current = false
      lastPointRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, paintBrush, ensurePaintMask, onPainted])
}
