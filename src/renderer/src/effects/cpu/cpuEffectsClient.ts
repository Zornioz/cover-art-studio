import type { PixelSortParams } from './pixelSort'
import type { DatamoshParams } from './datamosh'
import type { CpuEffectsRequest, CpuEffectsResponse } from './worker'

export class CpuEffectsClient {
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, (buffer: ArrayBuffer) => void>()

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<CpuEffectsResponse>) => {
      const resolve = this.pending.get(event.data.id)
      if (resolve) {
        this.pending.delete(event.data.id)
        resolve(event.data.buffer)
      }
    }
  }

  async process(
    imageData: ImageData,
    pixelSortParams: PixelSortParams | null,
    datamoshParams: DatamoshParams | null
  ): Promise<ImageData> {
    const id = this.nextId++
    const buffer = imageData.data.buffer.slice(0)

    const result = await new Promise<ArrayBuffer>((resolve) => {
      this.pending.set(id, resolve)
      const request: CpuEffectsRequest = {
        id,
        width: imageData.width,
        height: imageData.height,
        buffer,
        pixelSort: pixelSortParams,
        datamosh: datamoshParams
      }
      this.worker.postMessage(request, [buffer])
    })

    return new ImageData(new Uint8ClampedArray(result), imageData.width, imageData.height)
  }

  dispose(): void {
    this.worker.terminate()
  }
}
