import { TEST_UNLOCK } from "./test-mode";

export type Shape = "square" | "triangle" | "right";
export type Cutout = "none" | "window" | "door";
export type TileColor = "coral" | "gold" | "mint" | "sky" | "lilac" | "blush";
export type Tier = "free" | "builder" | "master" | "yearly";
export type Difficulty = "easy" | "moderate" | "advanced" | "expert";
export type Plane = "floor" | "wallx" | "wallz" | "roofx" | "roofz";

export type Piece = {
  shape: Shape;
  cutout: Cutout;
  rot: 0 | 1 | 2 | 3;
  x: number;
  y: number;
  z: number;
  plane: Plane;
  lean: -1 | 1;
  color: TileColor;
};

export const TILE_COLORS: { id: TileColor; label: string; hex: string }[] = [
  { id: "coral", label: "Coral", hex: "#ff5c45" },
  { id: "gold", label: "Gold", hex: "#ffb20a" },
  { id: "mint", label: "Mint", hex: "#2fce78" },
  { id: "sky", label: "Sky", hex: "#3aa0ff" },
  { id: "lilac", label: "Lilac", hex: "#a86bff" },
  { id: "blush", label: "Blush", hex: "#ff62b3" },
];

export const TILE_HEX: Record<TileColor, string> = Object.fromEntries(
  TILE_COLORS.map((c) => [c.id, c.hex]),
) as Record<TileColor, string>;

export type TileKind = { shape: Shape; color: TileColor; cutout: Cutout };

export function sameKind(a: TileKind, b: TileKind): boolean {
  return a.shape === b.shape && a.color === b.color && a.cutout === b.cutout;
}

export function kindKey(kind: TileKind): string {
  return `${kind.shape}|${kind.cutout}|${kind.color}`;
}
export const PITCH = Math.PI / 3;

export function pieceLimit(tier: Tier): number {
  if (TEST_UNLOCK) return 100;
  if (tier === "free") return 10;
  if (tier === "builder") return 50;
  return 80;
}

export function pieceLimitLabel(tier: Tier): string {
  if (TEST_UNLOCK) return "100";
  if (tier === "free") return "10";
  if (tier === "builder") return "50";
  return "Unlimited";
}

export function puzzleCap(tier: Tier): number {
  if (TEST_UNLOCK) return 100;
  if (tier === "free") return 10;
  if (tier === "builder") return 50;
  return 100;
}

export function tierName(tier: Tier): string {
  if (tier === "free") return "Free";
  if (tier === "builder") return "Builder";
  if (tier === "master") return "Master Builder";
  return "Unlimited Yearly";
}

export function normalizePiece(raw: Partial<Piece> & Pick<Piece, "shape" | "color" | "x" | "z">): Piece {
  return {
    shape: raw.shape,
    cutout: raw.cutout ?? "none",
    rot: raw.rot ?? 0,
    x: raw.x,
    y: raw.y ?? 0,
    z: raw.z,
    plane: raw.plane ?? "floor",
    lean: raw.lean ?? 1,
    color: raw.color,
  };
}

export function samePiece(a: Piece, b: Piece): boolean {
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

export function occupancyKey(p: Piece): string {
  return `${p.plane}|${p.x}|${p.y}|${p.z}|${p.lean}`;
}

export function pieceKey(p: Piece): string {
  return `${p.shape}|${p.cutout}|${p.rot}|${occupancyKey(p)}|${p.color}`;
}

export function topY(p: Piece): number {
  if (p.plane === "floor") return p.y;
  if (p.plane === "wallx" || p.plane === "wallz") return p.y + 1;
  return p.y + 1 + Math.sin(PITCH);
}
