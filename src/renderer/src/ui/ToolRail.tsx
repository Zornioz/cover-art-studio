import { useCallback } from 'react'
import { useProjectStore } from '../state/projectStore'
import type { ActiveTool, CutoutShape } from '../state/projectStore'

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

function RailButton(props: {
  title: string
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`flex h-9 w-9 items-center justify-center rounded text-base ${
        props.active
          ? 'bg-app-accent/20 text-white'
          : 'text-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'
      }`}
    >
      {props.children}
    </button>
  )
}

function ToolRail(props: { onAddText: () => void; onSelectBrush: () => void }): JSX.Element {
  const activeTool = useProjectStore((s) => s.activeTool)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const cutoutShape = useProjectStore((s) => s.cutoutShape)
  const setCutoutShape = useProjectStore((s) => s.setCutoutShape)
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const imageLayers = useProjectStore((s) => s.imageLayers)
  const addImageLayer = useProjectStore((s) => s.addImageLayer)

  const isImageLayerSelected = imageLayers.some((l) => l.id === selectedLayerId)

  const handleSelectTool = useCallback(
    (tool: ActiveTool) => {
      setActiveTool(tool)
      if (tool === 'paint') props.onSelectBrush()
    },
    [setActiveTool, props]
  )

  const handleAddImageLayer = useCallback(async () => {
    const result = await window.api.dialog.openImage()
    if (result.canceled || !result.data) return
    const { width, height } = await loadImageDimensions(result.data)
    addImageLayer(result.data, width, height)
  }, [addImageLayer])

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-app-border bg-app-panel py-3">
      <RailButton title="Auswahl" active={activeTool === 'select'} onClick={() => handleSelectTool('select')}>
        ⬉
      </RailButton>
      <RailButton
        title="Ausschneiden (nur bei ausgewählter Bildebene)"
        active={activeTool === 'cutout'}
        disabled={!isImageLayerSelected}
        onClick={() => handleSelectTool('cutout')}
      >
        ✂
      </RailButton>
      {activeTool === 'cutout' && (
        <div className="flex flex-col gap-0.5">
          {(['freehand', 'rect', 'ellipse'] as CutoutShape[]).map((shape) => (
            <button
              key={shape}
              onClick={() => setCutoutShape(shape)}
              title={shape === 'freehand' ? 'Freihand' : shape === 'rect' ? 'Rechteck' : 'Ellipse'}
              className={`flex h-6 w-9 items-center justify-center rounded text-[10px] ${
                cutoutShape === shape
                  ? 'bg-app-accent/20 text-white'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              {shape === 'freehand' ? '✎' : shape === 'rect' ? '▭' : '◯'}
            </button>
          ))}
        </div>
      )}
      <RailButton title="Pinsel (Effekte malen)" active={activeTool === 'paint'} onClick={() => handleSelectTool('paint')}>
        🖌
      </RailButton>

      <div className="my-1 h-px w-8 bg-app-border" />

      <RailButton title="Bildebene hinzufügen" active={false} onClick={handleAddImageLayer}>
        🖼
      </RailButton>
      <RailButton title="Text hinzufügen" active={false} onClick={props.onAddText}>
        𝗧
      </RailButton>
    </div>
  )
}

export default ToolRail
