import type { Cutout, Difficulty, Piece, Shape, TileColor } from "./tiles";

export type Puzzle = {
  id: number;
  name: string;
  difficulty: Difficulty;
  pieces: Piece[];
};

const COLORS: TileColor[] = ["coral", "gold", "mint", "sky", "lilac", "blush"];

type Side = "n" | "s" | "e" | "w";
type Roof = "flat" | "point";
type Cell = { x: number; z: number; stories: number; roof: Roof; bare?: boolean };
type Opening = { x: number; z: number; side: Side; story: number; cut: Cutout };
type Wheels = "none" | "ends" | "all";
type Spec = { name: string; cells: Cell[]; openings?: Opening[]; wheels?: Wheels };

function tile(
  shape: Shape,
  plane: Piece["plane"],
  x: number,
  y: number,
  z: number,
  color: TileColor,
  lean: -1 | 1 = 1,
  cutout: Cutout = "none",
): Piece {
  return { shape, plane, x, y, z, color, lean, cutout, rot: 0 };
}

function rect(x: number, z: number, w: number, d: number, stories: number, roof: Roof): Cell[] {
  const out: Cell[] = [];
  for (let ix = x; ix < x + w; ix++) for (let iz = z; iz < z + d; iz++) out.push({ x: ix, z: iz, stories, roof });
  return out;
}

function raise(cells: Cell[], x: number, z: number, stories: number, roof: Roof): Cell[] {
  return cells.map((cell) => (cell.x === x && cell.z === z ? { ...cell, stories, roof } : cell));
}

function shell(spec: Spec, index: number): Piece[] {
  const wall = COLORS[index % COLORS.length]!;
  const roof = COLORS[(index + 2) % COLORS.length]!;
  const base = COLORS[(index + 4) % COLORS.length]!;
  const hub = COLORS[(index + 1) % COLORS.length]!;
  const map = new Map(spec.cells.map((cell) => [`${cell.x},${cell.z}`, cell]));
  const pieces: Piece[] = [];
  const seen = new Set<string>();
  const add = (piece: Piece) => {
    const key = `${piece.shape}|${piece.plane}|${piece.x}|${piece.y}|${piece.z}|${piece.lean}|${piece.cutout}`;
    if (seen.has(key)) return;
    seen.add(key);
    pieces.push(piece);
  };
  const neighbor = (cell: Cell, side: Side) => {
    if (side === "n") return map.get(`${cell.x},${cell.z + 1}`);
    if (side === "s") return map.get(`${cell.x},${cell.z - 1}`);
    if (side === "e") return map.get(`${cell.x + 1},${cell.z}`);
    return map.get(`${cell.x - 1},${cell.z}`);
  };
  const needs = (cell: Cell, side: Side, story: number) => {
    if (cell.bare) return false;
    const next = neighbor(cell, side);
    if (!next || next.stories <= story) return true;
    return cell.roof === "point" && story === cell.stories - 1;
  };
  const cut = (cell: Cell, side: Side, story: number): Cutout =>
    spec.openings?.find((item) => item.x === cell.x && item.z === cell.z && item.side === side && item.story === story)?.cut ?? "none";

  for (const cell of spec.cells) {
    add(tile("square", "floor", cell.x, 0, cell.z, base));
    if (cell.roof === "flat") add(tile("square", "floor", cell.x, cell.stories, cell.z, roof));
    else {
      const y = cell.stories - 1;
      add(tile("triangle", "roofx", cell.x, y, cell.z, roof, -1));
      add(tile("triangle", "roofx", cell.x, y, cell.z - 1, roof, 1));
      add(tile("triangle", "roofz", cell.x, y, cell.z, roof, -1));
      add(tile("triangle", "roofz", cell.x - 1, y, cell.z, roof, 1));
    }
    for (let story = 0; story < cell.stories; story++) {
      if (needs(cell, "s", story)) {
        const next = neighbor(cell, "s");
        if (!(next && needs(next, "n", story))) add(tile("square", "wallz", cell.x, story, cell.z - 1, wall, 1, cut(cell, "s", story)));
      }
      if (needs(cell, "n", story)) add(tile("square", "wallz", cell.x, story, cell.z, wall, 1, cut(cell, "n", story)));
      if (needs(cell, "w", story)) {
        const next = neighbor(cell, "w");
        if (!(next && needs(next, "e", story))) add(tile("square", "wallx", cell.x - 1, story, cell.z, wall, 1, cut(cell, "w", story)));
      }
      if (needs(cell, "e", story)) add(tile("square", "wallx", cell.x, story, cell.z, wall, 1, cut(cell, "e", story)));
    }
  }

  if (spec.wheels && spec.wheels !== "none") {
    const xs = spec.cells.map((cell) => cell.x);
    const zs = spec.cells.map((cell) => cell.z);
    const longX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
    const min = longX ? Math.min(...xs) : Math.min(...zs);
    const max = longX ? Math.max(...xs) : Math.max(...zs);
    for (const cell of spec.cells) {
      const atEnd = longX ? cell.x === min || cell.x === max : cell.z === min || cell.z === max;
      if (spec.wheels === "ends" && !atEnd) continue;
      if (longX) {
        add(tile("wheel", "wallz", cell.x, 0, cell.z - 1, hub, -1));
        add(tile("wheel", "wallz", cell.x, 0, cell.z, hub, 1));
      } else {
        add(tile("wheel", "wallx", cell.x - 1, 0, cell.z, hub, -1));
        add(tile("wheel", "wallx", cell.x, 0, cell.z, hub, 1));
      }
    }
  }
  return pieces;
}

function shift(cells: Cell[], dx: number, dz: number): Cell[] {
  return cells.map((cell) => ({ ...cell, x: cell.x + dx, z: cell.z + dz }));
}

const door = (x: number, z = 0, story = 0, side: Side = "s"): Opening => ({ x, z, side, story, cut: "door" });
const window = (x: number, z = 0, story = 0, side: Side = "s"): Opening => ({ x, z, side, story, cut: "window" });
const arch = (x: number, z = 0, story = 0, side: Side = "s"): Opening => ({ x, z, side, story, cut: "arch" });

function catalog(): Spec[] {
  const specs: Spec[] = [];
  const put = (name: string, cells: Cell[], openings: Opening[] = [], wheels: Wheels = "none") => specs.push({ name, cells, openings, wheels });

  put("Pyramid", [{ x: 0, z: 0, stories: 1, roof: "point", bare: true }]);
  put("Cube", rect(0, 0, 1, 1, 1, "flat"));
  put("Present", rect(0, 0, 1, 1, 1, "flat"));
  put("Safe", rect(0, 0, 1, 1, 1, "flat"), [door(0)]);
  put("Lantern", rect(0, 0, 1, 1, 1, "flat"), [window(0, 0, 0, "s"), window(0, 0, 0, "n"), window(0, 0, 0, "e"), window(0, 0, 0, "w")]);
  put("Little House", [{ x: 0, z: 0, stories: 1, roof: "point" }], [door(0)]);
  put("Window House", [{ x: 0, z: 0, stories: 1, roof: "point" }], [door(0), window(0, 0, 0, "e"), window(0, 0, 0, "w")]);
  put("Shed", rect(0, 0, 2, 1, 1, "flat"), [door(0)]);
  put("Cabin", rect(0, 0, 2, 1, 1, "flat"), [door(0), window(1)]);
  put("Garage", rect(0, 0, 3, 1, 1, "flat"), [door(1)]);
  put("Bungalow", rect(0, 0, 3, 1, 1, "flat"), [window(0), door(1), window(2)]);
  put("Square House", rect(0, 0, 2, 2, 1, "flat"), [door(0, 0), window(1, 0)]);
  put("Short Tower", rect(0, 0, 1, 1, 2, "flat"), [door(0), window(0, 0, 1)]);
  put("Watchtower", rect(0, 0, 1, 1, 3, "flat"), [door(0), window(0, 0, 2)]);
  put("Pointed Tower", [{ x: 0, z: 0, stories: 2, roof: "point" }], [door(0), window(0, 0, 1)]);
  put("Rocket", [{ x: 0, z: 0, stories: 3, roof: "point" }], [window(0, 0, 1)]);
  put("Split Cottage", [{ x: 0, z: 0, stories: 1, roof: "flat" }, { x: 1, z: 0, stories: 2, roof: "flat" }], [door(0), window(1, 0, 1)]);
  put("Twin Peaks", [{ x: 0, z: 0, stories: 1, roof: "point" }, { x: 1, z: 0, stories: 1, roof: "point" }], [door(0)]);
  put("L-House", [{ x: 0, z: 0, stories: 1, roof: "flat" }, { x: 1, z: 0, stories: 1, roof: "flat" }, { x: 0, z: 1, stories: 1, roof: "flat" }], [door(1)]);
  put("Shop", rect(0, 0, 2, 2, 1, "flat"), [door(0, 0), window(1, 0), window(1, 0, 0, "e")]);

  put("Barn", rect(0, 0, 4, 2, 1, "flat"), [door(1, 0), door(2, 0), window(0, 0), window(3, 0)]);
  put("School", rect(0, 0, 4, 1, 1, "flat"), [window(0), door(1), window(2), window(3)]);
  put("Fire Station", raise(rect(0, 0, 3, 2, 1, "flat"), 2, 1, 2, "point"), [door(1, 0), window(2, 1, 1)]);
  put("Church", raise(rect(0, 0, 3, 1, 1, "flat"), 2, 0, 3, "point"), [door(1), window(2, 0, 1), window(2, 0, 2)]);
  put("Lighthouse", raise(rect(0, 0, 2, 2, 1, "flat"), 0, 0, 4, "point"), [door(1, 0), window(0, 0, 2), window(0, 0, 3)]);
  put("Gallery", raise(raise(rect(0, 0, 4, 1, 1, "flat"), 0, 0, 2, "flat"), 3, 0, 2, "flat"), [door(1), window(0, 0, 1), window(3, 0, 1)]);
  put("Car", rect(0, 0, 2, 1, 1, "flat"), [window(0), window(1)], "all");
  put("Bus", rect(0, 0, 4, 1, 1, "flat"), [door(0), window(1), window(2), window(3)], "ends");
  put("Truck", [{ x: 0, z: 0, stories: 2, roof: "flat" }, { x: 1, z: 0, stories: 1, roof: "flat" }, { x: 2, z: 0, stories: 1, roof: "flat" }], [window(0, 0, 1), door(0)], "ends");
  put("Train Car", rect(0, 0, 3, 1, 1, "flat"), [window(0), window(1), window(2)], "ends");
  put("Engine", [{ x: 0, z: 0, stories: 2, roof: "point" }, { x: 1, z: 0, stories: 1, roof: "flat" }, { x: 2, z: 0, stories: 1, roof: "flat" }], [window(0, 0, 1), door(1)], "ends");
  put("Airplane", [
    ...rect(0, 0, 3, 1, 1, "flat"),
    { x: 1, z: 1, stories: 1, roof: "flat" },
    { x: 1, z: -1, stories: 1, roof: "flat" },
    { x: 3, z: 0, stories: 2, roof: "flat" },
  ], [window(0), window(3, 0, 1)]);
  put("Silo", [{ x: 0, z: 0, stories: 4, roof: "point" }], [door(0), window(0, 0, 3)]);
  put("Farmhouse", rect(0, 0, 3, 2, 2, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1)]);
  put("Covered Bridge", [
    { x: 0, z: 0, stories: 2, roof: "flat" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 1, roof: "flat" },
    { x: 3, z: 0, stories: 1, roof: "flat" },
    { x: 4, z: 0, stories: 2, roof: "flat" },
  ], [arch(2), window(0, 0, 1), window(4, 0, 1)]);
  put("Gatehouse", [
    { x: 0, z: 0, stories: 2, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 2, roof: "point" },
  ], [arch(1), window(0, 0, 1), window(2, 0, 1)]);
  put("Market", rect(0, 0, 3, 1, 1, "flat"), [door(0), door(1), door(2)]);
  put("Motel", rect(0, 0, 4, 1, 2, "flat"), [door(0), door(1), door(2), door(3), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1), window(3, 0, 1)]);
  put("Library", rect(0, 0, 3, 2, 1, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(0, 1), window(2, 1)]);
  put("Hangar", rect(0, 0, 4, 2, 1, "flat"), [door(0, 0, 0, "w"), door(0, 1, 0, "w"), window(3, 0, 0, "e")]);
  put("Control Tower", raise(rect(0, 0, 2, 2, 1, "flat"), 1, 1, 3, "flat"), [door(0, 0), window(1, 1, 1), window(1, 1, 2)]);
  put("Greenhouse", rect(0, 0, 2, 2, 1, "flat"), [door(0, 0), window(1, 0), window(0, 0, 0, "w"), window(1, 1, 0, "n"), window(1, 0, 0, "e")]);
  put("Keep", rect(0, 0, 3, 3, 1, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(0, 2, 0, "n"), window(2, 2, 0, "n")]);
  put("Corner Tower", raise(
    [{ x: 0, z: 0, stories: 1, roof: "flat" }, { x: 1, z: 0, stories: 1, roof: "flat" }, { x: 0, z: 1, stories: 1, roof: "flat" }],
    0, 1, 3, "point",
  ), [door(1), window(0, 1, 2)]);
  put("Lodge", rect(0, 0, 2, 2, 2, "flat"), [door(0, 0), window(1, 0), window(0, 0, 1), window(1, 0, 1), window(1, 1, 1, "n")]);
  put("Depot", raise(rect(0, 0, 4, 1, 1, "flat"), 3, 0, 2, "point"), [door(1), window(3, 0, 1)]);
  put("Camper", rect(0, 0, 3, 1, 1, "flat"), [door(0), window(1), window(2)], "ends");
  put("Warehouse", rect(0, 0, 4, 3, 1, "flat"), [door(1, 0), door(2, 0)]);
  put("Fire Lookout", raise(rect(0, 0, 2, 2, 1, "flat"), 0, 1, 4, "point"), [door(1, 0), window(0, 1, 2), window(0, 1, 3)]);
  put("Station", raise(rect(0, 0, 3, 1, 1, "flat"), 2, 0, 2, "flat"), [door(1), window(2, 0, 1)]);

  put("Two-Story House", rect(0, 0, 2, 2, 2, "flat"), [door(0, 0), window(1, 0), window(0, 0, 1), window(1, 0, 1), window(0, 1, 1, "n"), window(1, 1, 1, "n")]);
  put("Schoolhouse", rect(0, 0, 4, 1, 2, "flat"), [door(1), window(0), window(2), window(3), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1), window(3, 0, 1)]);
  put("Firehouse", raise(rect(0, 0, 4, 2, 1, "flat"), 3, 1, 3, "point"), [door(1, 0), door(2, 0), window(3, 1, 2)]);
  put("Church Hall", raise(rect(0, 0, 4, 2, 1, "flat"), 3, 1, 3, "point"), [door(1, 0), window(3, 1, 1), window(3, 1, 2)]);
  put("Lighthouse Cottage", [
    { x: 0, z: 0, stories: 4, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 1, roof: "flat" },
  ], [door(1), window(0, 0, 2), window(0, 0, 3), window(2)]);
  put("Castle Gate", [
    { x: 0, z: 0, stories: 3, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 3, roof: "point" },
  ], [arch(1), window(0, 0, 2), window(2, 0, 2)]);
  put("Square Keep", rect(0, 0, 2, 2, 3, "flat"), [door(0, 0), window(1, 0), window(0, 0, 1), window(1, 0, 1), window(0, 0, 2), window(1, 0, 2)]);
  put("Step Pyramid", [
    ...rect(0, 0, 3, 3, 1, "flat").filter((cell) => !(cell.x === 1 && cell.z === 1)),
    { x: 1, z: 1, stories: 2, roof: "point" },
  ]);
  put("Launch Rocket", raise(rect(0, 0, 3, 3, 1, "flat"), 1, 1, 4, "point"), [door(1, 0), window(1, 1, 2), window(1, 1, 3)]);
  put("Spaceship", [
    { x: 0, z: 0, stories: 2, roof: "point" },
    { x: 1, z: 0, stories: 2, roof: "flat" },
    { x: 2, z: 0, stories: 2, roof: "flat" },
    { x: 1, z: 1, stories: 1, roof: "flat" },
    { x: 1, z: -1, stories: 1, roof: "flat" },
  ], [window(2, 0, 1)]);
  put("Airliner", [
    ...rect(0, 0, 4, 1, 1, "flat"),
    { x: 1, z: 1, stories: 1, roof: "flat" },
    { x: 2, z: 1, stories: 1, roof: "flat" },
    { x: 1, z: -1, stories: 1, roof: "flat" },
    { x: 2, z: -1, stories: 1, roof: "flat" },
    { x: 4, z: 0, stories: 2, roof: "flat" },
  ], [window(0), window(4, 0, 1)]);
  put("Two-Car Train", [
    { x: 0, z: 0, stories: 2, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 3, z: 0, stories: 1, roof: "flat" },
    { x: 4, z: 0, stories: 1, roof: "flat" },
  ], [window(0, 0, 1), window(1), window(3), window(4)], "all");
  put("Tower Bridge", [
    { x: 0, z: 0, stories: 3, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 1, roof: "flat" },
    { x: 3, z: 0, stories: 1, roof: "flat" },
    { x: 4, z: 0, stories: 3, roof: "point" },
  ], [window(0, 0, 2), window(4, 0, 2), arch(2)]);
  put("Barn Loft", rect(0, 0, 4, 2, 2, "flat"), [door(1, 0), door(2, 0), window(0, 0, 1), window(3, 0, 1), window(1, 1, 1, "n")]);
  put("Farm", [
    ...rect(0, 0, 3, 2, 1, "flat"),
    { x: 3, z: 0, stories: 3, roof: "point" },
  ], [door(1, 0), window(3, 0, 2)]);
  put("Chimney House", raise(rect(0, 0, 2, 2, 1, "flat"), 1, 1, 2, "flat"), [door(0, 0), window(1, 0), window(1, 1, 1)]);
  put("Hotel", rect(0, 0, 4, 2, 2, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(3, 0), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1), window(3, 0, 1)]);
  put("Three Towers", raise(raise(raise(rect(0, 0, 5, 1, 1, "flat"), 0, 0, 3, "point"), 2, 0, 3, "point"), 4, 0, 3, "point"), [door(1), window(0, 0, 2), window(2, 0, 2), window(4, 0, 2)]);
  put("Airport", raise(rect(0, 0, 5, 1, 1, "flat"), 4, 0, 3, "flat"), [door(1), window(0), window(2), window(4, 0, 1), window(4, 0, 2)]);
  put("Garage House", [
    { x: 0, z: 0, stories: 1, roof: "flat" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 2, roof: "flat" },
    { x: 3, z: 0, stories: 2, roof: "flat" },
  ], [door(0), door(1), window(2, 0, 1), window(3, 0, 1)]);
  put("Mill", raise(rect(0, 0, 2, 2, 2, "flat"), 0, 1, 3, "point"), [door(1, 0), window(0, 1, 2)]);
  put("Double Garage", rect(0, 0, 2, 2, 1, "flat"), [door(0, 0), door(1, 0)]);
  put("Storehouse", rect(0, 0, 3, 2, 1, "flat"), [door(1, 0), window(0, 0), window(2, 0)]);
  put("Tunnel", rect(0, 0, 4, 1, 1, "flat"), [arch(0, 0, 0, "w"), arch(3, 0, 0, "e")]);
  put("Library Hall", rect(0, 0, 4, 2, 2, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(3, 0), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1), window(3, 0, 1)]);
  put("Market Hall", rect(0, 0, 4, 2, 1, "flat"), [door(0, 0), door(1, 0), door(2, 0), door(3, 0)]);
  put("Temple", [
    ...rect(0, 0, 4, 4, 1, "flat").filter((cell) => cell.x < 1 || cell.x > 2 || cell.z < 1 || cell.z > 2),
    { x: 1, z: 1, stories: 2, roof: "flat" },
    { x: 2, z: 1, stories: 2, roof: "flat" },
    { x: 1, z: 2, stories: 2, roof: "flat" },
    { x: 2, z: 2, stories: 3, roof: "point" },
  ], [door(1, 0)]);
  put("Fort Keep", rect(0, 0, 3, 3, 2, "flat"), [door(1, 0), window(0, 0, 1), window(2, 0, 1), window(1, 2, 1, "n")]);
  put("Clock Tower", raise(rect(0, 0, 2, 2, 1, "flat"), 0, 1, 5, "point"), [door(1, 0), window(0, 1, 2), window(0, 1, 3), window(0, 1, 4)]);
  put("Cafe", rect(0, 0, 2, 2, 1, "flat"), [door(0, 0), window(1, 0), window(0, 1, 0, "n"), window(1, 1, 0, "n"), window(1, 0, 0, "e")]);

  put("Four-Tower Castle", (() => {
    let cells = rect(0, 0, 3, 3, 2, "flat");
    for (const [x, z] of [[0, 0], [2, 0], [0, 2], [2, 2]] as const) cells = raise(cells, x, z, 3, "point");
    return cells;
  })(), [arch(1, 0), window(0, 0, 2), window(2, 0, 2), window(0, 2, 2, "n"), window(2, 2, 2, "n")]);
  put("Little Village", [
    ...rect(0, 0, 2, 1, 1, "flat"),
    ...shift([{ x: 0, z: 0, stories: 1, roof: "point" }], 4, 0),
    ...shift(rect(0, 0, 1, 1, 3, "flat"), 6, 0),
  ], [door(0), door(4), window(6, 0, 2)]);
  put("Palace", raise(rect(0, 0, 5, 2, 2, "flat"), 2, 1, 3, "flat"), [door(2, 0), window(0, 0), window(1, 0), window(3, 0), window(4, 0), window(2, 1, 2)]);
  put("Cathedral", raise(raise(rect(0, 0, 5, 2, 2, "flat"), 0, 1, 4, "point"), 4, 1, 4, "point"), [door(2, 0), arch(2, 0, 1), window(0, 1, 3), window(4, 1, 3)]);
  put("Spaceport", [
    ...rect(0, 0, 3, 2, 1, "flat"),
    ...shift([{ x: 0, z: 0, stories: 4, roof: "point" }], 4, 0),
    ...shift(rect(0, 0, 2, 1, 1, "flat"), 4, 2),
  ], [door(1, 0), window(4, 0, 2), window(4, 0, 3), door(4, 2)]);
  put("Train Station", [
    ...rect(0, 0, 4, 1, 1, "flat"),
    ...shift([{ x: 0, z: 0, stories: 2, roof: "point" }, { x: 1, z: 0, stories: 1, roof: "flat" }, { x: 2, z: 0, stories: 1, roof: "flat" }], 0, -2),
  ], [door(1), window(0, -2, 1), window(1, -2), window(2, -2)]);
  // wheels added below for the train only — handled by a custom wheels flag on a joined spec
  put("Airport and Plane", [
    ...rect(0, 0, 4, 1, 1, "flat"),
    ...shift([
      ...rect(0, 0, 3, 1, 1, "flat"),
      { x: 1, z: 1, stories: 1, roof: "flat" },
      { x: 1, z: -1, stories: 1, roof: "flat" },
    ], 0, -3),
  ], [door(1), window(0, -3)]);
  put("Hill Castle", raise(rect(0, 0, 3, 3, 1, "flat"), 1, 1, 3, "point"), [door(1, 0), window(1, 1, 2)]);
  put("Lighthouse Point", [
    { x: 0, z: 0, stories: 4, roof: "point" },
    ...shift(rect(0, 0, 2, 1, 1, "flat"), 2, 0),
    ...shift(rect(0, 0, 1, 1, 1, "flat"), 2, -2),
  ], [door(2), window(0, 0, 3), door(2, -2)]);
  put("School Block", [
    ...rect(0, 0, 4, 1, 2, "flat"),
    ...shift(rect(0, 0, 2, 2, 1, "flat"), 4, 0),
  ], [door(1), window(0, 0, 1), window(2, 0, 1), door(4)]);
  put("High Keep", rect(0, 0, 2, 2, 4, "flat"), [door(0, 0), window(1, 0, 1), window(0, 0, 2), window(1, 0, 3)]);
  put("Grand Pyramid", [
    ...rect(0, 0, 4, 4, 1, "flat").filter((cell) => cell.x === 0 || cell.z === 0 || cell.x === 3 || cell.z === 3),
    { x: 1, z: 1, stories: 2, roof: "flat" },
    { x: 2, z: 1, stories: 2, roof: "flat" },
    { x: 1, z: 2, stories: 2, roof: "flat" },
    { x: 2, z: 2, stories: 3, roof: "point" },
  ]);
  put("Bridge Castle", [
    { x: 0, z: 0, stories: 2, roof: "point" },
    { x: 0, z: 1, stories: 2, roof: "point" },
    { x: 1, z: 0, stories: 1, roof: "flat" },
    { x: 2, z: 0, stories: 1, roof: "flat" },
    { x: 3, z: 0, stories: 1, roof: "flat" },
    { x: 4, z: 0, stories: 2, roof: "point" },
    { x: 4, z: 1, stories: 2, roof: "point" },
  ], [arch(2), window(0, 1, 1, "n"), window(4, 1, 1, "n")]);
  put("Warehouse Row", rect(0, 0, 6, 2, 1, "flat"), [door(0, 0), door(2, 0), door(4, 0)]);
  put("Fire Yard", [
    ...raise(rect(0, 0, 3, 2, 1, "flat"), 2, 1, 3, "point"),
    ...shift(rect(0, 0, 2, 1, 1, "flat"), 0, -2),
  ], [door(1, 0), window(2, 1, 2), window(0, -2), door(1, -2)]);
  put("Manor", rect(0, 0, 4, 2, 2, "flat"), [door(1, 0), window(0, 0), window(2, 0), window(3, 0), window(0, 0, 1), window(1, 0, 1), window(2, 0, 1), window(3, 0, 1), window(0, 1, 1, "n")]);
  put("Citadel", rect(0, 0, 4, 4, 2, "flat"), [door(1, 0), window(0, 0, 1), window(3, 0, 1), window(0, 3, 1, "n"), window(3, 3, 1, "n")]);
  put("Shipyard", rect(0, 0, 5, 2, 1, "flat"), [door(1, 0), door(3, 0), window(0, 1, 0, "n"), window(4, 1, 0, "n")]);
  put("Rocket Base", [
    ...rect(0, 0, 3, 2, 1, "flat"),
    { x: 3, z: 0, stories: 3, roof: "flat" },
    ...shift([{ x: 0, z: 0, stories: 4, roof: "point" }], 5, 0),
  ], [door(1, 0), window(3, 0, 2), window(5, 0, 2), window(5, 0, 3)]);
  put("King's Castle", (() => {
    let cells = rect(0, 0, 3, 2, 2, "flat");
    for (const [x, z] of [[0, 0], [2, 0], [0, 1], [2, 1]] as const) cells = raise(cells, x, z, 3, "point");
    return cells;
  })(), [arch(1, 0), window(0, 0, 2), window(2, 0, 2), window(0, 1, 2, "n"), window(2, 1, 2, "n")]);

  return specs;
}

function withTrainWheels(pieces: Piece[], spec: Spec, index: number): Piece[] {
  if (spec.name !== "Train Station" && spec.name !== "Fire Yard") return pieces;
  const hub = COLORS[(index + 1) % COLORS.length]!;
  const extra: Piece[] = [];
  if (spec.name === "Train Station") {
    for (const x of [0, 2]) {
      extra.push(tile("wheel", "wallz", x, 0, -3, hub, -1), tile("wheel", "wallz", x, 0, -2, hub, 1));
    }
  }
  if (spec.name === "Fire Yard") {
    extra.push(tile("wheel", "wallz", 0, 0, -3, hub, -1), tile("wheel", "wallz", 0, 0, -2, hub, 1));
    extra.push(tile("wheel", "wallz", 1, 0, -3, hub, -1), tile("wheel", "wallz", 1, 0, -2, hub, 1));
  }
  return [...pieces, ...extra];
}

function assemble(): Puzzle[] {
  const specs = catalog();
  if (specs.length !== 100) throw new Error(`Expected 100 puzzle specs, got ${specs.length}`);
  return specs.map((spec, index) => {
    const id = index + 1;
    const difficulty: Difficulty = id <= 20 ? "easy" : id <= 50 ? "moderate" : id <= 80 ? "advanced" : "expert";
    return { id, name: spec.name, difficulty, pieces: withTrainWheels(shell(spec, index), spec, index) };
  });
}

export const PUZZLES: Puzzle[] = assemble();

export function guidanceRatio(puzzleId: number): number {
  if (puzzleId <= 20) return 1;
  const t = Math.min(1, Math.max(0, (puzzleId - 21) / 79));
  return 0.7 - t * 0.6;
}

export function guidanceCount(total: number, puzzleId: number): number {
  if (puzzleId <= 20) return total;
  return Math.max(1, Math.round(total * guidanceRatio(puzzleId)));
}

export function guideLabel(puzzleId: number): string {
  if (puzzleId <= 20) return "Easy";
  if (puzzleId <= 50) return "Trickier";
  if (puzzleId <= 80) return "Hard";
  return "Expert";
}
