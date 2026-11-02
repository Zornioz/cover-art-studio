import { useCallback, useEffect, useState } from 'react'
import CanvasStage from './canvas/CanvasStage'
import ToolRail from './ui/ToolRail'
import EffectsPanel from './ui/panels/EffectsPanel'
import TextPanel from './ui/panels/TextPanel'
import BorderPanel from './ui/panels/BorderPanel'
import FormatPanel from './ui/panels/FormatPanel'
import MotionPanel from './ui/panels/MotionPanel'
import LayersPanel from './ui/panels/LayersPanel'
import BrushPanel from './ui/panels/BrushPanel'
import ExportDialog from './ui/ExportDialog'
import { useProjectStore } from './state/projectStore'
import type { OpenedFile, ProjectFile } from '@shared/types/ipcContracts'
import { toProjectFile, fromProjectFile, decodePaintMasks } from './state/projectSerialization'

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

type Tab = 'effects' | 'text' | 'border' | 'format' | 'motion' | 'layers' | 'brush'

function App(): JSX.Element {
  const sourceImage = useProjectStore((s) => s.sourceImage)
  const setSourceImage = useProjectStore((s) => s.setSourceImage)
  const addTextLayer = useProjectStore((s) => s.addTextLayer)
  const projectFilePath = useProjectStore((s) => s.projectFilePath)
  const setProjectFilePath = useProjectStore((s) => s.setProjectFilePath)
  const getSerializableState = useProjectStore((s) => s.getSerializableState)
  const loadProjectState = useProjectStore((s) => s.loadProjectState)
  const [status, setStatus] = useState('Kein Bild geladen')
  const [tab, setTab] = useState<Tab>('effects')
  const [exportOpen, setExportOpen] = useState(false)

  const applyImage = useCallback(
    async (data: string, fileName: string) => {
      const { width, height } = await loadImageDimensions(data)
      setSourceImage({ data, width, height, fileName })
      setStatus(`Geladen: ${fileName}`)
    },
    [setSourceImage]
  )

  const applyProject = useCallback(
    async (project: ProjectFile, path: string | null) => {
      const projectState = fromProjectFile(project)
      projectState.paintMasks = await decodePaintMasks(project)
      loadProjectState(projectState, path)
      setStatus(`Projekt geöffnet: ${path}`)
    },
    [loadProjectState]
  )

  const handleOpenImage = useCallback(async () => {
    const result = await window.api.dialog.openImage()
    if (result.canceled || !result.data) return
    await applyImage(result.data, result.fileName ?? 'bild.png')
  }, [applyImage])

  const handleOpenedFile = useCallback(
    async (file: OpenedFile) => {
      if (file.kind === 'image') await applyImage(file.data, file.fileName)
      else await applyProject(file.project, file.path)
    },
    [applyImage, applyProject]
  )

  // Files handed over by the OS: at startup ("Open with") or to an already running window.
  useEffect(() => {
    void window.api.file.takeLaunchFile().then((file) => {
      if (file) void handleOpenedFile(file)
    })
    return window.api.file.onOpen((file) => void handleOpenedFile(file))
  }, [handleOpenedFile])

  const handleAddText = useCallback(() => {
    addTextLayer()
    setTab('text')
  }, [addTextLayer])

  const handleSaveProject = useCallback(async () => {
    const project = toProjectFile(getSerializableState())
    const result = await window.api.project.save({
      project,
      path: projectFilePath ?? undefined
    })
    if (result.canceled) return
    if (result.path) {
      setProjectFilePath(result.path)
      setStatus(`Projekt gespeichert: ${result.path}`)
    }
  }, [getSerializableState, projectFilePath, setProjectFilePath])

  const handleOpenProject = useCallback(async () => {
    const result = await window.api.project.open()
    if (result.canceled || !result.project) return
    await applyProject(result.project, result.path ?? null)
  }, [applyProject])

  return (
    <div className="flex h-full flex-col bg-app-bg text-sm text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-app-border bg-app-panel px-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-app-accent" />
          <span className="font-semibold tracking-wide">CoverArt Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenProject}
            className="rounded-md border border-app-border bg-white/5 px-3 py-1.5 font-medium hover:bg-white/10"
          >
            Projekt öffnen
          </button>
          <button
            onClick={handleSaveProject}
            disabled={!sourceImage}
            className="rounded-md border border-app-border bg-white/5 px-3 py-1.5 font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Projekt speichern
          </button>
          <div className="mx-1 h-5 w-px bg-app-border" />
          <button
            onClick={handleOpenImage}
            className="rounded-md border border-app-border bg-white/5 px-3 py-1.5 font-medium hover:bg-white/10"
          >
            Bild öffnen
          </button>
          <button
            onClick={() => setExportOpen(true)}
            disabled={!sourceImage}
            className="rounded-md bg-app-accent px-3 py-1.5 font-medium text-white enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Exportieren
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#17171f,#0b0b0f)]">
          {sourceImage ? (
            <CanvasStage />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <div className="h-24 w-24 rounded-full border border-dashed border-white/20" />
              <p>Lade ein Bild, um mit der Gestaltung zu beginnen</p>
            </div>
          )}
        </main>

        {sourceImage ? <ToolRail onAddText={handleAddText} onSelectBrush={() => setTab('brush')} /> : null}

        {sourceImage ? (
          <div className="flex shrink-0">
            <div className="flex w-10 flex-col items-center gap-1 border-l border-app-border bg-app-panel py-3">
              <button
                onClick={() => setTab('effects')}
                title="Effekte"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'effects' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                ✨
              </button>
              <button
                onClick={() => setTab('text')}
                title="Text"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'text' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                𝗧
              </button>
              <button
                onClick={() => setTab('border')}
                title="Rahmen"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'border' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                ▢
              </button>
              <button
                onClick={() => setTab('format')}
                title="Format"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'format' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                ⬚
              </button>
              <button
                onClick={() => setTab('motion')}
                title="Bewegte Effekte"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'motion' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                〜
              </button>
              <button
                onClick={() => setTab('layers')}
                title="Ebenen"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'layers' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                ☰
              </button>
              <button
                onClick={() => setTab('brush')}
                title="Pinsel"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  tab === 'brush' ? 'bg-app-accent/20 text-white' : 'text-white/40 hover:bg-white/5'
                }`}
              >
                🖌
              </button>
            </div>
            {tab === 'effects' ? (
              <EffectsPanel />
            ) : tab === 'text' ? (
              <TextPanel />
            ) : tab === 'border' ? (
              <BorderPanel />
            ) : tab === 'format' ? (
              <FormatPanel />
            ) : tab === 'motion' ? (
              <MotionPanel />
            ) : tab === 'layers' ? (
              <LayersPanel />
            ) : (
              <BrushPanel />
            )}
          </div>
        ) : null}
      </div>

      <footer className="flex h-8 shrink-0 items-center border-t border-app-border bg-app-panel px-4 text-xs text-white/50">
        {status}
      </footer>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  )
}

export default App
