precision highp float;

varying vec2 v_uv;

uniform sampler2D u_image;
uniform vec2 u_resolution;

// Chromatic aberration / RGB shift
uniform float u_caAmount;
uniform float u_caAngle;

// Light trail (directional multi-tap blur, used for cable light-streak look)
uniform float u_lightTrailAmount;
uniform float u_lightTrailAngle;

// Wave / line-jitter distortion
uniform float u_waveAmount;
uniform float u_waveFrequency;
uniform float u_waveSeed;

// Duotone / split-tone
uniform float u_duotoneAmount;
uniform vec3 u_duotoneShadow;
uniform vec3 u_duotoneHighlight;

// Halation (warm glow on highlights)
uniform float u_halationAmount;

// Grain
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_grainMono;
uniform float u_grainSeed;

// Scanlines
uniform float u_scanlineAmount;
uniform float u_scanlineSpacing;

// Static / sparkle noise
uniform float u_staticAmount;
uniform float u_staticSeed;

// Vignette
uniform float u_vignetteAmount;
uniform float u_vignetteSoftness;
uniform vec3 u_vignetteColor;

// Basic adjustments
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

// Color remap (selective hue replacement, e.g. "all blue -> red")
uniform float u_remapSourceHue;
uniform float u_remapTolerance;
uniform float u_remapTargetHue;
uniform float u_remapStrength;

// Motion: animated wave-line overlay
uniform float u_time;
uniform float u_motionDensity;
uniform float u_motionSpeed;
uniform float u_motionAmplitude;
uniform float u_motionThickness;
uniform float u_motionAngle;
uniform vec3 u_motionColor;
uniform float u_motionStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 rgb2hsl(vec3 c) {
  float maxc = max(max(c.r, c.g), c.b);
  float minc = min(min(c.r, c.g), c.b);
  float l = (maxc + minc) * 0.5;
  float d = maxc - minc;
  float h = 0.0;
  float s = 0.0;
  if (d > 0.0001) {
    s = d / (1.0 - abs(2.0 * l - 1.0));
    if (maxc == c.r) {
      h = mod((c.g - c.b) / d, 6.0);
    } else if (maxc == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  if (s <= 0.0001) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0 / 3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0 / 3.0)
  );
}

vec3 sampleTrail(vec2 uv, vec2 dir) {
  if (u_lightTrailAmount <= 0.0001) {
    return texture2D(u_image, uv).rgb;
  }
  vec3 sum = vec3(0.0);
  const int TAPS = 7;
  for (int i = 0; i < TAPS; i++) {
    float t = (float(i) / float(TAPS - 1) - 0.5) * u_lightTrailAmount * 0.04;
    sum += texture2D(u_image, uv + dir * t).rgb;
  }
  return sum / float(TAPS);
}

void main() {
  vec2 uv = v_uv;

  // Wave / line-jitter: horizontal offset per scanline
  float waveOffset = sin(uv.y * u_waveFrequency * 6.28318 + u_waveSeed) * u_waveAmount;
  uv.x += waveOffset;

  vec2 trailDir = vec2(cos(u_lightTrailAngle), sin(u_lightTrailAngle));

  // Chromatic aberration direction
  vec2 caDir = vec2(cos(u_caAngle), sin(u_caAngle)) * u_caAmount * 0.02;

  float r = sampleTrail(uv + caDir, trailDir).r;
  float g = sampleTrail(uv, trailDir).g;
  float b = sampleTrail(uv - caDir, trailDir).b;
  vec3 color = vec3(r, g, b);

  // Color remap: shift a hue band toward a target hue (e.g. "all blue -> red"),
  // before duotone so the toning below sees the recolored image.
  if (u_remapStrength > 0.0001) {
    vec3 hsl = rgb2hsl(color);
    float dist = abs(hsl.x - u_remapSourceHue);
    dist = min(dist, 1.0 - dist); // circular hue distance
    float mask = 1.0 - smoothstep(u_remapTolerance * 0.5, u_remapTolerance, dist);
    float shift = u_remapTargetHue - u_remapSourceHue;
    shift -= floor(shift + 0.5); // wrap to the shortest direction, [-0.5, 0.5]
    vec3 remapped = hsl2rgb(vec3(fract(hsl.x + shift * mask + 1.0), hsl.y, hsl.z));
    color = mix(color, remapped, mask * u_remapStrength);
  }

  // Duotone / split-tone
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 duotoneColor = mix(u_duotoneShadow, u_duotoneHighlight, luma);
  color = mix(color, duotoneColor, u_duotoneAmount);

  // Halation: warm boost on bright areas
  float hiMask = smoothstep(0.55, 1.0, luma);
  color += hiMask * u_halationAmount * vec3(1.0, 0.45, 0.2);

  // Basic adjustments: brightness / contrast / saturation
  color = color + u_brightness;
  color = (color - 0.5) * u_contrast + 0.5;
  float adjLuma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(adjLuma), color, u_saturation);

  // Grain
  vec2 grainCell = floor(gl_FragCoord.xy / max(u_grainSize, 0.5));
  float gMono = hash(grainCell + u_grainSeed);
  float gR = mix(hash(grainCell + u_grainSeed + 11.0), gMono, u_grainMono);
  float gG = mix(hash(grainCell + u_grainSeed + 23.0), gMono, u_grainMono);
  float gB = mix(hash(grainCell + u_grainSeed + 37.0), gMono, u_grainMono);
  vec3 grainVal = (vec3(gR, gG, gB) - 0.5) * 2.0 * u_grainAmount;
  color += grainVal;

  // Scanlines
  float line = mod(gl_FragCoord.y, max(u_scanlineSpacing, 1.0));
  float scanMask = smoothstep(0.0, 1.0, line / max(u_scanlineSpacing, 1.0));
  color *= mix(1.0 - u_scanlineAmount, 1.0, scanMask);

  // Static / sparkle noise
  float sparkleNoise = hash(gl_FragCoord.xy + u_staticSeed);
  float sparkle = step(1.0 - u_staticAmount * 0.2, sparkleNoise);
  color += sparkle * vec3(1.0);

  // Vignette
  float vigDist = distance(uv, vec2(0.5));
  float vig = smoothstep(0.9, 0.9 - u_vignetteSoftness, vigDist);
  color = mix(u_vignetteColor, color, mix(1.0, vig, u_vignetteAmount));

  // Motion: animated wave-line overlay (VJ/DJ visual style)
  if (u_motionStrength > 0.0001) {
    vec2 dir = vec2(cos(u_motionAngle), sin(u_motionAngle));
    vec2 perp = vec2(-dir.y, dir.x);
    vec2 centered = uv - 0.5;
    float axisPos = dot(centered, dir) + 0.5;
    float perpPos = dot(centered, perp);
    // All time terms are rational multiples of (u_time * u_motionSpeed) so the
    // combined signal is exactly periodic with period 1/u_motionSpeed -- export
    // snaps duration to a whole multiple of that period for a seamless loop.
    float scroll = u_time * u_motionSpeed;
    float wobble = sin(axisPos * 20.0 + scroll * 2.0) * u_motionAmplitude;
    float spacing = 1.0 / max(u_motionDensity, 1.0);
    float bandPhase = fract((perpPos + wobble - scroll * spacing) / spacing);
    float bandDist = abs(bandPhase - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, max(u_motionThickness, 0.001), bandDist);
    color += u_motionColor * core * u_motionStrength;
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
