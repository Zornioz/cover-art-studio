import { useEffect, useRef } from 'react'
import type { Canvas, TPointerEventInfo, TPointerEvent } from 'fabric'
import { useProjectStore } from '../state/projectStore'
import { pointsToPathData, rectToPathData, ellipsePointsToPathData, type Point } from './svgPath'

const MIN_POINT_STEP = 3 // px, filters dense mousemove sampling on long freehand strokes

function drawPreview(ctx: CanvasRenderingContext2D, canvas: Canvas, points: Point[]): void {
  canvas.clearContext(ctx)
  if (points.length < 2) return
  ctx.save()
  ctx.strokeStyle = '#4da3ff'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.stroke()
  ctx.restore()
}

/**
 * Freehand/rect/ellipse cutout tool: active only while activeTool === 'cutout' and an
 * image layer is selected. Draws its live preview on canvas.contextTop (the same overlay
 * surface Fabric's own selection UI uses) so it never touches the object model, then on
 * mouse-up commits an SVG path (M/L/Z grammar, canvas-absolute coordinates) as the
 * selected image layer's maskPath.
 */
export function useCutoutTool(canvasGetter: () => Canvas | null): void {
  const activeTool = useProjectStore((s) => s.activeTool)
  const cutoutShape = useProjectStore((s) => s.cutoutShape)
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const imageLayers = useProjectStore((s) => s.imageLayers)
  const updateImageLayer = useProjectStore((s) => s.updateImageLayer)

  const isImageLayerSelected = imageLayers.some((l) => l.id === selectedLayerId)
  const pointsRef = useRef<Point[]>([])
  const startRef = useRef<Point | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasGetter()
    if (!canvas || activeTool !== 'cutout' || !isImageLayerSelected || !selectedLayerId) return

    const ctx = canvas.contextTop

    const getPoint = (e: TPointerEventInfo<TPointerEvent>): Point => {
      const p = canvas.getScenePoint(e.e)
      return { x: p.x, y: p.y }
    }

    const onDown = (e: TPointerEventInfo<TPointerEvent>): void => {
      const p = getPoint(e)
      draggingRef.current = true
      startRef.current = p
      pointsRef.current = [p]
    }

    const onMove = (e: TPointerEventInfo<TPointerEvent>): void => {
      if (!draggingRef.current || !startRef.current) return
      const p = getPoint(e)

      if (cutoutShape === 'freehand') {
        const last = pointsRef.current[pointsRef.current.length - 1]
        if (Math.hypot(p.x - last.x, p.y - last.y) >= MIN_POINT_STEP) {
          pointsRef.current.push(p)
        }
        drawPreview(ctx, canvas, pointsRef.current)
      } else if (cutoutShape === 'rect') {
        const { x, y } = startRef.current
        drawPreview(ctx, canvas, [
          { x, y },
          { x: p.x, y },
          { x: p.x, y: p.y },
          { x, y: p.y },
          { x, y }
        ])
      } else {
        const cx = (startRef.current.x + p.x) / 2
        const cy = (startRef.current.y + p.y) / 2
        const rx = Math.abs(p.x - startRef.current.x) / 2
        const ry = Math.abs(p.y - startRef.current.y) / 2
        const segments = 32
        const ellipsePoints: Point[] = []
        for (let i = 0; i <= segments; i++) {
          const t = (i / segments) * Math.PI * 2
          ellipsePoints.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry })
        }
        drawPreview(ctx, canvas, ellipsePoints)
      }
    }

    const onUp = (e: TPointerEventInfo<TPointerEvent>): void => {
      if (!draggingRef.current || !startRef.current) return
      draggingRef.current = false
      const p = getPoint(e)
      canvas.clearContext(ctx)

      let maskPath: string | null = null
      if (cutoutShape === 'freehand') {
        if (pointsRef.current.length >= 3) maskPath = pointsToPathData(pointsRef.current)
      } else if (cutoutShape === 'rect') {
        const { x, y } = startRef.current
        const w = p.x - x
        const h = p.y - y
        if (Math.abs(w) > 2 && Math.abs(h) > 2) {
          maskPath = rectToPathData(Math.min(x, p.x), Math.min(y, p.y), Math.abs(w), Math.abs(h))
        }
      } else {
        const cx = (startRef.current.x + p.x) / 2
        const cy = (startRef.current.y + p.y) / 2
        const rx = Math.abs(p.x - startRef.current.x) / 2
        const ry = Math.abs(p.y - startRef.current.y) / 2
        if (rx > 2 && ry > 2) maskPath = ellipsePointsToPathData(cx, cy, rx, ry)
      }

      startRef.current = null
      pointsRef.current = []
      if (maskPath) updateImageLayer(selectedLayerId, { maskPath })
    }

    canvas.on('mouse:down', onDown)
    canvas.on('mouse:move', onMove)
    canvas.on('mouse:up', onUp)

    return () => {
      canvas.off('mouse:down', onDown)
      canvas.off('mouse:move', onMove)
      canvas.off('mouse:up', onUp)
      canvas.clearContext(ctx)
      draggingRef.current = false
      startRef.current = null
      pointsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, cutoutShape, selectedLayerId, isImageLayerSelected])
}
