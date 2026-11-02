import { readFile } from 'fs/promises'
import { extname, basename } from 'path'
import type { OpenedFile, ProjectFile } from '@shared/types/ipcContracts'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

const PROJECT_EXT = '.coverart'

export function isSupportedFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ext === PROJECT_EXT || ext in MIME_BY_EXT
}

export async function readImageFile(filePath: string): Promise<{ data: string; fileName: string }> {
  const mime = MIME_BY_EXT[extname(filePath).toLowerCase()] ?? 'image/png'
  const buffer = await readFile(filePath)
  return { data: `data:${mime};base64,${buffer.toString('base64')}`, fileName: basename(filePath) }
}

export async function readProjectFile(filePath: string): Promise<ProjectFile> {
  return JSON.parse(await readFile(filePath, 'utf-8')) as ProjectFile
}

export async function readOpenedFile(filePath: string): Promise<OpenedFile> {
  if (extname(filePath).toLowerCase() === PROJECT_EXT) {
    return { kind: 'project', project: await readProjectFile(filePath), path: filePath }
  }
  return { kind: 'image', ...(await readImageFile(filePath)) }
}
