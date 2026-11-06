import type { Cutout, Difficulty, Piece, Shape, TileColor } from "./tiles";

export type Puzzle = {
  id: number;
  name: string;
  difficulty: Difficulty;
  pieces: Piece[];
};

const COLORS: TileColor[] = ["coral", "gold", "mint", "sky", "lilac", "blush"];

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

function tower(stories: number, wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [tile("square", "floor", 0, 0, 0, base)];
  for (let s = 0; s < stories; s++) {
    const cut: Cutout = s === 0 ? "door" : s % 2 === 1 ? "window" : "none";
    out.push(
      tile("square", "wallx", 0, s, 0, wall, 1, cut),
      tile("square", "wallx", -1, s, 0, wall),
      tile("square", "wallz", 0, s, 0, wall, 1, s === 0 ? "window" : "none"),
      tile("square", "wallz", 0, s, -1, wall),
    );
  }
  const top = stories - 1;
  out.push(
    tile("triangle", "roofx", 0, top, 0, roof, -1),
    tile("triangle", "roofx", 0, top, -1, roof, 1),
    tile("triangle", "roofz", 0, top, 0, roof, -1),
    tile("triangle", "roofz", -1, top, 0, roof, 1),
  );
  return out;
}

function house(w: number, stories: number, wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < w; x++) out.push(tile("square", "floor", x, 0, 0, base));
  for (let s = 0; s < stories; s++) {
    for (let x = 0; x < w; x++) {
      out.push(tile("square", "wallz", x, s, 0, wall, 1, s === stories - 1 ? "window" : "none"));
      out.push(tile("square", "wallz", x, s, -1, wall, 1, s === 0 && x === Math.floor(w / 2) ? "door" : "none"));
    }
    out.push(tile(s === stories - 1 ? "triangle" : "square", "wallx", -1, s, 0, wall));
    out.push(tile(s === stories - 1 ? "triangle" : "square", "wallx", w - 1, s, 0, wall));
  }
  const top = stories - 1;
  for (let x = 0; x < w; x++) {
    out.push(tile("triangle", "roofx", x, top, 0, roof, -1));
    out.push(tile("triangle", "roofx", x, top, -1, roof, 1));
  }
  return out;
}

function tent(len: number, cloth: TileColor, roof: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < len; x++) {
    out.push(tile("square", "floor", x, 0, 0, cloth));
    out.push(tile("triangle", "roofx", x, 0, 0, roof, -1));
    out.push(tile("triangle", "roofx", x, 0, -1, roof, 1));
  }
  out.push(tile("triangle", "wallx", -1, 0, 0, cloth));
  out.push(tile("triangle", "wallx", len - 1, 0, 0, cloth));
  return out;
}

function hall(w: number, d: number, wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) out.push(tile("square", "floor", x, 0, z, base));
  }
  for (let x = 0; x < w; x++) {
    out.push(tile("square", "wallz", x, 0, -1, wall, 1, x === 0 ? "door" : "none"));
    out.push(tile("square", "wallz", x, 0, d - 1, wall, 1, "window"));
    out.push(tile("triangle", "roofx", x, 0, -1, roof, 1));
    out.push(tile("triangle", "roofx", x, 0, d - 1, roof, -1));
  }
  for (let z = 0; z < d; z++) {
    out.push(tile("square", "wallx", -1, 0, z, wall));
    out.push(tile("square", "wallx", w - 1, 0, z, wall));
  }
  return out;
}

function booth(wall: TileColor, roof: TileColor, base: TileColor, roofs: number): Piece[] {
  const out: Piece[] = [
    tile("square", "floor", 0, 0, 0, base),
    tile("square", "wallx", 0, 0, 0, wall, 1, "window"),
    tile("square", "wallx", -1, 0, 0, wall),
    tile("square", "wallz", 0, 0, 0, wall),
    tile("square", "wallz", 0, 0, -1, wall, 1, "door"),
  ];
  if (roofs > 0) out.push(tile("triangle", "roofx", 0, 0, 0, roof, -1));
  if (roofs > 1) out.push(tile("triangle", "roofx", 0, 0, -1, roof, 1));
  if (roofs > 2) out.push(tile("triangle", "roofz", 0, 0, 0, roof, -1));
  if (roofs > 3) out.push(tile("triangle", "roofz", -1, 0, 0, roof, 1));
  return out;
}

function yard(wall: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 2; x++) {
    for (let z = 0; z < 2; z++) out.push(tile("square", "floor", x, 0, z, base));
  }
  for (let x = 0; x < 2; x++) {
    out.push(tile("square", "wallz", x, 0, -1, wall, 1, x === 0 ? "door" : "none"));
    out.push(tile("square", "wallz", x, 0, 1, wall, 1, "window"));
  }
  for (let z = 0; z < 2; z++) {
    out.push(tile("square", "wallx", -1, 0, z, wall));
    out.push(tile("square", "wallx", 1, 0, z, wall));
  }
  return out;
}

function keep(stories: number, wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 2; x++) {
    for (let z = 0; z < 2; z++) {
      out.push(tile("square", "floor", x, 0, z, base));
      out.push(tile("square", "floor", x, stories, z, roof));
    }
  }
  for (let s = 0; s < stories; s++) {
    for (let x = 0; x < 2; x++) {
      out.push(tile("square", "wallz", x, s, -1, wall, 1, s === 0 && x === 0 ? "door" : s === stories - 1 ? "window" : "none"));
      out.push(tile("square", "wallz", x, s, 1, wall, 1, s === stories - 1 ? "window" : "none"));
    }
    for (let z = 0; z < 2; z++) {
      out.push(tile("square", "wallx", -1, s, z, wall, 1, s > 0 ? "window" : "none"));
      out.push(tile("square", "wallx", 1, s, z, wall));
    }
  }
  return out;
}

function pyramid(base: TileColor, tip: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, base),
    tile("triangle", "roofx", 0, 0, 0, tip, -1),
    tile("triangle", "roofx", 0, 0, -1, tip, 1),
    tile("triangle", "roofz", 0, 0, 0, tip, -1),
    tile("triangle", "roofz", -1, 0, 0, tip, 1),
  ];
}

function fence(n: number, color: TileColor): Piece[] {
  return Array.from({ length: n }, (_, x) => tile("square", "wallz", x, 0, 0, color));
}

function garage(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, base),
    tile("square", "wallx", -1, 0, 0, wall),
    tile("square", "wallx", 0, 0, 0, wall),
    tile("square", "wallz", 0, 0, -1, wall),
    tile("square", "floor", 0, 1, 0, roof),
  ];
}

function block(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  return [...booth(wall, roof, base, 0), tile("square", "floor", 0, 1, 0, roof)];
}

function boat(hull: TileColor, sail: TileColor, cabin: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, hull),
    tile("square", "floor", 1, 0, 0, hull),
    tile("square", "floor", 2, 0, 0, hull),
    tile("square", "wallz", 0, 0, 0, cabin),
    tile("triangle", "wallx", 1, 0, 0, sail),
    tile("triangle", "wallx", 2, 0, 0, sail),
  ];
}

function steps(tread: TileColor, riser: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, tread),
    tile("square", "floor", 1, 1, 0, tread),
    tile("square", "floor", 2, 2, 0, tread),
    tile("square", "wallz", 1, 0, 0, riser),
    tile("square", "wallz", 2, 0, 0, riser),
    tile("square", "wallz", 2, 1, 0, riser),
  ];
}

function bridge(deck: TileColor, post: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 3; x++) out.push(tile("square", "floor", x, 1, 0, deck));
  out.push(tile("square", "wallx", -1, 0, 0, post), tile("square", "wallx", 2, 0, 0, post));
  out.push(tile("square", "floor", -1, 0, 0, post), tile("square", "floor", 2, 0, 0, post));
  return out;
}

function rocket(body: TileColor, nose: TileColor, pad: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, pad),
    tile("square", "wallz", 0, 0, 0, body),
    tile("square", "wallz", 0, 0, -1, body),
    tile("square", "wallx", 0, 0, 0, body),
    tile("square", "wallx", -1, 0, 0, body),
    tile("triangle", "roofx", 0, 0, 0, nose, -1),
    tile("triangle", "roofx", 0, 0, -1, nose, 1),
  ];
}

function tree(trunk: TileColor, leaf: TileColor, ground: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, ground),
    tile("square", "floor", 1, 0, 0, ground),
    tile("square", "wallz", 0, 0, 0, trunk),
    tile("square", "wallz", 0, 1, 0, trunk),
    tile("triangle", "wallz", -1, 1, 0, leaf),
    tile("triangle", "wallz", 1, 1, 0, leaf),
    tile("triangle", "wallz", 0, 2, 0, leaf),
  ];
}

function castleWall(wall: TileColor, top: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 4; x++) out.push(tile("square", "wallz", x, 0, 0, wall));
  out.push(tile("square", "wallz", 0, 1, 0, wall), tile("square", "wallz", 3, 1, 0, wall));
  out.push(tile("triangle", "roofx", 0, 1, 0, top, -1), tile("triangle", "roofx", 3, 1, 0, top, -1));
  return out;
}

function airplane(body: TileColor, wing: TileColor, tail: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, body),
    tile("square", "floor", 1, 0, 0, body),
    tile("square", "floor", 2, 0, 0, body),
    tile("square", "floor", 1, 0, 1, wing),
    tile("square", "floor", 1, 0, -1, wing),
    tile("triangle", "floor", 3, 0, 0, tail),
    tile("triangle", "wallz", 0, 0, 0, tail),
    tile("triangle", "wallx", 2, 0, 0, tail),
  ];
}

function train(body: TileColor, cabin: TileColor, stack: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 6; x++) out.push(tile("square", "floor", x, 0, 0, body));
  out.push(tile("square", "wallz", 0, 0, 0, cabin, 1, "window"));
  out.push(tile("triangle", "wallx", -1, 0, 0, stack));
  out.push(tile("triangle", "wallx", 5, 0, 0, cabin));
  return out;
}

function parking(wall: TileColor, deck: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let y = 0; y < 3; y++) out.push(tile("square", "floor", 0, y, 0, y === 0 ? base : deck));
  for (let y = 0; y < 2; y++) {
    out.push(tile("square", "wallx", -1, y, 0, wall));
    out.push(tile("square", "wallx", 0, y, 0, wall));
    out.push(tile("square", "wallz", 0, y, -1, wall));
  }
  return out;
}

function fireStation(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 2; x++) {
    out.push(tile("square", "floor", x, 0, 0, base));
    out.push(tile("square", "floor", x, 1, 0, roof));
    out.push(tile("square", "wallz", x, 0, 0, wall, 1, x === 0 ? "door" : "window"));
    out.push(tile("square", "wallz", x, 0, -1, wall, 1, "window"));
  }
  out.push(tile("square", "wallx", -1, 0, 0, wall), tile("square", "wallx", 1, 0, 0, wall));
  return out;
}

function rocketShip(body: TileColor, nose: TileColor, fin: TileColor): Piece[] {
  return [
    tile("square", "floor", 0, 0, 0, nose),
    tile("square", "wallz", 0, 0, 0, body),
    tile("square", "wallz", 0, 0, -1, body),
    tile("square", "wallx", -1, 0, 0, body),
    tile("square", "wallx", 0, 0, 0, body),
    tile("triangle", "roofx", 0, 0, 0, nose, -1),
    tile("triangle", "roofx", 0, 0, -1, nose, 1),
    tile("triangle", "wallz", -1, 0, 0, fin),
    tile("triangle", "wallz", 1, 0, 0, fin),
    tile("triangle", "wallx", 0, 0, 1, fin),
  ];
}

function treehouse(trunk: TileColor, wall: TileColor, roof: TileColor, deck: TileColor): Piece[] {
  const out: Piece[] = [tile("square", "wallz", 0, 0, 0, trunk), tile("square", "wallx", -1, 0, 0, trunk)];
  for (let x = 0; x < 2; x++) {
    for (let z = 0; z < 2; z++) out.push(tile("square", "floor", x, 1, z, deck));
  }
  out.push(tile("square", "wallz", 0, 1, -1, wall), tile("square", "wallz", 1, 1, -1, wall), tile("square", "wallx", -1, 1, 0, wall));
  out.push(tile("triangle", "roofx", 0, 1, 0, roof, -1), tile("triangle", "roofx", 0, 1, -1, roof, 1));
  return out;
}

function stepPyramid(base: TileColor, mid: TileColor, top: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) out.push(tile("square", "floor", x, 0, z, base));
  for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) out.push(tile("square", "floor", x, 1, z, mid));
  out.push(tile("square", "floor", 0, 2, 0, top));
  return out;
}

function longBridge(deck: TileColor, post: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 5; x++) {
    out.push(tile("square", "floor", x, 1, 0, deck));
    out.push(tile("square", "wallz", x, 1, 0, post));
  }
  out.push(tile("square", "wallx", -1, 0, 0, post), tile("square", "wallx", 4, 0, 0, post));
  out.push(tile("square", "floor", -1, 0, 0, deck), tile("square", "floor", 4, 0, 0, deck));
  return out;
}

function spaceship(body: TileColor, nose: TileColor, wing: TileColor): Piece[] {
  const out: Piece[] = [];
  for (const y of [0, 1]) {
    out.push(tile("square", "wallz", 0, y, 0, body), tile("square", "wallz", 0, y, -1, body));
    out.push(tile("square", "wallx", -1, y, 0, body), tile("square", "wallx", 0, y, 0, body));
  }
  out.push(tile("square", "floor", 0, 0, 1, wing), tile("square", "floor", 0, 0, -2, wing));
  out.push(tile("triangle", "roofx", 0, 1, 0, nose, -1), tile("triangle", "roofx", 0, 1, -1, nose, 1));
  out.push(tile("triangle", "wallz", 1, 0, 0, nose));
  return out;
}

function school(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 2; x++) {
    out.push(tile("square", "floor", x, 0, 0, base), tile("square", "floor", x, 2, 0, roof));
    for (let s = 0; s < 2; s++) {
      out.push(tile("square", "wallz", x, s, 0, wall, 1, "window"));
      out.push(tile("square", "wallz", x, s, -1, wall, 1, s === 0 && x === 0 ? "door" : "window"));
    }
  }
  for (let s = 0; s < 2; s++) {
    out.push(tile("square", "wallx", -1, s, 0, wall, 1, "window"), tile("square", "wallx", 1, s, 0, wall, 1, "window"));
  }
  return out;
}

function church(wall: TileColor, roof: TileColor, base: TileColor, steeple: TileColor): Piece[] {
  return [
    ...house(2, 1, wall, roof, base),
    tile("square", "floor", 3, 0, 0, base),
    tile("square", "wallz", 3, 0, 0, steeple, 1, "window"),
    tile("square", "wallz", 3, 0, -1, steeple),
    tile("square", "wallx", 3, 0, 0, steeple),
    tile("square", "wallx", 2, 0, 0, steeple),
    tile("triangle", "roofx", 3, 0, 0, roof, -1),
    tile("triangle", "roofx", 3, 0, -1, roof, 1),
  ];
}

function gatehouse(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const left = tower(1, wall, roof, base);
  const right = left.map((piece) => ({ ...piece, x: piece.x + 2 }));
  return [
    ...left,
    ...right,
    tile("square", "floor", 1, 0, 0, base),
    tile("square", "floor", 1, 1, 0, roof),
  ];
}

function greatPyramid(base: TileColor, mid: TileColor, top: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) out.push(tile("square", "floor", x, 0, z, base));
  for (let x = 1; x < 3; x++) for (let z = 1; z < 3; z++) out.push(tile("square", "floor", x, 1, z, mid));
  out.push(tile("square", "floor", 1, 2, 1, top));
  return out;
}

function airport(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 6; x++) {
    out.push(tile("square", "floor", x, 0, 0, base));
    out.push(tile("square", "wallz", x, 0, -1, wall, 1, "window"));
    out.push(tile("square", "floor", x, 1, 0, roof));
  }
  out.push(
    tile("square", "floor", 6, 0, 0, base),
    tile("square", "wallz", 6, 0, 0, wall, 1, "window"),
    tile("square", "wallz", 6, 0, -1, wall),
    tile("square", "wallx", 6, 0, 0, wall),
    tile("square", "wallx", 5, 0, 0, wall),
    tile("triangle", "roofx", 6, 0, 0, roof, -1),
  );
  return out;
}

function palace(wall: TileColor, roof: TileColor, base: TileColor): Piece[] {
  const out: Piece[] = [];
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 2; z++) {
      out.push(tile("square", "floor", x, 0, z, base));
      out.push(tile("square", "floor", x, 2, z, roof));
    }
  }
  for (let s = 0; s < 2; s++) {
    for (let x = 0; x < 3; x++) {
      out.push(tile("square", "wallz", x, s, -1, wall, 1, s === 0 && x === 1 ? "door" : "window"));
      out.push(tile("square", "wallz", x, s, 1, wall, 1, "window"));
    }
    for (let z = 0; z < 2; z++) {
      out.push(tile("square", "wallx", -1, s, z, wall, 1, "window"));
      out.push(tile("square", "wallx", 2, s, z, wall));
    }
  }
  return out;
}

function collect(): { name: string; pieces: Piece[] }[] {
  const found: { name: string; pieces: Piece[] }[] = [];
  const push = (name: string, pieces: Piece[]) => found.push({ name, pieces });
  for (let i = 0; i < 4; i++) {
    const wall = COLORS[i % COLORS.length]!;
    const roof = COLORS[(i + 2) % COLORS.length]!;
    const base = COLORS[(i + 4) % COLORS.length]!;
    const accent = COLORS[(i + 1) % COLORS.length]!;
    push("Pyramid", pyramid(base, roof));
    push("Little Tent", tent(1, wall, roof));
    push("Fence", fence(5, wall));
    push("Garage", garage(wall, roof, base));
    push("Toy Block", block(wall, roof, base));
    push("Sailboat", boat(base, roof, wall));
    push("Steps", steps(base, wall));
    push("Bridge", bridge(base, wall));
    push("Rocket", rocket(wall, roof, accent));
    push("Tree", tree(wall, roof, base));
    push("Camp Tent", tent(2, wall, roof));
    push("Castle Wall", castleWall(wall, roof));
    push("Airplane", airplane(base, accent, wall));
    push("Train", train(base, wall, accent));
    push("Parking Garage", parking(wall, roof, base));
    push("Lookout", tower(1, wall, roof, base));
    push("Fire Station", fireStation(wall, roof, base));
    push("Rocket Ship", rocketShip(wall, roof, accent));
    push("Treehouse", treehouse(wall, accent, roof, base));
    push("Party Tent", tent(3, wall, roof));
    push("Sunny Cottage", house(2, 1, wall, roof, base));
    push("Garden Yard", yard(wall, base));
    push("Tall Lookout", tower(2, wall, roof, base));
    push("Spaceship", spaceship(wall, roof, accent));
    push("Long Tent", tent(4, wall, roof));
    push("Step Pyramid", stepPyramid(base, accent, roof));
    push("Long Bridge", longBridge(base, wall));
    push("Little Fort", keep(1, wall, roof, base));
    push("School", school(wall, roof, base));
    push("Barn", house(3, 1, wall, roof, base));
    push("Castle Gate", gatehouse(wall, roof, base));
    push("Tall House", house(2, 2, wall, roof, base));
    push("Church", church(wall, roof, base, accent));
    push("Village Hall", hall(3, 2, wall, roof, base));
    push("Great Pyramid", greatPyramid(base, accent, roof));
    push("Stone Keep", keep(2, wall, roof, base));
    push("Airport", airport(wall, roof, base));
    push("Great Hall", hall(4, 2, wall, roof, base));
    push("Palace", palace(wall, roof, base));
    push("High Castle", keep(3, wall, roof, base));
    push("Grand Hall", hall(5, 2, wall, roof, base));
    push("Royal Keep", keep(4, wall, roof, base));
  }
  return found;
}

function takeClimbing(list: { name: string; pieces: Piece[] }[], count: number) {
  const sorted = [...list].sort((a, b) => a.pieces.length - b.pieces.length);
  const groups = new Map<number, { name: string; pieces: Piece[] }[]>();
  for (const item of sorted) {
    const pile = groups.get(item.pieces.length) ?? [];
    pile.push(item);
    groups.set(item.pieces.length, pile);
  }
  const sizes = [...groups.keys()].sort((a, b) => a - b);
  const base = Math.floor(count / Math.max(1, sizes.length));
  let extra = count - base * sizes.length;
  const want = new Map<number, number>();
  for (let i = sizes.length - 1; i >= 0; i--) {
    const add = extra > 0 ? 1 : 0;
    if (add) extra -= 1;
    want.set(sizes[i]!, base + add);
  }
  const out: { name: string; pieces: Piece[] }[] = [];
  const used = new Set<(typeof sorted)[number]>();
  for (const size of sizes) {
    const pile = groups.get(size)!;
    for (const item of pile.slice(0, Math.min(want.get(size)!, pile.length))) {
      out.push(item);
      used.add(item);
    }
  }
  if (out.length < count) {
    for (let i = sizes.length - 1; i >= 0 && out.length < count; i--) {
      for (const item of groups.get(sizes[i]!)!) {
        if (out.length >= count) break;
        if (used.has(item)) continue;
        out.push(item);
        used.add(item);
      }
    }
  }
  return out.sort((a, b) => a.pieces.length - b.pieces.length).slice(0, count);
}

function assemble(): Puzzle[] {
  const used = new Set<string>();
  const pool = collect().filter((item) => {
    const sig = item.pieces
      .map((p) => `${p.shape}${p.plane}${p.x}${p.y}${p.z}${p.lean}${p.cutout}${p.color}`)
      .join(",");
    if (used.has(sig)) return false;
    used.add(sig);
    return true;
  });
  const bands: { min: number; max: number; count: number; difficulty: Difficulty }[] = [
    { min: 5, max: 7, count: 20, difficulty: "easy" },
    { min: 8, max: 12, count: 30, difficulty: "moderate" },
    { min: 13, max: 20, count: 30, difficulty: "advanced" },
    { min: 21, max: 80, count: 20, difficulty: "expert" },
  ];
  const groups = bands.map((band) => ({
    difficulty: band.difficulty,
    list: takeClimbing(
      pool.filter((item) => item.pieces.length >= band.min && item.pieces.length <= band.max),
      band.count,
    ),
  }));
  if (groups.some((g, i) => g.list.length !== [20, 30, 30, 20][i])) {
    throw new Error(`SnapTile puzzle buckets were ${groups.map((g) => g.list.length).join(",")}, expected 20,30,30,20`);
  }
  let id = 1;
  const puzzles: Puzzle[] = [];
  const seen = new Map<string, number>();
  for (const group of groups) {
    for (const item of group.list) {
      const n = (seen.get(item.name) ?? 0) + 1;
      seen.set(item.name, n);
      puzzles.push({
        id,
        name: n === 1 ? item.name : `${item.name} ${n}`,
        difficulty: group.difficulty,
        pieces: item.pieces,
      });
      id += 1;
    }
  }
  return puzzles;
}

export const PUZZLES: Puzzle[] = assemble();

/** Share of the build drawn as spots. Puzzle 1–20 show everything. Later puzzles fade to 10%, so the last ones hide about 90% of the spots. */
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
