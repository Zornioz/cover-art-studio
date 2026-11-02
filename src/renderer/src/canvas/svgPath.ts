export interface Point {
  x: number
  y: number
}

/**
 * Freehand, rectangle, and ellipse cutouts all reduce to the same "M x y L x y ... Z"
 * point-list grammar (ellipse as a polygon approximation, not an SVG arc command) so a
 * single scaling helper handles every cutout shape uniformly for export.
 */
export function pointsToPathData(points: Point[]): string {
  if (points.length < 2) return ''
  const [first, ...rest] = points
  const segments = rest.map((p) => `L ${p.x} ${p.y}`).join(' ')
  return `M ${first.x} ${first.y} ${segments} Z`
}

export function rectToPathData(x: number, y: number, w: number, h: number): string {
  return pointsToPathData([
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h }
  ])
}

export function ellipsePointsToPathData(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  segments = 48
): string {
  const points: Point[] = []
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2
    points.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry })
  }
  return pointsToPathData(points)
}

/** Scales every numeric coordinate token in an "M/L/Z"-grammar path string by `scale`. */
export function scalePathData(d: string, scale: number): string {
  return d.replace(/-?\d+(\.\d+)?/g, (token) => String(parseFloat(token) * scale))
}
