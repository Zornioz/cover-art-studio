import { mulberry32 } from './seededRandom'

export interface DatamoshParams {
  blockSize: number // px
  probability: number // 0-1, chance a block gets displaced
  maxOffset: number // px
  seed: number
}

export function datamosh(imageData: ImageData, params: DatamoshParams): ImageData {
  const { width, height, data } = imageData
  const { blockSize, probability, maxOffset, seed } = params
  const bs = Math.max(2, Math.floor(blockSize))
  const random = mulberry32(Math.floor(seed * 1000) >>> 0)

  const src = new Uint8ClampedArray(data) // pristine source, never mutated
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

  for (let by = 0; by < height; by += bs) {
    for (let bx = 0; bx < width; bx += bs) {
      if (random() > probability) continue

      const offsetX = Math.round((random() * 2 - 1) * maxOffset)
      const offsetY = Math.round((random() * 2 - 1) * maxOffset)
      const blockW = Math.min(bs, width - bx)
      const blockH = Math.min(bs, height - by)

      for (let y = 0; y < blockH; y++) {
        const destRow = by + y
        const srcRow = clamp(destRow + offsetY, 0, height - 1)
        for (let x = 0; x < blockW; x++) {
          const destCol = bx + x
          const srcCol = clamp(destCol + offsetX, 0, width - 1)
          const destI = (destRow * width + destCol) * 4
          const srcI = (srcRow * width + srcCol) * 4
          data[destI] = src[srcI]
          data[destI + 1] = src[srcI + 1]
          data[destI + 2] = src[srcI + 2]
          data[destI + 3] = src[srcI + 3]
        }
      }
    }
  }

  return imageData
}
