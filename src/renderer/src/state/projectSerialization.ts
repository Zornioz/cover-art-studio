import type { ProjectFile } from '@shared/types/project'
import type { SourceImageState } from './projectStore'
import { DEFAULT_ADJUSTMENTS, DEFAULT_COLOR_REMAP, DEFAULT_MOTION } from '../effects/types'
import type { EffectsSettings } from '../effects/types'
import type { TextLayerState } from '../canvas/layerModel'
import type { ImageLayerState } from '../canvas/imageLayerModel'
import type { BorderParams, BorderStyleId } from '../borders/borderDefinitions'
import { DEFAULT_CANVAS_FORMAT } from '../canvas/canvasFormat'
import type { CanvasFormatState } from '../canvas/canvasFormat'
import { MASKABLE_EFFECT_GROUPS } from '../canvas/paintMaskBlend'
import type { MaskableEffectGroup } from '../canvas/paintMaskBlend'

const APP_VERSION = '0.1.0'

export interface SerializableProjectState {
  projectName: string
  sourceImage: SourceImageState | null
  effects: EffectsSettings
  borderStyleId: BorderStyleId
  borderParams: BorderParams
  canvasFormat: CanvasFormatState
  effectsAffectText: boolean
  effectsTextOnly: boolean
  textLayers: TextLayerState[]
  imageLayers: ImageLayerState[]
  paintMasks: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>
}

export function toProjectFile(state: SerializableProjectState): ProjectFile {
  return {
    formatVersion: 1,
    appVersion: APP_VERSION,
    name: state.projectName,
    sourceImage: state.sourceImage
      ? {
          data: state.sourceImage.data,
          width: state.sourceImage.width,
          height: state.sourceImage.height,
          fileName: state.sourceImage.fileName
        }
      : null,
    effects: {
      analog: state.effects.analog as unknown as ProjectFile['effects']['analog'],
      glitch: state.effects.glitch as unknown as ProjectFile['effects']['glitch'],
      adjustments: state.effects.adjustments as unknown as Record<string, number>,
      colorRemap: state.effects.colorRemap as unknown as Record<string, unknown>,
      motion: state.effects.motion as unknown as Record<string, unknown>,
      seed: state.effects.seed
    },
    border: {
      styleId: state.borderStyleId,
      params: state.borderParams as unknown as ProjectFile['border']['params']
    },
    canvasFormat: state.canvasFormat as unknown as Record<string, unknown>,
    effectsAffectText: state.effectsAffectText,
    effectsTextOnly: state.effectsTextOnly,
    textLayers: state.textLayers as unknown as Record<string, unknown>[],
    imageLayers: state.imageLayers as unknown as Record<string, unknown>[],
    paintMasks: Object.fromEntries(
      Object.entries(state.paintMasks).map(([group, canvas]) => [
        group,
        (canvas as HTMLCanvasElement).toDataURL('image/png')
      ])
    )
  }
}

export function fromProjectFile(project: ProjectFile): SerializableProjectState {
  const effects = project.effects as unknown as EffectsSettings
  return {
    projectName: project.name,
    sourceImage: project.sourceImage
      ? {
          data: project.sourceImage.data,
          width: project.sourceImage.width,
          height: project.sourceImage.height,
          fileName: project.sourceImage.fileName
        }
      : null,
    effects: {
      ...effects,
      // Defensive merge: these settings groups didn't exist in older project files,
      // so a blind cast would leave them undefined and feed NaN into shader uniforms.
      adjustments: { ...DEFAULT_ADJUSTMENTS, ...project.effects.adjustments },
      colorRemap: { ...DEFAULT_COLOR_REMAP, ...project.effects.colorRemap },
      motion: { ...DEFAULT_MOTION, ...project.effects.motion }
    },
    borderStyleId: project.border.styleId as BorderStyleId,
    borderParams: project.border.params as unknown as BorderParams,
    canvasFormat: { ...DEFAULT_CANVAS_FORMAT, ...project.canvasFormat },
    effectsAffectText: project.effectsAffectText ?? true,
    effectsTextOnly: project.effectsTextOnly ?? false,
    // Backfill order/visible for project files saved before layers were reorderable.
    textLayers: (project.textLayers as unknown as Partial<TextLayerState>[]).map(
      (layer, index) =>
        ({
          ...layer,
          order: layer.order ?? index,
          visible: layer.visible ?? true
        }) as TextLayerState
    ),
    imageLayers: (project.imageLayers ?? []) as unknown as ImageLayerState[],
    // Decoding a PNG data URL into a canvas is inherently async, but this function
    // stays synchronous for the rest of the project state -- callers that need the
    // actual masks call decodePaintMasks(project) separately and merge the result in.
    paintMasks: {}
  }
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Decodes a project file's saved paint masks (PNG data URLs) into live canvases.
 *  Call this alongside fromProjectFile and merge the result into its paintMasks
 *  before passing to loadProjectState -- kept separate since decoding is async. */
export async function decodePaintMasks(
  project: ProjectFile
): Promise<Partial<Record<MaskableEffectGroup, HTMLCanvasElement>>> {
  const result: Partial<Record<MaskableEffectGroup, HTMLCanvasElement>> = {}
  if (!project.paintMasks) return result
  for (const group of MASKABLE_EFFECT_GROUPS) {
    const dataUrl = project.paintMasks[group]
    if (!dataUrl) continue
    const img = await loadImageElement(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')?.drawImage(img, 0, 0)
    result[group] = canvas
  }
  return result
}
