import { EffectsGLRenderer } from './webgl/glContext'
import { CpuEffectsClient } from './cpu/cpuEffectsClient'
import type { EffectsSettings } from './types'

export class EffectsPipeline {
  private glRenderer = new EffectsGLRenderer()
  private cpuClient = new CpuEffectsClient()
  readonly outputCanvas: HTMLCanvasElement
  private outputCtx: CanvasRenderingContext2D

  constructor() {
    this.outputCanvas = document.createElement('canvas')
    const ctx = this.outputCanvas.getContext('2d')
    if (!ctx) throw new Error('2D-Canvas-Kontext konnte nicht erstellt werden.')
    this.outputCtx = ctx
  }

  setSourceImage(image: TexImageSource, width: number, height: number): void {
    this.glRenderer.setSourceImage(image, width, height)
  }

  async render(
    settings: EffectsSettings,
    outWidth?: number,
    outHeight?: number,
    timeSec = 0
  ): Promise<HTMLCanvasElement> {
    this.glRenderer.render(settings, timeSec, outWidth, outHeight)

    const { width, height } = this.glRenderer.canvas
    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width
      this.outputCanvas.height = height
    }
    this.outputCtx.clearRect(0, 0, width, height)
    this.outputCtx.drawImage(this.glRenderer.canvas, 0, 0)

    const { pixelSort, datamosh } = settings.glitch
    if (pixelSort.enabled || datamosh.enabled) {
      const imageData = this.outputCtx.getImageData(0, 0, width, height)
      const result = await this.cpuClient.process(
        imageData,
        pixelSort.enabled
          ? {
              thresholdLow: pixelSort.thresholdLow,
              thresholdHigh: pixelSort.thresholdHigh,
              direction: pixelSort.direction
            }
          : null,
        datamosh.enabled
          ? {
              blockSize: datamosh.blockSize,
              probability: datamosh.probability,
              maxOffset: datamosh.maxOffset,
              seed: settings.seed
            }
          : null
      )
      this.outputCtx.putImageData(result, 0, 0)
    }

    return this.outputCanvas
  }

  /**
   * GL-only, synchronous: no CPU pixel-sort/datamosh pass, no 2D copy — returns the
   * live WebGL canvas directly (preserveDrawingBuffer: true makes this safe to read
   * immediately). For the continuous live-preview loop only; export always uses the
   * full render() so pixel-sort/datamosh still apply there.
   */
  renderPreviewFrame(
    settings: EffectsSettings,
    outWidth: number,
    outHeight: number,
    timeSec: number
  ): HTMLCanvasElement {
    this.glRenderer.render(settings, timeSec, outWidth, outHeight)
    return this.glRenderer.canvas
  }

  dispose(): void {
    this.glRenderer.dispose()
    this.cpuClient.dispose()
  }
}
