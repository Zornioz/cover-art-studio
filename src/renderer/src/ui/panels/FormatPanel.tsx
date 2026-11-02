import { useProjectStore } from '../../state/projectStore'
import { CANVAS_FORMAT_PRESETS, type CanvasFormatMode } from '../../canvas/canvasFormat'
import { Slider, Section } from '../controls'

const MODE_LABELS: Record<CanvasFormatMode, string> = {
  original: 'Original',
  preset: 'Vorlage',
  custom: 'Eigene Größe'
}

function FormatPanel(): JSX.Element {
  const canvasFormat = useProjectStore((s) => s.canvasFormat)
  const setCanvasFormat = useProjectStore((s) => s.setCanvasFormat)

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Format">
        <div className="flex gap-1.5">
          {(['original', 'preset', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCanvasFormat({ mode })}
              className={`flex-1 rounded border px-2 py-1 text-[11px] ${
                canvasFormat.mode === mode
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {canvasFormat.mode === 'preset' && (
          <div className="flex flex-col gap-1">
            {CANVAS_FORMAT_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setCanvasFormat({ presetId: p.id })}
                className={`rounded border px-2.5 py-1.5 text-left text-xs ${
                  canvasFormat.presetId === p.id
                    ? 'border-app-accent bg-app-accent/20 text-white'
                    : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {p.label}
                <span className="ml-1 text-[10px] text-white/40">
                  {p.width}×{p.height}
                </span>
              </button>
            ))}
          </div>
        )}

        {canvasFormat.mode === 'custom' && (
          <div className="flex items-center gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-white/70">
              <span>Breite</span>
              <input
                type="number"
                min={1}
                value={canvasFormat.customWidth}
                onChange={(e) =>
                  setCanvasFormat({ customWidth: parseInt(e.target.value, 10) || 1 })
                }
                className="rounded border border-app-border bg-white/5 px-2 py-1 text-white/90"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-white/70">
              <span>Höhe</span>
              <input
                type="number"
                min={1}
                value={canvasFormat.customHeight}
                onChange={(e) =>
                  setCanvasFormat({ customHeight: parseInt(e.target.value, 10) || 1 })
                }
                className="rounded border border-app-border bg-white/5 px-2 py-1 text-white/90"
              />
            </label>
          </div>
        )}

        {canvasFormat.mode !== 'original' && (
          <Slider
            label="Rand-Unschärfe"
            value={canvasFormat.bleedBlur}
            min={0}
            max={1}
            onChange={(v) => setCanvasFormat({ bleedBlur: v })}
          />
        )}

        {canvasFormat.mode !== 'original' && (
          <p className="text-[11px] text-white/30">
            Passt das Bild nicht in das Format, wird der Rand mit einer unscharfen, vergrößerten
            Kopie des Bildes gefüllt (ideal für Story/Post-Formate).
          </p>
        )}
      </Section>
    </aside>
  )
}

export default FormatPanel
