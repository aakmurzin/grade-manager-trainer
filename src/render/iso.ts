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
  // Keep clear of SW coffee + NW plant props; spacing so sprites don't overlap.
  return { gx: 3.1 + c * 2.85, gy: 2.7 + r * 3.25 };
}

/** Decor props in room 0 — corners desks never use. */
export function coffeePropSlot(grid: number): { gx: number; gy: number } {
  // Deep SW tip — away from desk column 0 / row 1+
  return { gx: 1.05, gy: grid - 1.15 };
}

export function plantPropSlot(_grid: number): { gx: number; gy: number } {
  // Deep NW tip — away from east desk column
  return { gx: 1.0, gy: 1.0 };
}

export function seatOffset(gx: number, gy: number): { gx: number; gy: number } {
  // Feet just in front of the desk toward the camera (arcade prototype)
  return { gx: gx + 0.08, gy: gy + 0.72 };
}

/**
 * Seat for work sprites that already bake a chair + laptop desk (sales).
 * Sit into the furniture footprint so we don't get a second empty desk beside them.
 */
export function workSeatOffset(gx: number, gy: number): { gx: number; gy: number } {
  return { gx: gx + 0.12, gy: gy + 0.28 };
}
