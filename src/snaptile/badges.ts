import { TILE_COLORS, pieceLimit, topY, type Piece, type Tier } from "./tiles";
import { TEST_UNLOCK } from "./test-mode";

export type Badge = {
  id: string;
  name: string;
  animal: string;
  detail: string;
  basic: boolean;
};

export const BADGES: Badge[] = [
  { id: "bunny", name: "Speedy Bunny", animal: "Bunny", detail: "Finish puzzles 1–5", basic: true },
  { id: "turtle", name: "Steady Turtle", animal: "Turtle", detail: "Finish 3 puzzles in a row without extra help", basic: true },
  { id: "giraffe", name: "Tall Giraffe", animal: "Giraffe", detail: "Build something 6 tiles tall", basic: false },
  { id: "zebra", name: "Graceful Zebra", animal: "Zebra", detail: "Finish puzzles 6–10", basic: true },
  { id: "kitten", name: "First Paws", animal: "Kitten", detail: "Finish puzzles 11–15", basic: false },
  { id: "puppy", name: "Clever Pup", animal: "Puppy", detail: "Finish puzzles 16–20", basic: false },
  { id: "monkey", name: "Creative Monkey", animal: "Monkey", detail: "Finish 5 Free Builds", basic: false },
  { id: "cat", name: "Color Cat", animal: "Cat", detail: "Use every piece your plan allows in one Free Build", basic: false },
  { id: "owl", name: "Wise Owl", animal: "Owl", detail: "Finish puzzles 21–25", basic: false },
  { id: "fox", name: "Curious Fox", animal: "Fox", detail: "Finish puzzles 26–30", basic: false },
  { id: "wolf", name: "Wild Wolf", animal: "Wolf", detail: "Use every color in one build", basic: false },
  { id: "elephant", name: "Mighty Elephant", animal: "Elephant", detail: "Finish puzzles 31–40", basic: false },
  { id: "bear", name: "Strong Bear", animal: "Bear", detail: "Finish puzzles 41–50", basic: false },
  { id: "tiger", name: "Royal Tiger", animal: "Tiger", detail: "Finish puzzles 51–60", basic: false },
  { id: "dragon", name: "Legendary Dragon", animal: "Dragon", detail: "Finish puzzles 61–75", basic: false },
  { id: "lion", name: "Brave Lion", animal: "Lion", detail: "Finish all 100 puzzles", basic: false },
];

const RANGES: Record<string, [number, number]> = {
  bunny: [1, 5],
  zebra: [6, 10],
  kitten: [11, 15],
  puppy: [16, 20],
  owl: [21, 25],
  fox: [26, 30],
  elephant: [31, 40],
  bear: [41, 50],
  tiger: [51, 60],
  dragon: [61, 75],
  lion: [1, 100],
};

export function badgeJustFinished(puzzleId: number): Badge | undefined {
  return BADGES.find((badge) => RANGES[badge.id]?.[1] === puzzleId);
}

const PATH = ["bunny", "zebra", "kitten", "puppy", "owl", "fox", "elephant", "bear", "tiger", "dragon"] as const;

/** Progress toward the next trail buddy. Hidden on the puzzle that earns one, and after the dragon. */
export function nextBuddy(puzzleId: number): { id: string; from: number; to: number; left: number } | null {
  for (const id of PATH) {
    const range = RANGES[id];
    if (!range) continue;
    const [from, to] = range;
    if (puzzleId < from || puzzleId > to || puzzleId === to) continue;
    return { id, from, to, left: to - puzzleId };
  }
  return null;
}

export function earnedPuzzleBadges(completed: number[]): string[] {
  const have = new Set(completed);
  const ids: string[] = [];
  for (const [id, [from, to]] of Object.entries(RANGES)) {
    let ok = true;
    for (let n = from; n <= to; n++) if (!have.has(n)) ok = false;
    if (ok) ids.push(id);
  }
  return ids;
}

export function buildBadges(pieces: Piece[], tier: Tier): string[] {
  const ids: string[] = [];
  const colors = new Set(pieces.map((p) => p.color));
  if (colors.size >= TILE_COLORS.length && pieces.length > 0) ids.push("wolf");
  if (pieces.length > 0) {
    const height = Math.max(...pieces.map((p) => topY(p))) - Math.min(...pieces.map((p) => topY(p)));
    if (height >= 6) ids.push("giraffe");
  }
  const need = tier === "master" || tier === "yearly" ? 24 : pieceLimit(tier);
  if (pieces.length >= need) ids.push("cat");
  return ids;
}

export function badgeVisible(badge: Badge, tier: Tier): boolean {
  if (TEST_UNLOCK || badge.basic) return true;
  return tier !== "free";
}
