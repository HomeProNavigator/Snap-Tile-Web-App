import type { Piece, TileKind } from "./tiles";

function sameKind(a: TileKind, b: TileKind): boolean {
  return a.shape === b.shape && a.color === b.color && a.cutout === b.cutout;
}

function samePiece(a: Piece, b: Piece): boolean {
  return (
    a.shape === b.shape &&
    a.cutout === b.cutout &&
    a.rot === b.rot &&
    a.x === b.x &&
    a.y === b.y &&
    a.z === b.z &&
    a.plane === b.plane &&
    a.lean === b.lean &&
    a.color === b.color
  );
}

/**
 * hits are nearest-first along the click.
 * Ghosts overlap, so the front tile is often a roof or wall in front of the
 * piece the player is holding. Place the nearest open piece of that kind.
 * If none of the tiles under the pointer match, keep the front tile so the
 * usual "wrong piece" rejection still fires.
 */
export function choosePlacement(hits: Piece[], held: TileKind | null, placed: Piece[], fallback: Piece): Piece {
  if (!held) return fallback;
  const open = (piece: Piece) => !placed.some((have) => samePiece(have, piece));
  for (const hit of hits) {
    if (open(hit) && sameKind(held, hit)) return hit;
  }
  return hits.find(open) ?? (open(fallback) ? fallback : (hits[0] ?? fallback));
}
