export const deleteCue = { shrink: 0 };

type Spot = { x: number; y: number; on: boolean };
let spot: Spot = { x: 0, y: 0, on: false };
const listeners = new Set<(next: Spot) => void>();

export function setDeleteAnchor(next: Spot) {
  if (next.on === spot.on && Math.abs(next.x - spot.x) < 0.5 && Math.abs(next.y - spot.y) < 0.5) return;
  spot = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeDelete(listener: (next: Spot) => void) {
  listeners.add(listener);
  listener(spot);
  return () => {
    listeners.delete(listener);
  };
}