import type { ProjectFile } from './project'

export interface OpenImageResult {
  canceled: boolean
  data?: string // base64 data URL
  width?: number
  height?: number
  fileName?: string
}

// A file handed to the app from outside (Explorer "Open with", double-click, command line).
export type OpenedFile =
  | { kind: 'image'; data: string; fileName: string }
  | { kind: 'project'; project: ProjectFile; path: string }

export interface SaveFileArgs {
  dataUrl: string
  suggestedName: string
  filterName: string
  extensions: string[]
}

export interface SaveFileResult {
  canceled: boolean
  path?: string
}

export interface SaveProjectArgs {
  project: ProjectFile
  path?: string // if omitted, show Save As dialog
}

export interface SaveProjectResult {
  canceled: boolean
  path?: string
}

export interface OpenProjectResult {
  canceled: boolean
  project?: ProjectFile
  path?: string
}

export interface ExportVideoArgs {
  jobId: string
  frameCount: number
  fps: number
  format: 'webm' | 'mp4'
  suggestedName: string
}

export interface ExportVideoResult {
  canceled: boolean
  path?: string
  error?: string
}

export interface ExportProgress {
  jobId: string
  progressPercent: number
}

export const IPC = {
  dialogOpenImage: 'dialog:open-image',
  dialogSaveFile: 'dialog:save-file',
  projectSave: 'project:save',
  projectOpen: 'project:open',
  exportWriteFrame: 'export:write-frame',
  exportEncodeVideo: 'export:encode-video',
  exportProgress: 'export:progress',
  exportCleanupFrames: 'export:cleanup-frames',
  fileTakeLaunch: 'file:take-launch',
  fileOpened: 'file:opened'
} as const

export interface WriteFrameArgs {
  jobId: string
  frameIndex: number
  dataUrl: string
}

export interface WriteFrameResult {
  ok: true
}

export type { ProjectFile }
