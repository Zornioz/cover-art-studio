/**
 * Snaps a requested export duration to the nearest whole number of motion-line cycles
 * so the shader's periodic time terms close exactly, avoiding a visible seam at the
 * loop point. speedHz <= 0 (no motion) returns the request unchanged.
 */
export function snapToSeamlessLoop(requestedMs: number, speedHz: number): number {
  if (speedHz <= 0) return requestedMs
  const cycleMs = 1000 / speedHz
  const cycles = Math.max(1, Math.round(requestedMs / cycleMs))
  return cycles * cycleMs
}
