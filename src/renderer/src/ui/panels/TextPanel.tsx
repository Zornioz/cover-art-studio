import { useProjectStore } from '../../state/projectStore'
import { fontManifest, FONT_CATEGORY_LABELS, type FontCategory } from '../../fonts/fontManifest'
import { Slider, Section } from '../controls'
import { ANIMATION_PRESET_IDS, ANIMATION_PRESET_LABELS } from '../../animation/animationPresets'
import type { AnimationPresetId, SlideDirection } from '../../animation/animationPresets'

const CATEGORIES: FontCategory[] = ['sans', 'display', 'glitch', 'serif', 'script']

function TextPanel(): JSX.Element {
  const textLayers = useProjectStore((s) => s.textLayers)
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const addTextLayer = useProjectStore((s) => s.addTextLayer)
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer)
  const removeTextLayer = useProjectStore((s) => s.removeTextLayer)
  const setSelectedLayerId = useProjectStore((s) => s.setSelectedLayerId)

  const selected = textLayers.find((l) => l.id === selectedLayerId) ?? null

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Textebenen">
        <button
          onClick={() => addTextLayer()}
          className="rounded-md border border-app-border bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
        >
          + Text hinzufügen
        </button>
        <div className="flex flex-col gap-1">
          {textLayers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              className={`truncate rounded px-2 py-1 text-left text-xs ${
                layer.id === selectedLayerId
                  ? 'bg-app-accent/20 text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {layer.text || '(leer)'}
            </button>
          ))}
          {textLayers.length === 0 && (
            <p className="text-[11px] text-white/30">Noch keine Textebenen.</p>
          )}
        </div>
      </Section>

      {selected && (
        <>
          <Section title="Inhalt">
            <textarea
              value={selected.text}
              onChange={(e) => updateTextLayer(selected.id, { text: e.target.value })}
              rows={3}
              className="resize-none rounded border border-app-border bg-white/5 px-2 py-1.5 text-xs text-white/90 outline-none focus:border-app-accent"
            />
          </Section>

          <Section title="Schriftart">
            <select
              value={selected.fontFamily}
              onChange={(e) => updateTextLayer(selected.id, { fontFamily: e.target.value })}
              className="rounded border border-app-border bg-white/5 px-2 py-1.5 text-xs text-white/90"
            >
              {CATEGORIES.map((category) => (
                <optgroup key={category} label={FONT_CATEGORY_LABELS[category]}>
                  {fontManifest
                    .filter((f) => f.category === category)
                    .map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.family}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            <Slider
              label="Größe"
              value={selected.fontSize}
              min={8}
              max={240}
              onChange={(v) => updateTextLayer(selected.id, { fontSize: v })}
            />
            <Slider
              label="Laufweite"
              value={selected.letterSpacing}
              min={-100}
              max={400}
              onChange={(v) => updateTextLayer(selected.id, { letterSpacing: v })}
            />
            <Slider
              label="Deckkraft"
              value={selected.opacity}
              min={0}
              max={1}
              onChange={(v) => updateTextLayer(selected.id, { opacity: v })}
            />

            <label className="flex items-center justify-between text-xs text-white/70">
              <span>Farbe</span>
              <input
                type="color"
                value={selected.fill}
                onChange={(e) => updateTextLayer(selected.id, { fill: e.target.value })}
                className="h-6 w-10 cursor-pointer rounded border border-app-border bg-transparent"
              />
            </label>

            <div className="flex gap-1.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateTextLayer(selected.id, { textAlign: align })}
                  className={`flex-1 rounded border px-2 py-1 text-[11px] ${
                    selected.textAlign === align
                      ? 'border-app-accent bg-app-accent/20 text-white'
                      : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {align === 'left' ? 'Links' : align === 'center' ? 'Mitte' : 'Rechts'}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                updateTextLayer(selected.id, {
                  fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold'
                })
              }
              className={`self-start rounded border px-3 py-1 text-[11px] font-semibold ${
                selected.fontWeight === 'bold'
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Fett
            </button>
          </Section>

          <Section title="Animation">
            <select
              value={selected.animation.presetId}
              onChange={(e) =>
                updateTextLayer(selected.id, {
                  animation: {
                    ...selected.animation,
                    presetId: e.target.value as AnimationPresetId
                  }
                })
              }
              className="rounded border border-app-border bg-white/5 px-2 py-1.5 text-xs text-white/90"
            >
              {ANIMATION_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {ANIMATION_PRESET_LABELS[id]}
                </option>
              ))}
            </select>

            {selected.animation.presetId !== 'none' && (
              <>
                <Slider
                  label="Dauer (ms)"
                  value={selected.animation.durationMs}
                  min={200}
                  max={5000}
                  step={50}
                  onChange={(v) =>
                    updateTextLayer(selected.id, {
                      animation: { ...selected.animation, durationMs: v }
                    })
                  }
                />
                <Slider
                  label="Verzögerung (ms)"
                  value={selected.animation.delayMs}
                  min={0}
                  max={3000}
                  step={50}
                  onChange={(v) =>
                    updateTextLayer(selected.id, {
                      animation: { ...selected.animation, delayMs: v }
                    })
                  }
                />

                {selected.animation.presetId === 'slide-in' && (
                  <>
                    <label className="flex items-center justify-between text-xs text-white/70">
                      <span>Richtung</span>
                      <select
                        value={selected.animation.params.direction}
                        onChange={(e) =>
                          updateTextLayer(selected.id, {
                            animation: {
                              ...selected.animation,
                              params: {
                                ...selected.animation.params,
                                direction: e.target.value as SlideDirection
                              }
                            }
                          })
                        }
                        className="rounded border border-app-border bg-white/5 px-1.5 py-0.5 text-white/80"
                      >
                        <option value="left">Von links</option>
                        <option value="right">Von rechts</option>
                        <option value="top">Von oben</option>
                        <option value="bottom">Von unten</option>
                      </select>
                    </label>
                    <Slider
                      label="Distanz"
                      value={selected.animation.params.distance}
                      min={20}
                      max={400}
                      onChange={(v) =>
                        updateTextLayer(selected.id, {
                          animation: {
                            ...selected.animation,
                            params: { ...selected.animation.params, distance: v }
                          }
                        })
                      }
                    />
                  </>
                )}

                {(selected.animation.presetId === 'glitch-jitter' ||
                  selected.animation.presetId === 'pulse') && (
                  <Slider
                    label={selected.animation.presetId === 'pulse' ? 'Stärke' : 'Amplitude'}
                    value={selected.animation.params.amplitude}
                    min={1}
                    max={30}
                    onChange={(v) =>
                      updateTextLayer(selected.id, {
                        animation: {
                          ...selected.animation,
                          params: { ...selected.animation.params, amplitude: v }
                        }
                      })
                    }
                  />
                )}

                {selected.animation.presetId === 'pulse' && (
                  <Slider
                    label="Zyklen"
                    value={selected.animation.params.cycles}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(v) =>
                      updateTextLayer(selected.id, {
                        animation: {
                          ...selected.animation,
                          params: { ...selected.animation.params, cycles: v }
                        }
                      })
                    }
                  />
                )}

                {(selected.animation.presetId === 'glitch-jitter' ||
                  selected.animation.presetId === 'flicker') && (
                  <Slider
                    label="Schritte/Sek."
                    value={selected.animation.params.stepsPerSecond}
                    min={2}
                    max={30}
                    step={1}
                    onChange={(v) =>
                      updateTextLayer(selected.id, {
                        animation: {
                          ...selected.animation,
                          params: { ...selected.animation.params, stepsPerSecond: v }
                        }
                      })
                    }
                  />
                )}

                {selected.animation.presetId === 'color-shift' && (
                  <>
                    <label className="flex items-center justify-between text-xs text-white/70">
                      <span>Farbe A</span>
                      <input
                        type="color"
                        value={selected.animation.params.colorFrom}
                        onChange={(e) =>
                          updateTextLayer(selected.id, {
                            animation: {
                              ...selected.animation,
                              params: { ...selected.animation.params, colorFrom: e.target.value }
                            }
                          })
                        }
                        className="h-6 w-10 cursor-pointer rounded border border-app-border bg-transparent"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs text-white/70">
                      <span>Farbe B</span>
                      <input
                        type="color"
                        value={selected.animation.params.colorTo}
                        onChange={(e) =>
                          updateTextLayer(selected.id, {
                            animation: {
                              ...selected.animation,
                              params: { ...selected.animation.params, colorTo: e.target.value }
                            }
                          })
                        }
                        className="h-6 w-10 cursor-pointer rounded border border-app-border bg-transparent"
                      />
                    </label>
                  </>
                )}
              </>
            )}
          </Section>

          <Section title="Ebene">
            <button
              onClick={() => removeTextLayer(selected.id)}
              className="self-start rounded border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
            >
              Textebene löschen
            </button>
          </Section>
        </>
      )}
    </aside>
  )
}

export default TextPanel
