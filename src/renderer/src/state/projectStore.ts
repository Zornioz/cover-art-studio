import { create } from 'zustand'
import { defaultEffectsSettings } from '../effects/types'
import type {
  AdjustmentSettings,
  AnalogSettings,
  ColorRemapSettings,
  EffectsSettings,
  GlitchSettings,
  MotionSettings
} from '../effects/types'
import { allPresets, applyPreset } from '../effects/presets'
import { createTextLayer } from '../canvas/layerModel'
import type { TextLayerState } from '../canvas/layerModel'
import { createImageLayer } from '../canvas/imageLayerModel'
import type { ImageLayerState } from '../canvas/imageLayerModel'
import { DEFAULT_BORDER_PARAMS } from '../borders/borderDefinitions'
import type { BorderParams, BorderStyleId } from '../borders/borderDefinitions'
import { DEFAULT_CANVAS_FORMAT, resolveOutputSize } from '../canvas/canvasFormat'
import type { CanvasFormatState } from '../canvas/canvasFormat'
import { createOpaqueMask, invertMask } from '../canvas/paintMaskBlend'
import type { MaskableEffectGroup } from '../canvas/paintMaskBlend'
import type { SerializableProjectState } from './projectSerialization'

export type ActiveTool = 'select' | 'cutout' | 'paint'
export type CutoutShape = 'freehand' | 'rect' | 'ellipse'
/** Where the global effects are applied: photo only, the whole composite, or text only. */
export type EffectsTarget = 'image' | 'all' | 'text'

export interface PaintBrushState {
  group: MaskableEffectGroup
  size: number // px, preview-space
  softness: number // 0-1
  strength: number // 0-1, per-stamp alpha
  polarity: 'erase' | 'restore'
}

export interface SourceImageState {
  data: string // base64 data URL
  width: number
  height: number
  fileName: string
}

interface ProjectState {
  sourceImage: SourceImageState | null
  effects: EffectsSettings
  activePresetId: string | null
  textLayers: TextLayerState[]
  imageLayers: ImageLayerState[]
  activeTool: ActiveTool
  cutoutShape: CutoutShape
  paintBrush: PaintBrushState
  /** Lives directly in state (not a bare ref) so allocation/clear/invert go through
   *  set() -- but per-stamp pixel writes mutate these canvases directly and are read
   *  via useProjectStore.getState(), bypassing set(), so 60fps dragging doesn't
   *  trigger a React re-render on every brush stamp. */
  paintMasks: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>
  selectedLayerId: string | null
  borderStyleId: BorderStyleId
  borderParams: BorderParams
  canvasFormat: CanvasFormatState
  effectsAffectText: boolean
  /** Only meaningful while effectsAffectText is on: effects hit the text layers only. */
  effectsTextOnly: boolean
  projectName: string
  projectFilePath: string | null
  setSourceImage: (image: SourceImageState) => void
  setActiveTool: (tool: ActiveTool) => void
  setCutoutShape: (shape: CutoutShape) => void
  setPaintBrush: (partial: Partial<PaintBrushState>) => void
  ensurePaintMask: (group: MaskableEffectGroup, width: number, height: number) => HTMLCanvasElement
  clearPaintMask: (group: MaskableEffectGroup) => void
  invertPaintMask: (group: MaskableEffectGroup) => void
  setAnalog: (partial: Partial<AnalogSettings>) => void
  setGlitch: (partial: Partial<GlitchSettings>) => void
  setAdjustments: (partial: Partial<AdjustmentSettings>) => void
  setColorRemap: (partial: Partial<ColorRemapSettings>) => void
  setMotion: (partial: Partial<MotionSettings>) => void
  setCanvasFormat: (partial: Partial<CanvasFormatState>) => void
  setEffectsTarget: (target: EffectsTarget) => void
  applyPresetById: (id: string) => void
  resetEffects: () => void
  reseed: () => void
  addTextLayer: () => string
  updateTextLayer: (id: string, partial: Partial<TextLayerState>) => void
  removeTextLayer: (id: string) => void
  addImageLayer: (data: string, naturalWidth: number, naturalHeight: number) => string
  updateImageLayer: (id: string, partial: Partial<ImageLayerState>) => void
  removeImageLayer: (id: string) => void
  reorderLayers: (orderedIds: string[]) => void
  setSelectedLayerId: (id: string | null) => void
  setBorderStyleId: (id: BorderStyleId) => void
  setBorderParams: (partial: Partial<BorderParams>) => void
  setProjectName: (name: string) => void
  setProjectFilePath: (path: string | null) => void
  loadProjectState: (state: SerializableProjectState, path: string | null) => void
  getSerializableState: () => SerializableProjectState
}

function nextLayerOrder(state: { textLayers: TextLayerState[]; imageLayers: ImageLayerState[] }): number {
  const maxOrder = [...state.textLayers, ...state.imageLayers].reduce(
    (max, l) => Math.max(max, l.order),
    -1
  )
  return maxOrder + 1
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  sourceImage: null,
  effects: defaultEffectsSettings(),
  activePresetId: null,
  textLayers: [],
  imageLayers: [],
  activeTool: 'select',
  cutoutShape: 'freehand',
  paintBrush: { group: 'analog', size: 60, softness: 0.6, strength: 0.4, polarity: 'erase' },
  paintMasks: {},
  selectedLayerId: null,
  borderStyleId: 'none',
  borderParams: { ...DEFAULT_BORDER_PARAMS },
  canvasFormat: { ...DEFAULT_CANVAS_FORMAT },
  effectsAffectText: true,
  effectsTextOnly: false,
  projectName: 'Unbenanntes Projekt',
  projectFilePath: null,

  setSourceImage: (image) => set({ sourceImage: image }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setCutoutShape: (shape) => set({ cutoutShape: shape }),

  setPaintBrush: (partial) => set((state) => ({ paintBrush: { ...state.paintBrush, ...partial } })),

  ensurePaintMask: (group, width, height) => {
    const existing = get().paintMasks[group]
    if (existing && existing.width === width && existing.height === height) return existing
    // Resizing an existing mask (e.g. canvasFormat changed after painting began) loses
    // the paint rather than resampling it -- acceptable, rare edge case.
    const mask = createOpaqueMask(width, height)
    set((state) => ({ paintMasks: { ...state.paintMasks, [group]: mask } }))
    return mask
  },

  clearPaintMask: (group) =>
    set((state) => {
      const next = { ...state.paintMasks }
      delete next[group]
      return { paintMasks: next }
    }),

  invertPaintMask: (group) =>
    set((state) => {
      const mask = state.paintMasks[group]
      if (!mask) return state
      return { paintMasks: { ...state.paintMasks, [group]: invertMask(mask) } }
    }),

  setAnalog: (partial) =>
    set((state) => ({
      effects: { ...state.effects, analog: { ...state.effects.analog, ...partial } },
      activePresetId: null
    })),

  setGlitch: (partial) =>
    set((state) => ({
      effects: { ...state.effects, glitch: { ...state.effects.glitch, ...partial } },
      activePresetId: null
    })),

  setAdjustments: (partial) =>
    set((state) => ({
      effects: { ...state.effects, adjustments: { ...state.effects.adjustments, ...partial } },
      activePresetId: null
    })),

  setColorRemap: (partial) =>
    set((state) => ({
      effects: { ...state.effects, colorRemap: { ...state.effects.colorRemap, ...partial } },
      activePresetId: null
    })),

  setMotion: (partial) =>
    set((state) => ({
      effects: { ...state.effects, motion: { ...state.effects.motion, ...partial } },
      activePresetId: null
    })),

  setCanvasFormat: (partial) =>
    set((state) => ({ canvasFormat: { ...state.canvasFormat, ...partial } })),

  setEffectsTarget: (target) =>
    set({ effectsAffectText: target !== 'image', effectsTextOnly: target === 'text' }),

  applyPresetById: (id) =>
    set((state) => {
      const preset = allPresets.find((p) => p.id === id)
      if (!preset) return state
      return { effects: applyPreset(preset, state.effects), activePresetId: id }
    }),

  resetEffects: () => set({ effects: defaultEffectsSettings(), activePresetId: null }),

  reseed: () =>
    set((state) => ({
      effects: { ...state.effects, seed: Math.random() * 1000 }
    })),

  addTextLayer: () => {
    const state = get()
    const layer = createTextLayer({ order: nextLayerOrder(state) })
    set((s) => ({
      textLayers: [...s.textLayers, layer],
      selectedLayerId: layer.id
    }))
    return layer.id
  },

  updateTextLayer: (id, partial) =>
    set((state) => ({
      textLayers: state.textLayers.map((l) => (l.id === id ? { ...l, ...partial } : l))
    })),

  removeTextLayer: (id) =>
    set((state) => ({
      textLayers: state.textLayers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId
    })),

  addImageLayer: (data, naturalWidth, naturalHeight) => {
    const state = get()
    const output = state.sourceImage
      ? resolveOutputSize(state.canvasFormat, state.sourceImage)
      : { width: naturalWidth, height: naturalHeight }
    const scale = (output.width * 0.6) / naturalWidth
    const w = naturalWidth * scale
    const h = naturalHeight * scale
    const layer = createImageLayer({
      data,
      naturalWidth,
      naturalHeight,
      left: (output.width - w) / 2,
      top: (output.height - h) / 2,
      scaleX: scale,
      scaleY: scale,
      order: nextLayerOrder(state)
    })
    set((s) => ({
      imageLayers: [...s.imageLayers, layer],
      selectedLayerId: layer.id
    }))
    return layer.id
  },

  updateImageLayer: (id, partial) =>
    set((state) => ({
      imageLayers: state.imageLayers.map((l) => (l.id === id ? { ...l, ...partial } : l))
    })),

  removeImageLayer: (id) =>
    set((state) => ({
      imageLayers: state.imageLayers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId
    })),

  reorderLayers: (orderedIds) =>
    set((state) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
      return {
        textLayers: state.textLayers.map((l) =>
          orderMap.has(l.id) ? { ...l, order: orderMap.get(l.id)! } : l
        ),
        imageLayers: state.imageLayers.map((l) =>
          orderMap.has(l.id) ? { ...l, order: orderMap.get(l.id)! } : l
        )
      }
    }),

  setSelectedLayerId: (id) => set({ selectedLayerId: id }),

  setBorderStyleId: (id) => set({ borderStyleId: id }),

  setBorderParams: (partial) =>
    set((state) => ({ borderParams: { ...state.borderParams, ...partial } })),

  setProjectName: (name) => set({ projectName: name }),

  setProjectFilePath: (path) => set({ projectFilePath: path }),

  loadProjectState: (state, path) =>
    set({
      sourceImage: state.sourceImage,
      effects: state.effects,
      borderStyleId: state.borderStyleId,
      borderParams: state.borderParams,
      canvasFormat: state.canvasFormat,
      effectsAffectText: state.effectsAffectText,
      effectsTextOnly: state.effectsTextOnly,
      textLayers: state.textLayers,
      imageLayers: state.imageLayers,
      paintMasks: state.paintMasks,
      projectName: state.projectName,
      projectFilePath: path,
      activePresetId: null,
      selectedLayerId: null,
      activeTool: 'select',
      paintBrush: { group: 'analog', size: 60, softness: 0.6, strength: 0.4, polarity: 'erase' }
    }),

  getSerializableState: () => {
    const s = get()
    return {
      projectName: s.projectName,
      sourceImage: s.sourceImage,
      effects: s.effects,
      borderStyleId: s.borderStyleId,
      borderParams: s.borderParams,
      canvasFormat: s.canvasFormat,
      effectsAffectText: s.effectsAffectText,
      effectsTextOnly: s.effectsTextOnly,
      textLayers: s.textLayers,
      imageLayers: s.imageLayers,
      paintMasks: s.paintMasks
    }
  }
}))
