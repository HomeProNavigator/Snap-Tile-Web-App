import { PUZZLES } from "../src/snaptile/puzzles.ts";
import { roofHingeY } from "../src/snaptile/space.ts";
import { occupancyKey, type Piece } from "../src/snaptile/tiles.ts";

const problems: string[] = [];
const fail = (id: number, name: string, message: string) => problems.push(`${id} ${name}: ${message}`);

if (PUZZLES.length !== 100) problems.push(`count ${PUZZLES.length}`);
const bands = { easy: 0, moderate: 0, advanced: 0, expert: 0 };
const names = new Set<string>();

for (const puzzle of PUZZLES) {
  bands[puzzle.difficulty] += 1;
  if (names.has(puzzle.name)) fail(puzzle.id, puzzle.name, "duplicate name");
  names.add(puzzle.name);
  if (puzzle.pieces.length > 80) fail(puzzle.id, puzzle.name, `${puzzle.pieces.length} tiles is over 80`);
  if (puzzle.pieces.length < 5) fail(puzzle.id, puzzle.name, `${puzzle.pieces.length} tiles is under 5`);
  if (puzzle.pieces.some((piece) => piece.shape === "right")) fail(puzzle.id, puzzle.name, "uses a half-square");

  const seen = new Set<string>();
  for (const piece of puzzle.pieces) {
    const key = occupancyKey(piece);
    if (seen.has(key)) fail(puzzle.id, puzzle.name, `overlap ${key}`);
    seen.add(key);
  }

  const floors = puzzle.pieces.filter((piece) => piece.plane === "floor" && piece.y === 0 && piece.shape === "square");
  if (floors.length === 0) fail(puzzle.id, puzzle.name, "no ground");
  const cells = new Map(floors.map((piece) => [`${piece.x},${piece.z}`, piece]));
  if (cells.size !== floors.length) fail(puzzle.id, puzzle.name, "two grounds on one cell");

  for (const piece of puzzle.pieces) {
    if (piece.cutout === "none") continue;
    if (piece.shape !== "square" || (piece.plane !== "wallx" && piece.plane !== "wallz")) {
      fail(puzzle.id, puzzle.name, "opening is not on a wall");
    }
  }

  for (const wheel of puzzle.pieces.filter((piece) => piece.shape === "wheel")) {
    const host = puzzle.pieces.some(
      (piece) => piece.shape === "square" && piece.plane === wheel.plane && piece.x === wheel.x && piece.y === wheel.y && piece.z === wheel.z,
    );
    if (!host) fail(puzzle.id, puzzle.name, "wheel is not on a wall");
  }

  const roofs = puzzle.pieces.filter((piece) => piece.plane === "roofx" || piece.plane === "roofz");
  const groups = new Map<string, Piece[]>();
  for (const roof of roofs) {
    const key = `${roof.y}`;
    groups.set(key, [...(groups.get(key) ?? []), roof]);
  }
  for (const [y, group] of groups) {
    if (group.length % 4 !== 0) fail(puzzle.id, puzzle.name, `roof set at y=${y} has ${group.length} triangles`);
    const hinges = new Set(group.map((piece) => roofHingeY(piece, puzzle.pieces).toFixed(3)));
    if (hinges.size > 1) fail(puzzle.id, puzzle.name, `roof hinges disagree at y=${y}: ${[...hinges].join(", ")}`);
  }

  for (const floor of floors) {
    const lid = puzzle.pieces.some((piece) => piece.plane === "floor" && piece.x === floor.x && piece.z === floor.z && piece.y > 0);
    const cap = puzzle.pieces.some((piece) => (piece.plane === "roofx" || piece.plane === "roofz") && piece.x === floor.x && (piece.z === floor.z || piece.z === floor.z - 1));
    if (!lid && !cap) fail(puzzle.id, puzzle.name, `cell ${floor.x},${floor.z} has no lid or cap`);
  }
}

const arches = ["Gatehouse", "Covered Bridge", "Castle Gate", "Tunnel", "Cathedral", "Tower Bridge", "Four-Tower Castle", "King's Castle"];
const wheeled = ["Car", "Bus", "Truck", "Train Car", "Engine", "Camper", "Two-Car Train", "Train Station", "Fire Yard"];
for (const name of arches) {
  const puzzle = PUZZLES.find((item) => item.name === name);
  if (!puzzle?.pieces.some((piece) => piece.cutout === "arch")) problems.push(`${name} is missing its arch`);
}
for (const name of wheeled) {
  const puzzle = PUZZLES.find((item) => item.name === name);
  const wheels = puzzle?.pieces.filter((piece) => piece.shape === "wheel").length ?? 0;
  if (wheels < 4) problems.push(`${name} has ${wheels} wheels`);
}
if (bands.easy !== 20 || bands.moderate !== 30 || bands.advanced !== 30 || bands.expert !== 20) {
  problems.push(`bands ${JSON.stringify(bands)}`);
}

const lines = PUZZLES.map((puzzle) => `${String(puzzle.id).padStart(3)} ${puzzle.difficulty.padEnd(9)} ${String(puzzle.pieces.length).padStart(3)}  ${puzzle.name}`);
console.log(lines.join("\n"));
console.log(`\n${problems.length} problems`);
for (const problem of problems) console.log(problem);
if (problems.length) process.exit(1);
