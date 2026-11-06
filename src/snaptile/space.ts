import type { Cutout, Piece, Plane, Shape, TileColor } from "./tiles";

export type Facing = "flat" | "wall" | "roof";

export function facingOf(plane: Plane): Facing {
  if (plane === "floor") return "flat";
  if (plane === "wallx" || plane === "wallz") return "wall";
  return "roof";
}

export const TILE = 0.96;

export function roofReach(shape: Shape): number {
  return shape === "triangle" ? (TILE * Math.sqrt(3)) / 2 : TILE;
}

export function roofAlpha(shape: Shape): number {
  return Math.asin(Math.min(0.98, 0.5 / roofReach(shape)));
}

export function meshLift(shape: Shape): number {
  return roofReach(shape) / 2;
}

function coversCell(piece: Piece): { x: number; z: number } {
  if (piece.plane === "roofx") return { x: piece.x, z: piece.lean === 1 ? piece.z + 1 : piece.z };
  return { x: piece.lean === 1 ? piece.x + 1 : piece.x, z: piece.z };
}

function squareEave(piece: Piece, all: Piece[]) {
  return all.some((other) => {
    if (other.y !== piece.y || other.shape !== "square") return false;
    if (piece.plane === "roofx") return other.plane === "wallz" && other.x === piece.x && other.z === piece.z;
    return other.plane === "wallx" && other.x === piece.x && other.z === piece.z;
  });
}

function triangleGable(piece: Piece, all: Piece[]) {
  const cell = coversCell(piece);
  return all.some((other) => {
    if (other.y !== piece.y || other.shape !== "triangle") return false;
    if (other.plane === "wallx") return other.z === cell.z && (other.x === cell.x || other.x === cell.x - 1);
    if (other.plane === "wallz") return other.x === cell.x && (other.z === cell.z || other.z === cell.z - 1);
    return false;
  });
}

/** Where a pitched roof's lower edge sits. Square walls hold it at the top of the story. A tent's triangle ends hold the peak level with those ends. */
export function roofHingeY(piece: Piece, all: Piece[]): number {
  if (piece.plane !== "roofx" && piece.plane !== "roofz") return piece.y;
  if (squareEave(piece, all)) return piece.y + 1;
  const cell = coversCell(piece);
  const cap = all.some((other) => other.plane === "floor" && other.y === piece.y + 1 && other.x === cell.x && other.z === cell.z);
  if (cap) return piece.y + 1;
  if (triangleGable(piece, all)) {
    const rise = Math.cos(roofAlpha(piece.shape)) * roofReach(piece.shape);
    return piece.y + gableTop(piece.shape) - rise;
  }
  return piece.y;
}

function gableTop(shape: Shape) {
  const h = roofReach(shape);
  return 0.5 + (h - TILE) / 2 + h / 2;
}

export function visualCenter(piece: Piece, all: Piece[] = [piece]): [number, number, number] {
  if (piece.plane === "floor") return [piece.x, piece.y, piece.z];
  if (piece.plane === "wallz") return [piece.x, piece.y + 0.5, piece.z + 0.5];
  if (piece.plane === "wallx") return [piece.x + 0.5, piece.y + 0.5, piece.z];
  const hinge = roofHingeY(piece, all);
  const alpha = roofAlpha(piece.shape);
  const lift = meshLift(piece.shape);
  const up = Math.cos(alpha) * lift;
  const inn = Math.sin(alpha) * lift;
  if (piece.plane === "roofx") return [piece.x, hinge + up, piece.z + 0.5 + piece.lean * inn];
  return [piece.x + 0.5 + piece.lean * inn, hinge + up, piece.z];
}

function add(list: Piece[], piece: Piece, used: Set<string>) {
  const key = `${piece.plane}|${piece.x}|${piece.y}|${piece.z}|${piece.lean}`;
  if (used.has(key)) return;
  if (piece.y < 0 || piece.y > 6) return;
  if (piece.x < -1 || piece.x > 6 || piece.z < -1 || piece.z > 6) return;
  list.push(piece);
}

function hasFloor(placed: Piece[], x: number, y: number, z: number) {
  return placed.some((piece) => piece.plane === "floor" && piece.x === x && piece.y === y && piece.z === z);
}

function hasColumn(placed: Piece[], x: number, y: number, z: number) {
  return placed.some((piece) => piece.plane === "floor" && piece.x === x && piece.z === z && piece.y <= y);
}

function storyOnFlat(placed: Piece[], x: number, y: number, z: number) {
  return placed.some((piece) => {
    if (piece.y !== y) return false;
    if (piece.plane === "wallx") return (piece.x === x || piece.x === x - 1) && piece.z === z;
    if (piece.plane === "wallz") return piece.x === x && (piece.z === z || piece.z === z - 1);
    return false;
  });
}

/** Lids first when laying flats. A roof is kept as a whole pair, never one slope. */
export function pickPads(open: Piece[], placed: Piece[], facing: Facing): Piece[] {
  if (open.length === 0) return [];
  if (placed.length === 0) return open.slice(0, 1);
  const cx = placed.reduce((sum, piece) => sum + piece.x, 0) / placed.length;
  const cy = placed.reduce((sum, piece) => sum + piece.y, 0) / placed.length;
  const cz = placed.reduce((sum, piece) => sum + piece.z, 0) / placed.length;
  const dist = (piece: Piece) => (piece.x - cx) ** 2 + (piece.y - cy) ** 2 + (piece.z - cz) ** 2;
  if (facing === "flat") {
    const lids = open.filter((piece) => piece.plane === "floor" && piece.y > 0).sort((a, b) => b.y - a.y || dist(a) - dist(b));
    const spread = open.filter((piece) => piece.plane === "floor" && piece.y === 0).sort((a, b) => dist(a) - dist(b)).slice(0, 4);
    return [...lids, ...spread];
  }
  if (facing === "roof") {
    return open.filter((piece) => piece.plane === "roofx" || piece.plane === "roofz");
  }
  const onFloor = (piece: Piece) => {
    if (piece.plane === "wallx") {
      return hasFloor(placed, piece.x, piece.y, piece.z) || hasFloor(placed, piece.x + 1, piece.y, piece.z);
    }
    if (piece.plane === "wallz") {
      return hasFloor(placed, piece.x, piece.y, piece.z) || hasFloor(placed, piece.x, piece.y, piece.z + 1);
    }
    return false;
  };
  const floors = placed.filter((piece) => piece.plane === "floor");
  const top = floors.reduce((highest, piece) => Math.max(highest, piece.y), 0);
  const holes = open.filter(onFloor);
  const rooms = holes.filter((piece) => piece.y < top).sort((a, b) => b.y - a.y || dist(a) - dist(b));
  const deck = holes.filter((piece) => piece.y >= top).sort((a, b) => dist(a) - dist(b));
  const above = open.filter((piece) => !onFloor(piece)).sort((a, b) => dist(a) - dist(b)).slice(0, 4);
  return [...rooms, ...deck, ...above].slice(0, 20);
}

export function sockets(placed: Piece[], shape: Shape, color: TileColor, cutout: Cutout = "none"): Piece[] {
  const used = new Set(placed.map((piece) => `${piece.plane}|${piece.x}|${piece.y}|${piece.z}|${piece.lean}`));
  const out: Piece[] = [];
  const hole = shape === "square" ? cutout : "none";
  const base = { shape, color, cutout: hole, rot: 0 as const };
  const cap = (x: number, y: number, z: number) => {
    if (!hasColumn(placed, x, y, z)) return;
    add(out, { ...base, shape: "square", cutout: "none", plane: "floor", lean: 1, x, y: y + 1, z }, used);
  };
  const pyramid = (x: number, y: number, z: number) => {
    const story = y - 1;
    if (story < 0 || storyOnFlat(placed, x, y, z)) return;
    add(out, { ...base, plane: "roofx", lean: -1, x, y: story, z }, used);
    add(out, { ...base, plane: "roofx", lean: 1, x, y: story, z: z - 1 }, used);
    add(out, { ...base, plane: "roofz", lean: -1, x, y: story, z }, used);
    add(out, { ...base, plane: "roofz", lean: 1, x: x - 1, y: story, z }, used);
  };
  for (const tile of placed) {
    if (tile.plane === "floor") {
      add(out, { ...base, plane: "floor", lean: 1, x: tile.x + 1, y: tile.y, z: tile.z }, used);
      add(out, { ...base, plane: "floor", lean: 1, x: tile.x - 1, y: tile.y, z: tile.z }, used);
      add(out, { ...base, plane: "floor", lean: 1, x: tile.x, y: tile.y, z: tile.z + 1 }, used);
      add(out, { ...base, plane: "floor", lean: 1, x: tile.x, y: tile.y, z: tile.z - 1 }, used);
      add(out, { ...base, plane: "wallx", lean: 1, x: tile.x, y: tile.y, z: tile.z }, used);
      add(out, { ...base, plane: "wallx", lean: 1, x: tile.x - 1, y: tile.y, z: tile.z }, used);
      add(out, { ...base, plane: "wallz", lean: 1, x: tile.x, y: tile.y, z: tile.z }, used);
      add(out, { ...base, plane: "wallz", lean: 1, x: tile.x, y: tile.y, z: tile.z - 1 }, used);
      pyramid(tile.x, tile.y, tile.z);
    } else if (tile.plane === "wallx" || tile.plane === "wallz") {
      add(out, { ...base, plane: tile.plane, lean: 1, x: tile.x, y: tile.y + 1, z: tile.z }, used);
      if (tile.plane === "wallx") {
        add(out, { ...base, plane: "wallx", lean: 1, x: tile.x, y: tile.y, z: tile.z + 1 }, used);
        add(out, { ...base, plane: "wallx", lean: 1, x: tile.x, y: tile.y, z: tile.z - 1 }, used);
        cap(tile.x, tile.y, tile.z);
        cap(tile.x + 1, tile.y, tile.z);
      } else {
        add(out, { ...base, plane: "wallz", lean: 1, x: tile.x + 1, y: tile.y, z: tile.z }, used);
        add(out, { ...base, plane: "wallz", lean: 1, x: tile.x - 1, y: tile.y, z: tile.z }, used);
        cap(tile.x, tile.y, tile.z);
        cap(tile.x, tile.y, tile.z + 1);
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((piece) => {
    const key = `${piece.plane}|${piece.x}|${piece.y}|${piece.z}|${piece.lean}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function starterFloors(shape: Shape, color: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 1; x <= 3; x++) {
    for (let z = 1; z <= 3; z++) {
      out.push({ shape, color, cutout: "none", rot: 0, plane: "floor", lean: 1, x, y: 0, z });
    }
  }
  return out;
}

export function starterWalls(shape: Shape, color: TileColor): Piece[] {
  const base = { shape, color, cutout: "none" as const, rot: 0 as const, lean: 1 as const, y: 0 };
  return [
    { ...base, plane: "wallx", x: 2, z: 2 },
    { ...base, plane: "wallx", x: 1, z: 2 },
    { ...base, plane: "wallz", x: 2, z: 2 },
    { ...base, plane: "wallz", x: 2, z: 1 },
  ];
}
