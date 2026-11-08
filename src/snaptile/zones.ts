/** Trail zones, earliest panel first. Kept in step with the panels in map.tsx. */
const ZONES: { id: string; src: string; from: number; to: number; tone: string; family: string }[] = [
  { id: "meadow", src: "zone-meadow.webp", from: 1, to: 10, tone: "#2fce78", family: "meadow" },
  { id: "village", src: "zone-village.webp", from: 11, to: 20, tone: "#ff5c45", family: "village" },
  { id: "woods", src: "zone-woods.webp", from: 21, to: 30, tone: "#2fce78", family: "woods" },
  { id: "savanna", src: "zone-savanna.webp", from: 31, to: 40, tone: "#ffb20a", family: "savanna" },
  { id: "peaks", src: "zone-peaks.webp", from: 41, to: 50, tone: "#3aa0ff", family: "peaks" },
  { id: "jungle", src: "zone-jungle.webp", from: 51, to: 60, tone: "#1fa86a", family: "jungle" },
  { id: "dragon1", src: "zone-dragon-1.webp", from: 61, to: 68, tone: "#a86bff", family: "dragon" },
  { id: "dragon2", src: "zone-dragon-2.webp", from: 69, to: 75, tone: "#a86bff", family: "dragon" },
  { id: "sky1", src: "zone-sky-1.webp", from: 76, to: 84, tone: "#3aa0ff", family: "sky" },
  { id: "sky2", src: "zone-sky-2.webp", from: 85, to: 92, tone: "#ff62b3", family: "sky" },
  { id: "sky3", src: "zone-sky-3.webp", from: 93, to: 100, tone: "#ff62b3", family: "sky" },
];

export function zoneFor(puzzleId: number): { src: string; tone: string; id: string } {
  const panel = ZONES.find((item) => puzzleId >= item.from && puzzleId <= item.to) ?? ZONES[0]!;
  const first = ZONES.find((item) => item.family === panel.family) ?? panel;
  return { src: `${import.meta.env.BASE_URL}map/${first.src}`, tone: first.tone, id: first.id };
}
