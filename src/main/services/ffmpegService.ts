import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'
import { app } from 'electron'
import { join } from 'path'
import { mkdir, rm } from 'fs/promises'

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

function exportRootDir(): string {
  return join(app.getPath('temp'), 'coverart-studio-export')
}

export function framesDirFor(jobId: string): string {
  return join(exportRootDir(), jobId)
}

export async function ensureFramesDir(jobId: string): Promise<string> {
  const dir = framesDirFor(jobId)
  await mkdir(dir, { recursive: true })
  return dir
}

export async function cleanupFramesDir(jobId: string): Promise<void> {
  await rm(framesDirFor(jobId), { recursive: true, force: true })
}

export function encodeVideo(
  jobId: string,
  frameCount: number,
  fps: number,
  format: 'webm' | 'mp4',
  outputPath: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const pattern = join(framesDirFor(jobId), 'frame-%04d.png')

  return new Promise((resolve, reject) => {
    const command = ffmpeg().input(pattern).inputFPS(fps).outputOptions(['-pix_fmt', 'yuv420p'])

    if (format === 'webm') {
      command.videoCodec('libvpx-vp9').outputOptions(['-b:v', '0', '-crf', '32'])
    } else {
      command.videoCodec('libx264').outputOptions(['-crf', '18', '-preset', 'medium'])
    }

    command
      .on('progress', (progress) => {
        if (typeof progress.percent === 'number') {
          onProgress?.(Math.max(0, Math.min(100, Math.round(progress.percent))))
        } else if (progress.frames) {
          onProgress?.(Math.max(0, Math.min(100, Math.round((progress.frames / frameCount) * 100))))
        }
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(outputPath)
  })
}
