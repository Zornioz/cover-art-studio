import { useState } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { Section } from '../controls'

interface MergedLayer {
  id: string
  kind: 'text' | 'image'
  name: string
  order: number
  visible: boolean
  opacity: number
}

function LayersPanel(): JSX.Element {
  const textLayers = useProjectStore((s) => s.textLayers)
  const imageLayers = useProjectStore((s) => s.imageLayers)
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const setSelectedLayerId = useProjectStore((s) => s.setSelectedLayerId)
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer)
  const updateImageLayer = useProjectStore((s) => s.updateImageLayer)
  const removeTextLayer = useProjectStore((s) => s.removeTextLayer)
  const removeImageLayer = useProjectStore((s) => s.removeImageLayer)
  const reorderLayers = useProjectStore((s) => s.reorderLayers)

  const [dragId, setDragId] = useState<string | null>(null)

  const merged: MergedLayer[] = [
    ...textLayers.map((l) => ({
      id: l.id,
      kind: 'text' as const,
      name: l.text || '(leerer Text)',
      order: l.order,
      visible: l.visible,
      opacity: l.opacity
    })),
    ...imageLayers.map((l) => ({
      id: l.id,
      kind: 'image' as const,
      name: 'Bildebene',
      order: l.order,
      visible: l.visible,
      opacity: l.opacity
    }))
  ].sort((a, b) => b.order - a.order) // topmost (highest order) first, like Photoshop

  const toggleVisible = (layer: MergedLayer): void => {
    if (layer.kind === 'text') updateTextLayer(layer.id, { visible: !layer.visible })
    else updateImageLayer(layer.id, { visible: !layer.visible })
  }

  const setOpacity = (layer: MergedLayer, opacity: number): void => {
    if (layer.kind === 'text') updateTextLayer(layer.id, { opacity })
    else updateImageLayer(layer.id, { opacity })
  }

  const remove = (layer: MergedLayer): void => {
    if (layer.kind === 'text') removeTextLayer(layer.id)
    else removeImageLayer(layer.id)
  }

  const handleDrop = (targetId: string): void => {
    if (!dragId || dragId === targetId) return
    // merged is topmost-first; reorderLayers expects back-to-front (lowest order first).
    const backToFront = [...merged].reverse().map((l) => l.id)
    const from = backToFront.indexOf(dragId)
    const to = backToFront.indexOf(targetId)
    backToFront.splice(to, 0, backToFront.splice(from, 1)[0])
    reorderLayers(backToFront)
    setDragId(null)
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Ebenen">
        {merged.length === 0 && <p className="text-[11px] text-white/30">Noch keine Ebenen.</p>}
        <div className="flex flex-col gap-1">
          {merged.map((layer) => (
            <div
              key={layer.id}
              draggable
              onDragStart={() => setDragId(layer.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(layer.id)}
              onClick={() => setSelectedLayerId(layer.id)}
              className={`flex cursor-move flex-col gap-1 rounded border px-2 py-1.5 text-xs ${
                layer.id === selectedLayerId
                  ? 'border-app-accent bg-app-accent/20'
                  : 'border-app-border bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVisible(layer)
                  }}
                  title={layer.visible ? 'Ausblenden' : 'Einblenden'}
                  className="w-4 shrink-0 text-white/70"
                >
                  {layer.visible ? '◉' : '○'}
                </button>
                <span className="shrink-0 text-[10px] uppercase text-white/30">
                  {layer.kind === 'text' ? 'T' : 'Bild'}
                </span>
                <span className="flex-1 truncate">{layer.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(layer)
                  }}
                  className="shrink-0 text-white/30 hover:text-red-300"
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={layer.opacity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setOpacity(layer, parseFloat(e.target.value))}
                className="accent-app-accent"
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-white/30">Ziehen, um die Reihenfolge zu ändern.</p>
      </Section>
    </aside>
  )
}

export default LayersPanel
