import { useProjectStore } from '../../state/projectStore'
import { Slider, Toggle, ColorField, Section } from '../controls'

function MotionPanel(): JSX.Element {
  const motion = useProjectStore((s) => s.effects.motion)
  const setMotion = useProjectStore((s) => s.setMotion)

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Wave Lines">
        <Toggle
          label="Aktiviert"
          checked={motion.enabled}
          onChange={(checked) => setMotion({ enabled: checked })}
        />
        <p className="text-[11px] text-white/30">
          Animierter Linien-Effekt für bewegte Visuals (z. B. DJ/VJ-Loops). Läuft in der
          Vorschau live und wird bei GIF/WebM/MP4-Export als nahtlose Schleife exportiert.
        </p>
        <Slider
          label="Dichte"
          value={motion.density}
          min={2}
          max={60}
          step={1}
          onChange={(v) => setMotion({ density: v })}
        />
        <Slider
          label="Geschwindigkeit"
          value={motion.speed}
          min={0.05}
          max={4}
          onChange={(v) => setMotion({ speed: v })}
        />
        <Slider
          label="Wellenamplitude"
          value={motion.amplitude}
          min={0}
          max={0.1}
          onChange={(v) => setMotion({ amplitude: v })}
        />
        <Slider
          label="Linienstärke"
          value={motion.thickness}
          min={0.01}
          max={1}
          onChange={(v) => setMotion({ thickness: v })}
        />
        <Slider
          label="Winkel"
          value={motion.angle}
          min={0}
          max={Math.PI * 2}
          onChange={(v) => setMotion({ angle: v })}
        />
        <Slider
          label="Intensität"
          value={motion.strength}
          min={0}
          max={1}
          onChange={(v) => setMotion({ strength: v })}
        />
        <ColorField label="Farbe" value={motion.color} onChange={(v) => setMotion({ color: v })} />
      </Section>
    </aside>
  )
}

export default MotionPanel
