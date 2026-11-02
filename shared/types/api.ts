import type {
  OpenImageResult,
  SaveFileArgs,
  SaveFileResult,
  WriteFrameArgs,
  WriteFrameResult,
  ExportVideoArgs,
  ExportVideoResult,
  ExportProgress,
  SaveProjectArgs,
  SaveProjectResult,
  OpenProjectResult,
  OpenedFile
} from './ipcContracts'

export interface Api {
  dialog: {
    openImage: () => Promise<OpenImageResult>
    saveFile: (args: SaveFileArgs) => Promise<SaveFileResult>
  }
  export: {
    writeFrame: (args: WriteFrameArgs) => Promise<WriteFrameResult>
    encodeVideo: (args: ExportVideoArgs) => Promise<ExportVideoResult>
    cleanupFrames: (jobId: string) => Promise<void>
    onProgress: (callback: (progress: ExportProgress) => void) => () => void
  }
  file: {
    /** File passed on the command line at startup, if any (returned once). */
    takeLaunchFile: () => Promise<OpenedFile | null>
    /** Files passed to an already running instance. */
    onOpen: (callback: (file: OpenedFile) => void) => () => void
  }
  project: {
    save: (args: SaveProjectArgs) => Promise<SaveProjectResult>
    open: () => Promise<OpenProjectResult>
  }
}
