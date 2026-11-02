import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { IPC } from '@shared/types/ipcContracts'
import type { SaveProjectArgs, SaveProjectResult, OpenProjectResult, ProjectFile } from '@shared/types/ipcContracts'

const PROJECT_FILTERS = [{ name: 'CoverArt-Projekt', extensions: ['coverart'] }]

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC.projectSave, async (event, args: SaveProjectArgs): Promise<SaveProjectResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    let targetPath = args.path

    if (!targetPath) {
      const options: Electron.SaveDialogOptions = {
        title: 'Projekt speichern',
        defaultPath: `${args.project.name || 'cover'}.coverart`,
        filters: PROJECT_FILTERS
      }
      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return { canceled: true }
      targetPath = result.filePath
    }

    await writeFile(targetPath, JSON.stringify(args.project), 'utf-8')
    return { canceled: false, path: targetPath }
  })

  ipcMain.handle(IPC.projectOpen, async (event): Promise<OpenProjectResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Projekt öffnen',
      properties: ['openFile'],
      filters: PROJECT_FILTERS
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }

    const filePath = result.filePaths[0]
    const raw = await readFile(filePath, 'utf-8')
    const project = JSON.parse(raw) as ProjectFile
    return { canceled: false, project, path: filePath }
  })
}
