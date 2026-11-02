/**
 * Helpers for the "effects on text only" target: the effected composite is shown only
 * where text layers are, everything else keeps the raw (un-effected) composite.
 */

/** Grows the mask's opaque area by roughly `radius` px (two rings of offset copies), so
 *  effects that bleed past the glyph edge (chromatic aberration, light trails, halation)
 *  stay visible instead of being clipped exactly at the letter outline. */
function dilateMask(mask: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = mask.width
  out.height = mask.height
  const ctx = out.getContext('2d')
  if (!ctx) return mask
  ctx.drawImage(mask, 0, 0)
  const rings: Array<[number, number]> = [
    [radius * 0.5, 12],
    [radius, 24]
  ]
  for (const [r, steps] of rings) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      ctx.drawImage(mask, Math.cos(a) * r, Math.sin(a) * r)
    }
  }
  return out
}

/** Edge-bleed radius used for the text mask, scaled to the canvas size. */
export function textMaskRadius(width: number, height: number): number {
  return Math.max(2, Math.round(Math.min(width, height) * 0.01))
}

/**
 * Draws `effected` onto `destCtx` only where `textMask` (alpha = text coverage) is
 * non-transparent. `destCtx` is expected to already hold the raw composite.
 */
export function drawEffectedThroughTextMask(
  destCtx: CanvasRenderingContext2D,
  effected: CanvasImageSource,
  textMask: HTMLCanvasElement,
  width: number,
  height: number
): void {
  const mask = dilateMask(textMask, textMaskRadius(width, height))

  const masked = document.createElement('canvas')
  masked.width = width
  masked.height = height
  const mctx = masked.getContext('2d')
  if (!mctx) return
  mctx.drawImage(effected, 0, 0, width, height)
  mctx.globalCompositeOperation = 'destination-in'
  mctx.drawImage(mask, 0, 0, width, height)

  destCtx.drawImage(masked, 0, 0, width, height)
}
