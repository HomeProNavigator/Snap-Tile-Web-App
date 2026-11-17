import assert from "node:assert/strict";
import test from "node:test";
import { choosePlacement } from "./place-target.ts";
import type { Piece, TileKind } from "./tiles.ts";

function piece(partial: Pick<Piece, "plane" | "x" | "y" | "z"> & Partial<Piece>): Piece {
  return {
    shape: "square",
    cutout: "none",
    rot: 0,
    lean: 1,
    color: "sky",
    ...partial,
  };
}

const blue: TileKind = { shape: "square", color: "sky", cutout: "none" };
const gold: TileKind = { shape: "square", color: "gold", cutout: "none" };
const blush: TileKind = { shape: "square", color: "blush", cutout: "none" };
const door: TileKind = { shape: "square", color: "blush", cutout: "door" };
const coral: TileKind = { shape: "square", color: "coral", cutout: "none" };

test("a roof in front does not block the floor tile behind it", () => {
  const floor = piece({ plane: "floor", x: 0, y: 0, z: 0, color: "sky" });
  const roof = piece({ plane: "floor", x: 1, y: 1, z: 1, color: "gold" });
  assert.equal(choosePlacement([roof, floor], blue, [], roof), floor);
});

test("the roof still places when that is the held tile", () => {
  const floor = piece({ plane: "floor", x: 0, y: 0, z: 0, color: "sky" });
  const roof = piece({ plane: "floor", x: 0, y: 1, z: 0, color: "gold" });
  assert.equal(choosePlacement([roof, floor], gold, [], roof), roof);
});

test("a tile that is not under the pointer is rejected", () => {
  const front = piece({ plane: "wallz", x: 0, y: 0, z: -1, color: "blush" });
  assert.equal(choosePlacement([front], blue, [], front), front);
  assert.equal(choosePlacement([front], coral, [], front), front);
});

test("the aimed face wins when it is the held tile", () => {
  const wall = piece({ plane: "wallx", x: 0, y: 0, z: 0, color: "blush" });
  const floor = piece({ plane: "floor", x: 0, y: 0, z: 0, color: "sky" });
  assert.equal(choosePlacement([wall, floor], blush, [], wall), wall);
});

test("a door behind a roof can be placed while it is held", () => {
  const roof = piece({ plane: "floor", x: 0, y: 1, z: 0, color: "gold" });
  const south = piece({ plane: "wallz", x: 0, y: 0, z: -1, color: "blush", cutout: "door" });
  assert.equal(choosePlacement([roof, south], door, [], roof), south);
  assert.equal(choosePlacement([roof], door, [], roof), roof);
});

test("an already built roof still lets the open floor through", () => {
  const floor = piece({ plane: "floor", x: 0, y: 0, z: 0, color: "sky" });
  const roof = piece({ plane: "floor", x: 1, y: 1, z: 1, color: "gold" });
  assert.equal(choosePlacement([roof, floor], blue, [roof], roof), floor);
});
