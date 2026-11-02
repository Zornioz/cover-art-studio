import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types/ipcContracts'
import type { Api } from '@shared/types/api'
import type { ExportProgress, OpenedFile } from '@shared/types/ipcContracts'

const api: Api = {
  dialog: {
    openImage: () => ipcRenderer.invoke(IPC.dialogOpenImage),
    saveFile: (args) => ipcRenderer.invoke(IPC.dialogSaveFile, args)
  },
  export: {
    writeFrame: (args) => ipcRenderer.invoke(IPC.exportWriteFrame, args),
    encodeVideo: (args) => ipcRenderer.invoke(IPC.exportEncodeVideo, args),
    cleanupFrames: (jobId) => ipcRenderer.invoke(IPC.exportCleanupFrames, jobId),
    onProgress: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: ExportProgress): void =>
        callback(progress)
      ipcRenderer.on(IPC.exportProgress, listener)
      return () => ipcRenderer.removeListener(IPC.exportProgress, listener)
    }
  },
  file: {
    takeLaunchFile: () => ipcRenderer.invoke(IPC.fileTakeLaunch),
    onOpen: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, file: OpenedFile): void => callback(file)
      ipcRenderer.on(IPC.fileOpened, listener)
      return () => ipcRenderer.removeListener(IPC.fileOpened, listener)
    }
  },
  project: {
    save: (args) => ipcRenderer.invoke(IPC.projectSave, args),
    open: () => ipcRenderer.invoke(IPC.projectOpen)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error non-isolated fallback, not used in production
  window.api = api
}
