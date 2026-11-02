/**
 * Composites an image into a canvas whose aspect ratio may differ from the image's
 * own — the gap is filled with a blurred, cover-scaled copy of the same image (the
 * "Instagram Story" trick) instead of plain bars, then the image is drawn again,
 * sharp, "contain"-scaled and centered on top.
 *
 * Uses Canvas2D's `ctx.filter = 'blur()'` rather than a WebGL blur pass: this only
 * runs when the output format changes (not per animation frame), Electron is
 * Chromium-only so the filter is always supported, and it reuses the same
 * 2D-compositing style already used throughout the app's export path.
 */
export function composeWithBleed(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imgW: number,
  imgH: number,
  outW: number,
  outH: number,
  blurPx: number
): { x: number; y: number; w: number; h: number } {
  ctx.clearRect(0, 0, outW, outH)

  const imgAspect = imgW / imgH
  const outAspect = outW / outH

  if (Math.abs(imgAspect - outAspect) > 0.001) {
    const coverScale = Math.max(outW / imgW, outH / imgH)
    const cw = imgW * coverScale
    const ch = imgH * coverScale
    ctx.save()
    ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none'
    ctx.drawImage(image, (outW - cw) / 2, (outH - ch) / 2, cw, ch)
    ctx.restore()
  }

  const containScale = Math.min(outW / imgW, outH / imgH)
  const w = imgW * containScale
  const h = imgH * containScale
  const x = (outW - w) / 2
  const y = (outH - h) / 2
  ctx.drawImage(image, x, y, w, h)
  return { x, y, w, h }
}
