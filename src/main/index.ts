import { app, shell, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerDialogHandlers } from './ipc/dialogHandlers'
import { registerExportHandlers } from './ipc/exportHandlers'
import { registerProjectHandlers } from './ipc/projectHandlers'
import { IPC } from '@shared/types/ipcContracts'
import { isSupportedFile, readOpenedFile } from './services/fileOpen'

// File passed on the command line (Explorer "Open with" / double-click on a .coverart file).
// Command lines also contain the executable and Chromium flags, so match on extension.
function findFileArg(argv: string[]): string | undefined {
  return argv.slice(1).find((arg) => !arg.startsWith('-') && isSupportedFile(arg))
}

let mainWindow: BrowserWindow | null = null
let launchFilePath = findFileArg(process.argv)

const gotInstanceLock = app.requestSingleInstanceLock()
if (!gotInstanceLock) {
  app.quit()
}

app.on('second-instance', async (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const filePath = findFileArg(argv)
    if (filePath) {
      try {
        mainWindow.webContents.send(IPC.fileOpened, await readOpenedFile(filePath))
      } catch (err) {
        console.error('Datei konnte nicht geöffnet werden:', err)
      }
    }
  }
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (!gotInstanceLock) return

  electronApp.setAppUserModelId('com.coverartstudio.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerDialogHandlers()
  registerExportHandlers()
  registerProjectHandlers()

  ipcMain.handle(IPC.fileTakeLaunch, async () => {
    const filePath = launchFilePath
    launchFilePath = undefined
    if (!filePath) return null
    try {
      return await readOpenedFile(filePath)
    } catch (err) {
      console.error('Datei konnte nicht geöffnet werden:', err)
      return null
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
