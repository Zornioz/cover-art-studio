import GIF from 'gif.js/dist/gif.js'
// Vite statically detects `new URL(specifier, import.meta.url)` and emits the referenced
// file as a bundled asset, resolving its final URL at build time — this works even for a
// bare node_modules specifier. Required because gif.js's own default ("gif.worker.js")
// assumes a web-server root that doesn't exist under Electron's file:// protocol.
const workerScriptUrl = new URL('gif.js/dist/gif.worker.js', import.meta.url).toString()

export interface GifEncodeOptions {
  fps: number
  quality?: number // 1 (best) - 30 (worst), gif.js default 10
}

export async function encodeFramesToGif(
  frames: HTMLCanvasElement[],
  options: GifEncodeOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (frames.length === 0) throw new Error('Keine Frames zum Kodieren vorhanden.')

  const delay = Math.round(1000 / options.fps)
  const gif = new GIF({
    workers: Math.min(4, navigator.hardwareConcurrency || 2),
    quality: options.quality ?? 10,
    width: frames[0].width,
    height: frames[0].height,
    workerScript: workerScriptUrl
  })

  for (const frame of frames) {
    gif.addFrame(frame, { delay, copy: true })
  }

  return new Promise<Blob>((resolve, reject) => {
    gif.on('progress', (p: number) => onProgress?.(Math.round(p * 100)))
    gif.on('finished', (blob: Blob) => resolve(blob))
    try {
      gif.render()
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
