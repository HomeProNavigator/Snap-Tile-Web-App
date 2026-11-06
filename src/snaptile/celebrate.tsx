import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowBigRight, Home } from "lucide-react";
import { playNotes } from "./audio";
import { MascotFace } from "./mascot";
import { PUZZLES } from "./puzzles";
import { StickerArt } from "./stickers";
import { useSnap } from "./store";

const TileCanvas = lazy(() => import("./TileCanvas").then((mod) => ({ default: mod.TileCanvas })));

const DANCES = ["hop", "spin", "wiggle", "bounce"] as const;
const SHAPES = ["dot", "star", "square", "tri"] as const;
const NOTES = [
  [523, 587, 659, 784, 880],
  [392, 494, 587, 698, 784],
  [440, 554, 659, 784, 988],
  [349, 440, 523, 659, 784],
];
let previousVariant = -1;

function speak(line: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(line);
  utterance.rate = 0.95;
  utterance.pitch = 1.15;
  utterance.volume = 0.85;
  window.speechSynthesis.speak(utterance);
}

export function Celebrate() {
  const go = useSnap((s) => s.go);
  const name = useSnap((s) => s.name);
  const sound = useSnap((s) => s.sound);
  const mascot = useSnap((s) => s.mascot);
  const puzzleId = useSnap((s) => s.puzzleId);
  const placed = useSnap((s) => s.placed);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const puzzle = PUZZLES.find((item) => item.id === puzzleId);
  const next = puzzle && puzzle.id < 100 ? PUZZLES.find((item) => item.id === puzzle.id + 1) : null;
  const pieces = puzzle ? puzzle.pieces : placed;
  const [variant] = useState(() => {
    let pick = Math.floor(Math.random() * 4);
    if (pick === previousVariant) pick = (pick + 1) % 4;
    previousVariant = pick;
    return pick;
  });
  const [yaw, setYaw] = useState(0.4);
  const [glow, setGlow] = useState(0);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const skipped = useRef(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!puzzle) return;
    const line = name.trim() ? `Great job, ${name.trim()}!` : `You built a ${puzzle.name}!`;
    if (sound) speak(line);
    return () => window.speechSynthesis?.cancel();
  }, [name, puzzle, sound]);
  useEffect(() => {
    const notes = NOTES[variant] ?? NOTES[0]!;
    let tick = 0;
    const flashing = window.setInterval(() => {
      if (skipped.current) return;
      if (puzzle) playNotes([notes[tick % notes.length]!]);
      setGlow(tick);
      tick += 1;
    }, 150);
    const spinning = window.setInterval(() => {
      if (!skipped.current) setYaw((value) => value + (puzzle ? 0.18 : 0.28));
    }, 40);
    const stopSpin = window.setTimeout(() => window.clearInterval(spinning), puzzle ? 2200 : 1200);
    const stopFlash = window.setTimeout(() => window.clearInterval(flashing), puzzle ? 1600 : 700);
    const showButtons = window.setTimeout(() => setReady(true), puzzle ? 1500 : 900);
    return () => {
      window.clearInterval(flashing);
      window.clearInterval(spinning);
      window.clearTimeout(stopSpin);
      window.clearTimeout(stopFlash);
      window.clearTimeout(showButtons);
    };
  }, [puzzle, variant]);
  const skip = () => {
    if (ready) return;
    skipped.current = true;
    setReady(true);
    window.speechSynthesis?.cancel();
  };
  const dance = DANCES[variant] ?? "hop";
  const shape = SHAPES[variant] ?? "dot";
  return (
    <section className="snap-celebrate" onClick={skip}>
      <div className="snap-celebrate-stage">
        {mounted ? (
          <Suspense fallback={null}>
            <TileCanvas yaw={yaw} pitch={0.5} preview={pieces} glow={glow} />
          </Suspense>
        ) : null}
      </div>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} className={`snap-confetti is-${shape}`} style={{ left: `${(i * 19) % 100}%`, animationDelay: `${(i % 5) * 0.08}s`, background: ["#ff5a7a", "#ffd15a", "#5ad1ff", "#7d5cff", "#3ddc97", "#ff8a3d"][i % 6] }} />
      ))}
      <div className={`snap-cheer is-${dance}`}>
        <MascotFace id={mascot} />
      </div>
      {puzzle ? (
        <div className="snap-move">
          <div className="snap-space is-done" data-sticker-land={puzzle.id}>
            <StickerArt puzzleId={puzzle.id} />
          </div>
          {next ? (
            <div className="snap-space is-now">
              <em>{next.id}</em>
              <span className="snap-token is-advance" data-token={next.id}>
                <MascotFace id={mascot} />
              </span>
            </div>
          ) : (
            <div className="snap-space is-now">
              <span className="snap-token is-advance" data-token="finish">
                <MascotFace id={mascot} />
              </span>
            </div>
          )}
        </div>
      ) : null}
      {ready ? (
        <div className="snap-celebrate-actions">
          {puzzle && next ? (
            <button className="snap-next" aria-label="Next puzzle" onClick={(event) => { event.stopPropagation(); startPuzzle(next.id); }}>
              <ArrowBigRight />
            </button>
          ) : null}
          <button className="snap-home-back" aria-label="Home" onClick={(event) => { event.stopPropagation(); go("home"); }}>
            <Home />
          </button>
        </div>
      ) : null}
    </section>
  );
}