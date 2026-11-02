import { pixelSort, type PixelSortParams } from './pixelSort'
import { datamosh, type DatamoshParams } from './datamosh'

export interface CpuEffectsRequest {
  id: number
  width: number
  height: number
  buffer: ArrayBuffer // RGBA8 pixel data
  pixelSort: PixelSortParams | null
  datamosh: DatamoshParams | null
}

export interface CpuEffectsResponse {
  id: number
  buffer: ArrayBuffer
}

self.onmessage = (event: MessageEvent<CpuEffectsRequest>) => {
  const { id, width, height, buffer, pixelSort: sortParams, datamosh: moshParams } = event.data

  let imageData = new ImageData(new Uint8ClampedArray(buffer), width, height)

  if (moshParams) {
    imageData = datamosh(imageData, moshParams)
  }
  if (sortParams) {
    imageData = pixelSort(imageData, sortParams)
  }

  const response: CpuEffectsResponse = { id, buffer: imageData.data.buffer }
  ;(self as unknown as Worker).postMessage(response, [imageData.data.buffer])
}
