import { Rect, Gradient, type FabricObject } from 'fabric'
import type { BorderParams, BorderStyleId } from './borderDefinitions'

export interface BorderObject extends FabricObject {
  isBorderLayer?: boolean
}

function markBorder<T extends FabricObject>(obj: T): T & BorderObject {
  const marked = obj as T & BorderObject
  marked.isBorderLayer = true
  marked.selectable = false
  marked.evented = false
  return marked
}

function frameGradient(w: number, h: number, color1: string, color2: string): Gradient<'linear'> {
  return new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: w, y2: h },
    colorStops: [
      { offset: 0, color: color1 },
      { offset: 1, color: color2 }
    ]
  })
}

export function buildBorderObjects(
  width: number,
  height: number,
  styleId: BorderStyleId,
  params: BorderParams
): BorderObject[] {
  const shortSide = Math.min(width, height)
  const barThickness = Math.max(1, Math.round(shortSide * params.widthRatio))

  switch (styleId) {
    case 'none':
      return []

    case 'minimal': {
      const rect = new Rect({
        left: barThickness / 2,
        top: barThickness / 2,
        width: width - barThickness,
        height: height - barThickness,
        fill: 'transparent',
        stroke: params.color,
        strokeWidth: barThickness
      })
      return [markBorder(rect)]
    }

    case 'polaroid': {
      const bottomThickness = Math.round(barThickness * 2.2)
      const bars = [
        new Rect({ left: 0, top: 0, width, height: barThickness, fill: params.color }),
        new Rect({
          left: 0,
          top: height - bottomThickness,
          width,
          height: bottomThickness,
          fill: params.color
        }),
        new Rect({ left: 0, top: 0, width: barThickness, height, fill: params.color }),
        new Rect({
          left: width - barThickness,
          top: 0,
          width: barThickness,
          height,
          fill: params.color
        })
      ]
      return bars.map(markBorder)
    }

    case 'gradient':
    case 'duotone-match': {
      const rect = new Rect({
        left: barThickness / 2,
        top: barThickness / 2,
        width: width - barThickness,
        height: height - barThickness,
        fill: 'transparent',
        strokeWidth: barThickness
      })
      rect.set('stroke', frameGradient(width, height, params.color, params.color2))
      return [markBorder(rect)]
    }

    case 'filmstrip': {
      const bars = [
        new Rect({ left: 0, top: 0, width, height: barThickness, fill: params.color }),
        new Rect({
          left: 0,
          top: height - barThickness,
          width,
          height: barThickness,
          fill: params.color
        })
      ]
      const holeRadius = barThickness * 0.22
      const holeSpacing = holeRadius * 5
      const holeCount = Math.max(2, Math.floor(width / holeSpacing))
      const margin = (width - (holeCount - 1) * holeSpacing) / 2

      for (let i = 0; i < holeCount; i++) {
        const cx = margin + i * holeSpacing
        bars.push(
          new Rect({
            left: cx - holeRadius / 2,
            top: barThickness / 2 - holeRadius / 2,
            width: holeRadius,
            height: holeRadius,
            rx: holeRadius * 0.25,
            ry: holeRadius * 0.25,
            fill: '#000000'
          }),
          new Rect({
            left: cx - holeRadius / 2,
            top: height - barThickness / 2 - holeRadius / 2,
            width: holeRadius,
            height: holeRadius,
            rx: holeRadius * 0.25,
            ry: holeRadius * 0.25,
            fill: '#000000'
          })
        )
      }
      return bars.map(markBorder)
    }

    case 'rounded-card':
      // Handled via clipPath on the background image in CanvasStage, no overlay objects needed.
      return []

    default:
      return []
  }
}
