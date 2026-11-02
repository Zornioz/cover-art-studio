import { useProjectStore } from '../../state/projectStore'
import { borderDefinitions } from '../../borders/borderDefinitions'
import { Slider, ColorField, Section, hexToRgb, rgbToHex } from '../controls'

function BorderPanel(): JSX.Element {
  const borderStyleId = useProjectStore((s) => s.borderStyleId)
  const borderParams = useProjectStore((s) => s.borderParams)
  const setBorderStyleId = useProjectStore((s) => s.setBorderStyleId)
  const setBorderParams = useProjectStore((s) => s.setBorderParams)

  const definition = borderDefinitions.find((b) => b.id === borderStyleId) ?? borderDefinitions[0]

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-app-border bg-app-panel">
      <Section title="Rahmenstil">
        <div className="flex flex-col gap-1">
          {borderDefinitions.map((def) => (
            <button
              key={def.id}
              onClick={() => setBorderStyleId(def.id)}
              className={`rounded border px-2.5 py-1.5 text-left text-xs ${
                borderStyleId === def.id
                  ? 'border-app-accent bg-app-accent/20 text-white'
                  : 'border-app-border bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{def.label}</div>
              <div className="text-[10px] text-white/40">{def.description}</div>
            </button>
          ))}
        </div>
      </Section>

      {definition.id !== 'none' && (
        <Section title="Einstellungen">
          {definition.id !== 'rounded-card' && (
            <Slider
              label="Randbreite"
              value={borderParams.widthRatio}
              min={0.005}
              max={0.12}
              onChange={(v) => setBorderParams({ widthRatio: v })}
            />
          )}
          {definition.supportsRadius && (
            <Slider
              label="Eckenradius"
              value={borderParams.radiusRatio}
              min={0}
              max={0.15}
              onChange={(v) => setBorderParams({ radiusRatio: v })}
            />
          )}
          {definition.id !== 'duotone-match' && definition.id !== 'rounded-card' && (
            <ColorField
              label="Farbe"
              value={hexToRgb(borderParams.color)}
              onChange={(rgb) => setBorderParams({ color: rgbToHex(rgb) })}
            />
          )}
          {definition.supportsSecondColor && (
            <ColorField
              label="Farbe 2"
              value={hexToRgb(borderParams.color2)}
              onChange={(rgb) => setBorderParams({ color2: rgbToHex(rgb) })}
            />
          )}
        </Section>
      )}
    </aside>
  )
}

export default BorderPanel
