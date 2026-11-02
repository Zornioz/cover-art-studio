import { useProjectStore } from '../../state/projectStore'
import type { EffectsTarget } from '../../state/projectStore'
import { allPresets } from '../../effects/presets'
import { Slider, Toggle, ColorField, HueField, Section } from '../controls'

const EFFECTS_TARGET_OPTIONS: Array<{ id: EffectsTarget; label: string; hint: string }> = [
  { id: 'image', label: 'Nur Bild', hint: 'Effekte wirken nur auf das Foto. Text und Rahmen bleiben sauber.' },
  {
    id: 'all',
    label: 'Alles',
    hint: 'Korn, Duotone, Chromatic Aberration, Wave Lines usw. wirken auf das gesamte Bild inkl. Text und Rahmen.'
  },
  {
    id: 'text',
    label: 'Nur Schrift',
    hint: 'Effekte wirken nur auf den Text. Das Foto bleibt unverändert.'
  }
]

function EffectsPanel(): JSX.Element {
  const effects = useProjectStore((s) => s.effects)
  const activePresetId = useProjectStore((s) => s.activePresetId)
  const setAnalog = useProjectStore((s) => s.setAnalog)
  const setGlitch = useProjectStore((s) => s.setGlitch)
  const setAdjustments = useProjectStore((s) => s.setAdjustments)
  const setColorRemap = useProjectStore((s) => s.setColorRemap)
  const applyPresetById = useProjectStore((s) => s.applyPresetById)
  const resetEffects = useProjectStore((s) => s.resetEffects)
  const reseed = useProjectStore((s) => s.reseed)
  const effectsAffectText = useProjectStore((s) => s.effectsAffectText)
  const effectsTextOnly = useProjectStore((s) => s.effectsTextOnly)
  const setEffectsTarget = useProjectStore((s) => s.setEffectsTarget)
  const effectsTarget: EffectsTarget = !effectsAffectText ? 'image' : effectsTextOnly ? 'text' : 'all'

  const { analog, glitch, adjustments, colorRemap } = effects

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Allgemein">
        <div className="flex gap-1">
          {EFFECTS_TARGET_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setEffectsTarget(option.id)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                effectsTarget === option.id
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          {EFFECTS_TARGET_OPTIONS.find((o) => o.id === effectsTarget)?.hint}
        </p>
      </Section>

      <Section title="Presets">
        <div className="flex flex-wrap gap-1.5">
          {allPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPresetById(preset.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                activePresetId === preset.id
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button
          onClick={resetEffects}
          className="mt-1 self-start text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Alle Effekte zurücksetzen
        </button>
      </Section>

      <Section title="Anpassungen">
        <Slider
          label="Helligkeit"
          value={adjustments.brightness}
          min={-0.5}
          max={0.5}
          onChange={(v) => setAdjustments({ brightness: v })}
        />
        <Slider
          label="Kontrast"
          value={adjustments.contrast}
          min={0.5}
          max={1.5}
          onChange={(v) => setAdjustments({ contrast: v })}
        />
        <Slider
          label="Sättigung"
          value={adjustments.saturation}
          min={0}
          max={2}
          onChange={(v) => setAdjustments({ saturation: v })}
        />
      </Section>

      <Section title="Farb-Remap">
        <Toggle
          label="Aktiviert"
          checked={colorRemap.enabled}
          onChange={(checked) => setColorRemap({ enabled: checked })}
        />
        <HueField
          label="Quellfarbe"
          value={colorRemap.sourceHue}
          onChange={(v) => setColorRemap({ sourceHue: v })}
        />
        <HueField
          label="Zielfarbe"
          value={colorRemap.targetHue}
          onChange={(v) => setColorRemap({ targetHue: v })}
        />
        <Slider
          label="Toleranz"
          value={colorRemap.tolerance}
          min={0.02}
          max={0.5}
          onChange={(v) => setColorRemap({ tolerance: v })}
        />
        <Slider
          label="Stärke"
          value={colorRemap.strength}
          min={0}
          max={1}
          onChange={(v) => setColorRemap({ strength: v })}
        />
        <p className="text-[11px] text-white/30">
          Ersetzt alle Pixel nahe der Quellfarbe durch die Zielfarbe — z. B. alles Blau zu Rot,
          ideal für dunkle Retrocore-/Cyberpunk-/Glitch-Looks.
        </p>
      </Section>

      <Section title="Film / Analog">
        <Slider
          label="Korn"
          value={analog.grainAmount}
          min={0}
          max={0.5}
          onChange={(v) => setAnalog({ grainAmount: v })}
        />
        <Slider
          label="Korngröße"
          value={analog.grainSize}
          min={0.5}
          max={4}
          onChange={(v) => setAnalog({ grainSize: v })}
        />
        <Slider
          label="Korn: farbig ↔ mono"
          value={analog.grainMono}
          min={0}
          max={1}
          onChange={(v) => setAnalog({ grainMono: v })}
        />
        <Slider
          label="Vignette"
          value={analog.vignetteAmount}
          min={0}
          max={1}
          onChange={(v) => setAnalog({ vignetteAmount: v })}
        />
        <Slider
          label="Vignette Weichheit"
          value={analog.vignetteSoftness}
          min={0.05}
          max={1}
          onChange={(v) => setAnalog({ vignetteSoftness: v })}
        />
        <ColorField
          label="Vignette-Farbe"
          value={analog.vignetteColor}
          onChange={(v) => setAnalog({ vignetteColor: v })}
        />
        <Slider
          label="Halation / Glow"
          value={analog.halationAmount}
          min={0}
          max={1}
          onChange={(v) => setAnalog({ halationAmount: v })}
        />
        <Slider
          label="Duotone-Stärke"
          value={analog.duotoneAmount}
          min={0}
          max={1}
          onChange={(v) => setAnalog({ duotoneAmount: v })}
        />
        <ColorField
          label="Duotone Schatten"
          value={analog.duotoneShadow}
          onChange={(v) => setAnalog({ duotoneShadow: v })}
        />
        <ColorField
          label="Duotone Lichter"
          value={analog.duotoneHighlight}
          onChange={(v) => setAnalog({ duotoneHighlight: v })}
        />
      </Section>

      <Section title="Glitch / Digital">
        <Slider
          label="Chromatic Aberration"
          value={glitch.caAmount}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ caAmount: v })}
        />
        <Slider
          label="CA-Winkel"
          value={glitch.caAngle}
          min={0}
          max={Math.PI * 2}
          onChange={(v) => setGlitch({ caAngle: v })}
        />
        <Slider
          label="Scanlines"
          value={glitch.scanlineAmount}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ scanlineAmount: v })}
        />
        <Slider
          label="Scanline-Abstand"
          value={glitch.scanlineSpacing}
          min={1}
          max={12}
          onChange={(v) => setGlitch({ scanlineSpacing: v })}
        />
        <Slider
          label="Static / Sparkle"
          value={glitch.staticAmount}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ staticAmount: v })}
        />
        <button
          onClick={reseed}
          className="self-start text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          Noise neu würfeln
        </button>
        <Slider
          label="Zeilen-Jitter"
          value={glitch.waveAmount}
          min={0}
          max={0.05}
          onChange={(v) => setGlitch({ waveAmount: v })}
        />
        <Slider
          label="Jitter-Frequenz"
          value={glitch.waveFrequency}
          min={1}
          max={60}
          onChange={(v) => setGlitch({ waveFrequency: v })}
        />
        <Slider
          label="Licht-Spuren"
          value={glitch.lightTrailAmount}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ lightTrailAmount: v })}
        />
        <Slider
          label="Licht-Spuren-Winkel"
          value={glitch.lightTrailAngle}
          min={0}
          max={Math.PI * 2}
          onChange={(v) => setGlitch({ lightTrailAngle: v })}
        />
      </Section>

      <Section title="Pixel-Sort">
        <Toggle
          label="Aktiviert"
          checked={glitch.pixelSort.enabled}
          onChange={(checked) =>
            setGlitch({ pixelSort: { ...glitch.pixelSort, enabled: checked } })
          }
        />
        <Slider
          label="Schwelle niedrig"
          value={glitch.pixelSort.thresholdLow}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ pixelSort: { ...glitch.pixelSort, thresholdLow: v } })}
        />
        <Slider
          label="Schwelle hoch"
          value={glitch.pixelSort.thresholdHigh}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ pixelSort: { ...glitch.pixelSort, thresholdHigh: v } })}
        />
        <label className="flex items-center justify-between text-xs text-white/70">
          <span>Richtung</span>
          <select
            value={glitch.pixelSort.direction}
            onChange={(e) =>
              setGlitch({
                pixelSort: {
                  ...glitch.pixelSort,
                  direction: e.target.value as 'horizontal' | 'vertical'
                }
              })
            }
            className="rounded border border-app-border bg-white/5 px-1.5 py-0.5 text-white/80"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertikal</option>
          </select>
        </label>
      </Section>

      <Section title="Datamosh">
        <Toggle
          label="Aktiviert"
          checked={glitch.datamosh.enabled}
          onChange={(checked) => setGlitch({ datamosh: { ...glitch.datamosh, enabled: checked } })}
        />
        <Slider
          label="Blockgröße"
          value={glitch.datamosh.blockSize}
          min={4}
          max={80}
          onChange={(v) => setGlitch({ datamosh: { ...glitch.datamosh, blockSize: v } })}
        />
        <Slider
          label="Wahrscheinlichkeit"
          value={glitch.datamosh.probability}
          min={0}
          max={1}
          onChange={(v) => setGlitch({ datamosh: { ...glitch.datamosh, probability: v } })}
        />
        <Slider
          label="Max. Versatz"
          value={glitch.datamosh.maxOffset}
          min={0}
          max={200}
          onChange={(v) => setGlitch({ datamosh: { ...glitch.datamosh, maxOffset: v } })}
        />
      </Section>
    </aside>
  )
}

export default EffectsPanel
