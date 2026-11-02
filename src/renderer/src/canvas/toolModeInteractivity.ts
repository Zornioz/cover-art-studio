import { useEffect } from 'react'
import type { Canvas, FabricObject } from 'fabric'
import type { ActiveTool } from '../state/projectStore'

interface LayeredObject extends FabricObject {
  layerId?: string
}

/**
 * Suspends normal Fabric object selection/dragging while a non-"select" tool
 * (cutout, paint) is active, so its own pointer handlers own canvas interaction
 * instead of fighting with object drag/resize. Restored when switching back.
 * Only touches layer objects (layerId set) -- border overlay objects are already
 * permanently non-interactive and must stay that way regardless of tool mode.
 *
 * Takes a getter (like useLiveRenderLoop's fabricCanvasGetter) rather than the
 * canvas instance directly -- the canvas lives in a ref populated by a separate
 * mount effect, so reading it fresh inside this effect (keyed only on activeTool)
 * avoids ever capturing a stale/null canvas from an earlier render.
 */
export function useToolModeInteractivity(
  canvasGetter: () => Canvas | null,
  activeTool: ActiveTool
): void {
  useEffect(() => {
    const canvas = canvasGetter()
    if (!canvas) return
    const isSelectMode = activeTool === 'select'

    canvas.selection = isSelectMode
    canvas.defaultCursor = isSelectMode ? 'default' : 'crosshair'
    canvas.getObjects().forEach((obj) => {
      if (!(obj as LayeredObject).layerId) return
      obj.selectable = isSelectMode
      obj.evented = isSelectMode
    })
    if (!isSelectMode) canvas.discardActiveObject()
    canvas.requestRenderAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool])
}
