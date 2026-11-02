import { useProjectStore } from '../../state/projectStore'
import { MASKABLE_EFFECT_GROUPS, MASKABLE_EFFECT_GROUP_LABELS } from '../../canvas/paintMaskBlend'
import type { MaskableEffectGroup } from '../../canvas/paintMaskBlend'
import { Slider, Section } from '../controls'

function BrushPanel(): JSX.Element {
  const paintBrush = useProjectStore((s) => s.paintBrush)
  const setPaintBrush = useProjectStore((s) => s.setPaintBrush)
  const paintMasks = useProjectStore((s) => s.paintMasks)
  const clearPaintMask = useProjectStore((s) => s.clearPaintMask)
  const invertPaintMask = useProjectStore((s) => s.invertPaintMask)
  const activeTool = useProjectStore((s) => s.activeTool)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)

  const hasMask = Boolean(paintMasks[paintBrush.group])

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Effekt-Pinsel">
        <p className="text-[11px] text-white/30">
          Wähle einen Effekt als Pinsel und male damit direkt auf das Bild — Striche blenden
          diesen Effekt lokal ein oder aus, für abstrakte, gemalte Looks.
        </p>

        {activeTool !== 'paint' && (
          <button
            onClick={() => setActiveTool('paint')}
            className="self-start rounded-md border border-app-accent bg-app-accent/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-app-accent/30"
          >
            Pinsel-Werkzeug aktivieren
          </button>
        )}

        <label className="flex items-center justify-between text-xs text-white/70">
          <span>Effekt</span>
          <select
            value={paintBrush.group}
            onChange={(e) => setPaintBrush({ group: e.target.value as MaskableEffectGroup })}
            className="rounded border border-app-border bg-white/5 px-2 py-1.5 text-white/90"
          >
            {MASKABLE_EFFECT_GROUPS.map((group) => (
              <option key={group} value={group}>
                {MASKABLE_EFFECT_GROUP_LABELS[group]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-1.5">
          {(['erase', 'restore'] as const).map((polarity) => (
            <button
              key={polarity}
              onClick={() => setPaintBrush({ polarity })}
              className={`flex-1 rounded border px-2 py-1 text-[11px] ${
                paintBrush.polarity === polarity
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {polarity === 'erase' ? 'Entfernen' : 'Hinzufügen'}
            </button>
          ))}
        </div>

        <Slider
          label="Größe"
          value={paintBrush.size}
          min={5}
          max={300}
          onChange={(v) => setPaintBrush({ size: v })}
        />
        <Slider
          label="Weichheit"
          value={paintBrush.softness}
          min={0}
          max={1}
          onChange={(v) => setPaintBrush({ softness: v })}
        />
        <Slider
          label="Stärke"
          value={paintBrush.strength}
          min={0.05}
          max={1}
          onChange={(v) => setPaintBrush({ strength: v })}
        />

        <div className="flex gap-1.5">
          <button
            onClick={() => invertPaintMask(paintBrush.group)}
            disabled={!hasMask}
            className="flex-1 rounded border border-app-border bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Maske umkehren
          </button>
          <button
            onClick={() => clearPaintMask(paintBrush.group)}
            disabled={!hasMask}
            className="flex-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Maske zurücksetzen
          </button>
        </div>
      </Section>
    </aside>
  )
}

export default BrushPanel
