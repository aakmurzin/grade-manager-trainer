export const TILE_W = 48;
export const TILE_H = 24;
/** Drawn tile bitmap height (top face + side thickness). */
export const TILE_SPRITE_H = 32;

export function isoToScreen(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

export function depthZ(gx: number, gy: number, bias = 0): number {
  return (gx + gy) * 20 + bias;
}

/** Desk grid slots inside a room (local room coords). */
export function deskSlot(index: number, cols = 3): { gx: number; gy: number } {
  const c = index % cols;
  const r = Math.floor(index / cols);
  // Wider spacing so neighboring desk sprites don't paint over seated staff
  return { gx: 2.0 + c * 3.2, gy: 2.2 + r * 3.0 };
}

export function seatOffset(gx: number, gy: number): { gx: number; gy: number } {
  // Feet just in front of the desk toward the camera (arcade prototype)
  return { gx: gx + 0.08, gy: gy + 0.72 };
}
