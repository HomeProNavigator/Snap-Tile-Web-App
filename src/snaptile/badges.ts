import { TILE_COLORS, pieceLimit, topY, type Piece, type Tier } from "./tiles";

export type Badge = {
  id: string;
  name: string;
  animal: string;
  detail: string;
  basic: boolean;
};

export const BADGES: Badge[] = [
  { id: "kitten", name: "First Paws", animal: "Kitten", detail: "Finish puzzles 1–5", basic: true },
  { id: "puppy", name: "Clever Pup", animal: "Puppy", detail: "Finish puzzles 6–10", basic: true },
  { id: "bunny", name: "Speedy Bunny", animal: "Bunny", detail: "Finish puzzles 11–15", basic: false },
  { id: "fox", name: "Curious Fox", animal: "Fox", detail: "Finish puzzles 16–20", basic: false },
  { id: "bear", name: "Strong Bear", animal: "Bear", detail: "Finish puzzles 21–25", basic: false },
  { id: "owl", name: "Wise Owl", animal: "Owl", detail: "Finish puzzles 26–30", basic: false },
  { id: "lion", name: "Brave Lion", animal: "Lion", detail: "Finish puzzles 31–40", basic: false },
  { id: "elephant", name: "Mighty Elephant", animal: "Elephant", detail: "Finish puzzles 41–50", basic: false },
  { id: "zebra", name: "Graceful Zebra", animal: "Zebra", detail: "Finish puzzles 51–60", basic: false },
  { id: "tiger", name: "Royal Tiger", animal: "Tiger", detail: "Finish puzzles 61–75", basic: false },
  { id: "dragon", name: "Legendary Dragon", animal: "Dragon", detail: "Finish all 100 puzzles", basic: false },
  { id: "cat", name: "Color Cat", animal: "Cat", detail: "Use every piece your plan allows in one Free Build", basic: false },
  { id: "giraffe", name: "Tall Giraffe", animal: "Giraffe", detail: "Build something 6 tiles tall", basic: false },
  { id: "monkey", name: "Creative Monkey", animal: "Monkey", detail: "Finish 5 Free Builds", basic: false },
  { id: "turtle", name: "Steady Turtle", animal: "Turtle", detail: "Finish 3 puzzles in a row without extra help", basic: false },
  { id: "unicorn", name: "Rainbow Unicorn", animal: "Unicorn", detail: "Use every color in one build", basic: false },
];

const RANGES: Record<string, [number, number]> = {
  kitten: [1, 5],
  puppy: [6, 10],
  bunny: [11, 15],
  fox: [16, 20],
  bear: [21, 25],
  owl: [26, 30],
  lion: [31, 40],
  elephant: [41, 50],
  zebra: [51, 60],
  tiger: [61, 75],
  dragon: [1, 100],
};

export function badgeJustFinished(puzzleId: number): Badge | undefined {
  return BADGES.find((badge) => RANGES[badge.id]?.[1] === puzzleId);
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
  if (colors.size >= TILE_COLORS.length && pieces.length > 0) ids.push("unicorn");
  if (pieces.length > 0) {
    const height = Math.max(...pieces.map((p) => topY(p))) - Math.min(...pieces.map((p) => topY(p)));
    if (height >= 6) ids.push("giraffe");
  }
  const need = tier === "master" || tier === "yearly" ? 24 : pieceLimit(tier);
  if (pieces.length >= need) ids.push("cat");
  return ids;
}

export function badgeVisible(badge: Badge, tier: Tier): boolean {
  if (badge.basic) return true;
  return tier !== "free";
}
