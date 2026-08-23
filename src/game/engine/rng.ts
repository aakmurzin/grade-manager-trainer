/**
 * Deterministic PRNG for engine randomness (mulberry32).
 * All gameplay rolls should flow through this, not Math.random().
 */

export function initRngState(seed: number): number {
  return (seed >>> 0) || 1;
}

/** Returns [nextState, uniform value in [0, 1)). */
export function rngNext(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [a, value];
}

export interface RngCarrier {
  rngState: number;
}

export function rngFloat(carrier: RngCarrier): number {
  const [next, value] = rngNext(carrier.rngState);
  carrier.rngState = next;
  return value;
}

export function rngInt(carrier: RngCarrier, min: number, max: number): number {
  return Math.floor(rngFloat(carrier) * (max - min + 1)) + min;
}

export function rngPick<T>(carrier: RngCarrier, arr: readonly T[]): T {
  return arr[Math.floor(rngFloat(carrier) * arr.length)]!;
}

export function rngWeightedPick<T>(
  carrier: RngCarrier,
  items: readonly T[],
  weights: readonly number[],
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rngFloat(carrier) * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
