import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC } from '@shared/types/ipcContracts'
import type { OpenImageResult, SaveFileArgs, SaveFileResult } from '@shared/types/ipcContracts'
import { readImageFile } from '../services/fileOpen'

export function registerDialogHandlers(): void {
  ipcMain.handle(IPC.dialogOpenImage, async (event): Promise<OpenImageResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Bild öffnen',
      properties: ['openFile'],
      filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const { data, fileName } = await readImageFile(result.filePaths[0])
    return { canceled: false, data, fileName }
  })

  ipcMain.handle(IPC.dialogSaveFile, async (event, args: SaveFileArgs): Promise<SaveFileResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.SaveDialogOptions = {
      title: 'Export speichern',
      defaultPath: args.suggestedName,
      filters: [{ name: args.filterName, extensions: args.extensions }]
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    const base64 = args.dataUrl.split(',')[1] ?? ''
    await writeFile(result.filePath, Buffer.from(base64, 'base64'))

    return { canceled: false, path: result.filePath }
  })
}
