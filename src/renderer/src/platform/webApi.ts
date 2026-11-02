import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer'
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer'
import type { Api } from '@shared/types/api'
import type {
  ExportProgress,
  ExportVideoArgs,
  ExportVideoResult,
  OpenImageResult,
  OpenProjectResult,
  ProjectFile
} from '@shared/types/ipcContracts'

// Browser implementation of the preload `Api` (see src/preload/index.ts). Used when the
// renderer runs without Electron, e.g. on GitHub Pages.

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob()
}

const frameStore = new Map<string, Blob[]>()
const progressListeners = new Set<(p: ExportProgress) => void>()

function emitProgress(jobId: string, progressPercent: number): void {
  for (const listener of progressListeners) listener({ jobId, progressPercent })
}

interface VideoSetup {
  codec: string
  width: number
  height: number
}

// H.264 / VP9 need even dimensions; crop one pixel at most.
const evenDown = (n: number): number => n - (n % 2)

async function findSupportedConfig(
  format: 'mp4' | 'webm',
  width: number,
  height: number,
  fps: number
): Promise<VideoSetup> {
  const candidates =
    format === 'mp4'
      ? ['avc1.640033', 'avc1.4d0033', 'avc1.42003e']
      : ['vp09.00.51.08', 'vp09.00.10.08', 'vp8']
  const w = evenDown(width)
  const h = evenDown(height)
  for (const codec of candidates) {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width: w,
      height: h,
      framerate: fps,
      bitrate: 8_000_000
    })
    if (support.supported) return { codec, width: w, height: h }
  }
  throw new Error(
    `${format.toUpperCase()}-Export wird von diesem Browser für ${w}×${h} nicht unterstützt. Nutze GIF oder einen aktuellen Chrome/Edge.`
  )
}

async function encodeVideo(args: ExportVideoArgs): Promise<ExportVideoResult> {
  const blobs = frameStore.get(args.jobId)
  if (!blobs || blobs.length === 0) return { canceled: false, error: 'Keine Frames vorhanden.' }
  if (typeof VideoEncoder === 'undefined') {
    return {
      canceled: false,
      error: 'Video-Export benötigt WebCodecs (aktueller Chrome, Edge, Safari oder Firefox).'
    }
  }

  try {
    const first = await createImageBitmap(blobs[0])
    const { codec, width, height } = await findSupportedConfig(
      args.format,
      first.width,
      first.height,
      args.fps
    )
    first.close()

    const isMp4 = args.format === 'mp4'
    const mp4Target = new Mp4Target()
    const webmTarget = new WebmTarget()
    const muxer = isMp4
      ? new Mp4Muxer({
          target: mp4Target,
          video: { codec: 'avc', width, height },
          fastStart: 'in-memory'
        })
      : new WebmMuxer({
          target: webmTarget,
          video: { codec: codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width, height, frameRate: args.fps }
        })

    let encodeError: Error | null = null
    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        // The two muxers expose the same method with distinct (but compatible) types.
        ;(muxer as Mp4Muxer<Mp4Target>).addVideoChunk(chunk, meta)
      },
      error: (e) => {
        encodeError = e
      }
    })
    encoder.configure({ codec, width, height, framerate: args.fps, bitrate: 8_000_000 })

    const frameDurationUs = Math.round(1_000_000 / args.fps)
    for (let i = 0; i < blobs.length; i++) {
      if (encodeError) throw encodeError
      const bitmap = await createImageBitmap(blobs[i])
      const frame = new VideoFrame(bitmap, {
        timestamp: i * frameDurationUs,
        duration: frameDurationUs,
        visibleRect: { x: 0, y: 0, width, height }
      })
      encoder.encode(frame, { keyFrame: i % (args.fps * 2) === 0 })
      frame.close()
      bitmap.close()
      // Back-pressure: the encoder queue holds raw frames in memory.
      while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 5))
      emitProgress(args.jobId, Math.round(((i + 1) / blobs.length) * 100))
    }

    await encoder.flush()
    encoder.close()
    if (encodeError) throw encodeError
    muxer.finalize()

    const buffer = isMp4 ? mp4Target.buffer : webmTarget.buffer
    download(new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' }), args.suggestedName)
    return { canceled: false, path: args.suggestedName }
  } catch (err) {
    return { canceled: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    frameStore.delete(args.jobId)
  }
}

export const webApi: Api = {
  dialog: {
    openImage: async (): Promise<OpenImageResult> => {
      const file = await pickFile('image/png,image/jpeg,image/webp')
      if (!file) return { canceled: true }
      return { canceled: false, data: await readAsDataUrl(file), fileName: file.name }
    },
    saveFile: async (args) => {
      download(await dataUrlToBlob(args.dataUrl), args.suggestedName)
      return { canceled: false, path: args.suggestedName }
    }
  },
  export: {
    writeFrame: async ({ jobId, frameIndex, dataUrl }) => {
      const blobs = frameStore.get(jobId) ?? []
      blobs[frameIndex] = await dataUrlToBlob(dataUrl)
      frameStore.set(jobId, blobs)
      return { ok: true }
    },
    encodeVideo,
    cleanupFrames: async (jobId) => {
      frameStore.delete(jobId)
    },
    onProgress: (callback) => {
      progressListeners.add(callback)
      return () => progressListeners.delete(callback)
    }
  },
  file: {
    takeLaunchFile: async () => null,
    onOpen: () => () => {}
  },
  project: {
    save: async ({ project, path }) => {
      const name = path ?? `${project.name || 'cover'}.coverart`
      download(new Blob([JSON.stringify(project)], { type: 'application/json' }), name)
      return { canceled: false, path: name }
    },
    open: async (): Promise<OpenProjectResult> => {
      const file = await pickFile('.coverart,application/json')
      if (!file) return { canceled: true }
      const project = JSON.parse(await file.text()) as ProjectFile
      return { canceled: false, project, path: file.name }
    }
  }
}

export function installWebApiIfNeeded(): void {
  if (!(window as { api?: Api }).api) {
    window.api = webApi
  }
}
