import { renderStaticExport } from '../canvas/exportRenderer'
import type { ExportContext } from '../canvas/exportRenderer'
import { generateExportFrames } from '../animation/exportFrameGenerator'
import { encodeFramesToGif, blobToDataUrl } from './gifEncoder'

export type ExportFormat = 'png' | 'jpg' | 'gif' | 'webm' | 'mp4'

export interface ExportResult {
  canceled: boolean
  path?: string
  error?: string
}

export interface ExportProgressCallbacks {
  onFrameProgress?: (frameIndex: number, totalFrames: number) => void
  onEncodeProgress?: (percent: number) => void
}

function canvasToDataUrl(canvas: HTMLCanvasElement, format: 'png' | 'jpg'): string {
  return format === 'jpg' ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png')
}

async function exportStaticImage(
  ctx: ExportContext,
  format: 'png' | 'jpg',
  suggestedBaseName: string
): Promise<ExportResult> {
  const canvas = await renderStaticExport(ctx)
  const dataUrl = canvasToDataUrl(canvas, format)
  return window.api.dialog.saveFile({
    dataUrl,
    suggestedName: `${suggestedBaseName}.${format}`,
    filterName: format === 'jpg' ? 'JPEG-Bild' : 'PNG-Bild',
    extensions: [format]
  })
}

async function exportGif(
  ctx: ExportContext,
  fps: number,
  durationMs: number,
  suggestedBaseName: string,
  callbacks?: ExportProgressCallbacks
): Promise<ExportResult> {
  const frames = await generateExportFrames(ctx, { fps, durationMs }, callbacks?.onFrameProgress)
  const blob = await encodeFramesToGif(frames, { fps }, callbacks?.onEncodeProgress)
  const dataUrl = await blobToDataUrl(blob)
  return window.api.dialog.saveFile({
    dataUrl,
    suggestedName: `${suggestedBaseName}.gif`,
    filterName: 'GIF-Animation',
    extensions: ['gif']
  })
}

async function exportVideo(
  ctx: ExportContext,
  format: 'webm' | 'mp4',
  fps: number,
  durationMs: number,
  suggestedBaseName: string,
  callbacks?: ExportProgressCallbacks
): Promise<ExportResult> {
  const frames = await generateExportFrames(ctx, { fps, durationMs }, callbacks?.onFrameProgress)
  const jobId = crypto.randomUUID()

  for (let i = 0; i < frames.length; i++) {
    const dataUrl = frames[i].toDataURL('image/png')
    await window.api.export.writeFrame({ jobId, frameIndex: i, dataUrl })
  }

  const unsubscribe = window.api.export.onProgress((progress) => {
    if (progress.jobId === jobId) callbacks?.onEncodeProgress?.(progress.progressPercent)
  })

  try {
    return await window.api.export.encodeVideo({
      jobId,
      frameCount: frames.length,
      fps,
      format,
      suggestedName: `${suggestedBaseName}.${format}`
    })
  } finally {
    unsubscribe()
  }
}

export async function runExport(
  format: ExportFormat,
  ctx: ExportContext,
  options: { fps: number; durationMs: number },
  suggestedBaseName: string,
  callbacks?: ExportProgressCallbacks
): Promise<ExportResult> {
  switch (format) {
    case 'png':
    case 'jpg':
      return exportStaticImage(ctx, format, suggestedBaseName)
    case 'gif':
      return exportGif(ctx, options.fps, options.durationMs, suggestedBaseName, callbacks)
    case 'webm':
    case 'mp4':
      return exportVideo(ctx, format, options.fps, options.durationMs, suggestedBaseName, callbacks)
    default:
      return { canceled: true, error: `Unbekanntes Format: ${format}` }
  }
}
