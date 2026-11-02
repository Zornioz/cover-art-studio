import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { IPC } from '@shared/types/ipcContracts'
import type { ExportVideoArgs, ExportVideoResult, WriteFrameArgs, WriteFrameResult } from '@shared/types/ipcContracts'
import { ensureFramesDir, encodeVideo, cleanupFramesDir } from '../services/ffmpegService'

export function registerExportHandlers(): void {
  ipcMain.handle(IPC.exportWriteFrame, async (_event, args: WriteFrameArgs): Promise<WriteFrameResult> => {
    const dir = await ensureFramesDir(args.jobId)
    const fileName = `frame-${String(args.frameIndex).padStart(4, '0')}.png`
    const base64 = args.dataUrl.split(',')[1] ?? ''
    await writeFile(join(dir, fileName), Buffer.from(base64, 'base64'))
    return { ok: true }
  })

  ipcMain.handle(
    IPC.exportEncodeVideo,
    async (event, args: ExportVideoArgs): Promise<ExportVideoResult> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const extension = args.format
      const options: Electron.SaveDialogOptions = {
        title: 'Video-Export speichern',
        defaultPath: args.suggestedName,
        filters: [{ name: args.format.toUpperCase(), extensions: [extension] }]
      }
      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled || !result.filePath) {
        await cleanupFramesDir(args.jobId)
        return { canceled: true }
      }

      try {
        await encodeVideo(args.jobId, args.frameCount, args.fps, args.format, result.filePath, (percent) => {
          event.sender.send(IPC.exportProgress, { jobId: args.jobId, progressPercent: percent })
        })
        return { canceled: false, path: result.filePath }
      } catch (err) {
        return { canceled: false, error: err instanceof Error ? err.message : String(err) }
      } finally {
        await cleanupFramesDir(args.jobId)
      }
    }
  )

  ipcMain.handle(IPC.exportCleanupFrames, async (_event, jobId: string): Promise<void> => {
    await cleanupFramesDir(jobId)
  })
}
