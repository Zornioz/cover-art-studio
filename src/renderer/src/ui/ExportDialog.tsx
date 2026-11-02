import { useMemo, useState } from 'react'
import { useProjectStore } from '../state/projectStore'
import { MAX_PREVIEW_DIM } from '../canvas/CanvasStage'
import { computePreviewScale } from '../canvas/exportRenderer'
import type { ExportContext } from '../canvas/exportRenderer'
import { resolveOutputSize } from '../canvas/canvasFormat'
import { scaleAllMasksToSize } from '../canvas/paintMaskBlend'
import { runExport, type ExportFormat } from '../export/exportOrchestrator'
import { computeDefaultDurationMs } from '../animation/exportFrameGenerator'
import { snapToSeamlessLoop } from '../animation/loopUtils'

const FORMAT_OPTIONS: { id: ExportFormat; label: string; animated: boolean }[] = [
  { id: 'png', label: 'PNG (verlustfrei)', animated: false },
  { id: 'jpg', label: 'JPG (kleiner)', animated: false },
  { id: 'gif', label: 'GIF (animiert)', animated: true },
  { id: 'webm', label: 'WebM-Video (animiert)', animated: true },
  { id: 'mp4', label: 'MP4-Video (animiert)', animated: true }
]

function useExportPreviewScale(): number {
  const sourceImage = useProjectStore((s) => s.sourceImage)
  const canvasFormat = useProjectStore((s) => s.canvasFormat)
  if (!sourceImage) return 1
  // Must match the live-preview canvas's own sizing (CanvasStage.tsx): once the output
  // format can differ from the source image, the preview canvas (and thus the stored
  // left/top/fontSize of every text layer) is sized from the OUTPUT format, not the raw
  // source image -- using sourceImage dims here would silently drift the exported text
  // position/size whenever format != "original".
  const outputSize = resolveOutputSize(canvasFormat, sourceImage)
  return computePreviewScale(outputSize.width, outputSize.height, MAX_PREVIEW_DIM)
}

function ExportDialog(props: { onClose: () => void }): JSX.Element {
  const { onClose } = props
  const sourceImage = useProjectStore((s) => s.sourceImage)
  const effects = useProjectStore((s) => s.effects)
  const textLayers = useProjectStore((s) => s.textLayers)
  const imageLayers = useProjectStore((s) => s.imageLayers)
  const borderStyleId = useProjectStore((s) => s.borderStyleId)
  const borderParams = useProjectStore((s) => s.borderParams)
  const canvasFormat = useProjectStore((s) => s.canvasFormat)
  const effectsAffectText = useProjectStore((s) => s.effectsAffectText)
  const effectsTextOnly = useProjectStore((s) => s.effectsTextOnly)
  const paintMasks = useProjectStore((s) => s.paintMasks)
  const previewScale = useExportPreviewScale()

  const hasAnimatedLayer = textLayers.some((l) => l.animation.presetId !== 'none')

  const ctx: ExportContext | null = useMemo(() => {
    if (!sourceImage) return null
    const outputSize = resolveOutputSize(canvasFormat, sourceImage)
    return {
      sourceImage,
      effects,
      textLayers,
      imageLayers,
      borderStyleId,
      borderParams,
      canvasFormat,
      effectsAffectText,
      effectsTextOnly,
      paintMasks: scaleAllMasksToSize(paintMasks, outputSize.width, outputSize.height),
      previewScale
    }
  }, [
    sourceImage,
    effects,
    textLayers,
    imageLayers,
    borderStyleId,
    borderParams,
    canvasFormat,
    effectsAffectText,
    effectsTextOnly,
    paintMasks,
    previewScale
  ])

  const [format, setFormat] = useState<ExportFormat>('png')
  const [fps, setFps] = useState(24)
  const [durationMs, setDurationMs] = useState(() => (ctx ? computeDefaultDurationMs(ctx) : 1500))
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedOption = FORMAT_OPTIONS.find((f) => f.id === format)!

  const handleExport = async (): Promise<void> => {
    if (!ctx) return
    setBusy(true)
    setStatus('Exportiere…')
    setProgress(0)

    try {
      const result = await runExport(
        format,
        ctx,
        { fps, durationMs },
        sourceImage ? sourceImage.fileName.replace(/\.[^.]+$/, '') : 'cover',
        {
          onFrameProgress: (i, total) => setProgress(Math.round((i / total) * 60)),
          onEncodeProgress: (percent) => setProgress(60 + Math.round(percent * 0.4))
        }
      )

      if (result.canceled) {
        setStatus('Abgebrochen.')
      } else if (result.error) {
        setStatus(`Fehler: ${result.error}`)
      } else {
        setStatus(`Gespeichert: ${result.path}`)
      }
    } catch (err) {
      setStatus(`Fehler: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[380px] rounded-lg border border-app-border bg-app-panel p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Exportieren</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/70">
            <span>Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="rounded border border-app-border bg-white/5 px-2 py-1.5 text-white/90"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {!selectedOption.animated && (hasAnimatedLayer || effects.motion.enabled) && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
              Dieses Projekt enthält animierten Text/Bewegungseffekte — bei PNG/JPG wird nur der
              Ausgangszustand exportiert. Wähle GIF/WebM/MP4 für eine animierte Datei.
            </p>
          )}

          {selectedOption.animated && (
            <>
              <label className="flex flex-col gap-1 text-xs text-white/70">
                <span>Bildrate (fps): {fps}</span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10))}
                  className="accent-app-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/70">
                <span>Dauer: {(durationMs / 1000).toFixed(1)}s</span>
                <input
                  type="range"
                  min={300}
                  max={8000}
                  step={100}
                  value={durationMs}
                  onChange={(e) => setDurationMs(parseInt(e.target.value, 10))}
                  className="accent-app-accent"
                />
              </label>
              {effects.motion.enabled && (
                <p className="text-[11px] text-white/40">
                  Tatsächliche Dauer (auf nahtlose Schleife angepasst):{' '}
                  {(snapToSeamlessLoop(durationMs, effects.motion.speed) / 1000).toFixed(2)}s
                </p>
              )}
            </>
          )}

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
              <div
                className="h-full bg-app-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {status && <p className="text-[11px] text-white/50">{status}</p>}

          <button
            onClick={handleExport}
            disabled={!ctx || busy}
            className="mt-1 rounded-md bg-app-accent px-3 py-2 text-xs font-semibold text-white enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Exportiere…' : 'Exportieren'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportDialog
