export interface PixelSortParams {
  thresholdLow: number // 0-1
  thresholdHigh: number // 0-1
  direction: 'horizontal' | 'vertical'
}

function luminance(data: Uint8ClampedArray, i: number): number {
  return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
}

function sortRun(
  data: Uint8ClampedArray,
  indices: number[] // pixel byte-offsets (index into data, multiple of 4), in spatial order
): void {
  if (indices.length < 2) return
  const pixels = indices.map((i) => [data[i], data[i + 1], data[i + 2], data[i + 3], luminance(data, i)])
  pixels.sort((a, b) => a[4] - b[4])
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k]
    const [r, g, b, a] = pixels[k]
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = a
  }
}

export function pixelSort(
  imageData: ImageData,
  params: PixelSortParams
): ImageData {
  const { width, height, data } = imageData
  const { thresholdLow, thresholdHigh, direction } = params

  const inRange = (i: number): boolean => {
    const l = luminance(data, i)
    return l >= thresholdLow && l <= thresholdHigh
  }

  if (direction === 'horizontal') {
    for (let y = 0; y < height; y++) {
      const rowStart = y * width * 4
      let run: number[] = []
      for (let x = 0; x < width; x++) {
        const i = rowStart + x * 4
        if (inRange(i)) {
          run.push(i)
        } else if (run.length > 0) {
          sortRun(data, run)
          run = []
        }
      }
      if (run.length > 0) sortRun(data, run)
    }
  } else {
    for (let x = 0; x < width; x++) {
      let run: number[] = []
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4
        if (inRange(i)) {
          run.push(i)
        } else if (run.length > 0) {
          sortRun(data, run)
          run = []
        }
      }
      if (run.length > 0) sortRun(data, run)
    }
  }

  return imageData
}
