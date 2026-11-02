import type { Canvas, FabricObject } from 'fabric'
import type { TextLayerState } from './layerModel'
import type { ImageLayerState } from './imageLayerModel'
import type { BorderObject } from '../borders/applyBorder'

interface LayeredObject extends FabricObject {
  layerId?: string
}

/**
 * Keeps Fabric's actual object stacking in sync with the combined text+image layer
 * order. Border objects keep their own explicit sendObjectToBack call and must stay
 * below the whole layer stack -- moveObjectTo uses ABSOLUTE indices into the full
 * object array, so layer indices are offset past however many border objects are
 * currently present, regardless of which effect last touched the stack. The
 * background stays outside canvas.getObjects() entirely and is untouched by this.
 */
export function applyLayerZOrder(
  canvas: Canvas,
  textLayers: TextLayerState[],
  imageLayers: ImageLayerState[]
): void {
  const borderObjectCount = canvas.getObjects().filter((o) => (o as BorderObject).isBorderLayer).length
  const ordered = [...textLayers, ...imageLayers].sort((a, b) => a.order - b.order)
  ordered.forEach((layer, index) => {
    const obj = canvas.getObjects().find((o) => (o as LayeredObject).layerId === layer.id)
    if (obj) canvas.moveObjectTo(obj, borderObjectCount + index)
  })
}
