import * as twgl from 'twgl.js'
import vertSrc from './shaders/composite.vert.glsl?raw'
import fragSrc from './shaders/composite.frag.glsl?raw'
import type { EffectsSettings } from '../types'

export class EffectsGLRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private programInfo: twgl.ProgramInfo
  private quadBufferInfo: twgl.BufferInfo
  private texture: WebGLTexture | null = null
  private sourceWidth = 0
  private sourceHeight = 0

  constructor() {
    this.canvas = document.createElement('canvas')
    const gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false
    })
    if (!gl) throw new Error('WebGL wird von diesem System nicht unterstützt.')
    this.gl = gl
    this.programInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc])
    this.quadBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] }
    })
  }

  setSourceImage(image: TexImageSource, width: number, height: number): void {
    const gl = this.gl
    this.sourceWidth = width
    this.sourceHeight = height
    const opts = {
      src: image as never,
      min: gl.LINEAR,
      mag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      flipY: 0
    }
    // Reuse the existing texture object instead of creating a new one every call —
    // this is called every frame once live continuous rendering is in play, and
    // twgl.createTexture() never frees the texture it replaces.
    if (this.texture) {
      twgl.setTextureFromElement(gl, this.texture, image as unknown as HTMLElement, opts)
    } else {
      this.texture = twgl.createTexture(gl, opts)
    }
  }

  render(
    settings: EffectsSettings,
    timeSec = 0,
    outWidth = this.sourceWidth,
    outHeight = this.sourceHeight
  ): void {
    if (!this.texture) return
    const gl = this.gl
    const { analog, glitch, adjustments, colorRemap, motion, seed } = settings

    if (this.canvas.width !== outWidth || this.canvas.height !== outHeight) {
      this.canvas.width = outWidth
      this.canvas.height = outHeight
    }
    gl.viewport(0, 0, outWidth, outHeight)
    gl.useProgram(this.programInfo.program)

    twgl.setBuffersAndAttributes(gl, this.programInfo, this.quadBufferInfo)
    twgl.setUniforms(this.programInfo, {
      u_image: this.texture,
      u_resolution: [outWidth, outHeight],

      u_caAmount: glitch.caAmount,
      u_caAngle: glitch.caAngle,

      u_lightTrailAmount: glitch.lightTrailAmount,
      u_lightTrailAngle: glitch.lightTrailAngle,

      u_waveAmount: glitch.waveAmount,
      u_waveFrequency: glitch.waveFrequency,
      u_waveSeed: seed,

      u_duotoneAmount: analog.duotoneAmount,
      u_duotoneShadow: analog.duotoneShadow,
      u_duotoneHighlight: analog.duotoneHighlight,

      u_halationAmount: analog.halationAmount,

      u_grainAmount: analog.grainAmount,
      u_grainSize: analog.grainSize,
      u_grainMono: analog.grainMono,
      u_grainSeed: seed,

      u_scanlineAmount: glitch.scanlineAmount,
      u_scanlineSpacing: glitch.scanlineSpacing,

      u_staticAmount: glitch.staticAmount,
      u_staticSeed: seed * 1.37 + 4.2,

      u_vignetteAmount: analog.vignetteAmount,
      u_vignetteSoftness: analog.vignetteSoftness,
      u_vignetteColor: analog.vignetteColor,

      u_brightness: adjustments.brightness,
      u_contrast: adjustments.contrast,
      u_saturation: adjustments.saturation,

      u_remapSourceHue: colorRemap.sourceHue,
      u_remapTolerance: colorRemap.tolerance,
      u_remapTargetHue: colorRemap.targetHue,
      u_remapStrength: colorRemap.enabled ? colorRemap.strength : 0,

      u_time: timeSec,
      u_motionDensity: motion.density,
      u_motionSpeed: motion.speed,
      u_motionAmplitude: motion.amplitude,
      u_motionThickness: motion.thickness,
      u_motionAngle: motion.angle,
      u_motionColor: motion.color,
      u_motionStrength: motion.enabled ? motion.strength : 0
    })
    twgl.drawBufferInfo(gl, this.quadBufferInfo)
  }

  dispose(): void {
    const gl = this.gl
    if (this.texture) gl.deleteTexture(this.texture)
    gl.deleteProgram(this.programInfo.program)
  }
}
