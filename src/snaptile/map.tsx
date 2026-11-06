import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { badgeJustFinished } from "./badges";
import { MascotFace } from "./mascot";
import { PUZZLES } from "./puzzles";
import { StickerArt } from "./stickers";
import { useSnap } from "./store";
import { puzzleCap } from "./tiles";

export function ProgressMap() {
  const completed = useSnap((s) => s.completed);
  const tier = useSnap((s) => s.tier);
  const mascot = useSnap((s) => s.mascot);
  const badges = useSnap((s) => s.badges);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const cap = puzzleCap(tier);
  const next = PUZZLES.find((puzzle) => !completed.includes(puzzle.id) && puzzle.id <= cap && (puzzle.id === 1 || completed.includes(puzzle.id - 1)));
  const token = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = token.current;
    const map = scroller.current;
    if (!node || !map) return;
    const top = node.getBoundingClientRect().top - map.getBoundingClientRect().top + map.scrollTop;
    map.scrollTop = Math.max(0, top - map.clientHeight / 2 + node.clientHeight / 2);
  }, [next?.id, mascot]);
  return (
    <div className="snap-map" aria-label="Puzzle path" ref={scroller}>
      <div className="snap-path-start">
        <span>Start</span>
        <svg viewBox="0 0 72 48" aria-hidden="true">
          <rect x="6" y="22" width="60" height="22" rx="3" fill="#c4844a" />
          <polygon points="4,24 36,6 68,24" fill="#ff5c45" />
          <rect x="30" y="28" width="12" height="16" fill="#6b3a22" />
          <rect x="14" y="28" width="10" height="8" fill="#fff4d2" />
        </svg>
      </div>
      <div className="snap-path">
        {PUZZLES.map((puzzle) => {
          const cols = 5;
          const band = Math.floor((puzzle.id - 1) / cols);
          const col = (puzzle.id - 1) % cols;
          const gridColumn = (band % 2 === 0 ? col : cols - 1 - col) + 1;
          const row = band + 1 + (puzzle.id > cap ? 1 : 0);
          const done = completed.includes(puzzle.id);
          const gated = puzzle.id > cap;
          const badge = badgeJustFinished(puzzle.id);
          const current = next?.id === puzzle.id;
          return (
            <button
              key={puzzle.id}
              type="button"
              className={done ? "snap-space is-done" : gated ? "snap-space is-gated" : current ? "snap-space is-now" : "snap-space"}
              style={{ gridColumn, gridRow: row, background: done ? "#fff" : ["#ffe7a8", "#ffd0c8", "#d7f5e4", "#d4ecff", "#eadcff"][(puzzle.id - 1) % 5] }}
              aria-label={current ? `Play puzzle ${puzzle.id}` : `Puzzle ${puzzle.id}`}
              onClick={() => {
                if (current) startPuzzle(puzzle.id);
              }}
            >
              {done ? <StickerArt puzzleId={puzzle.id} /> : badge && !badges.includes(badge.id) ? <img className="snap-silhouette" src={`${import.meta.env.BASE_URL}badges/${badge.id}.jpg?v=3`} alt="" /> : current ? null : <em>{puzzle.id}</em>}
              {current ? (
                <span ref={token} className="snap-token" data-token={puzzle.id}>
                  <MascotFace id={mascot} />
                </span>
              ) : null}
            </button>
          );
        })}
        {cap < 100 ? (
          <div className="snap-gate" style={{ gridColumn: "1 / -1", gridRow: Math.floor((cap - 1) / 5) + 2 }} aria-label="Locked gate">
            <Lock />
          </div>
        ) : null}
      </div>
      <div className="snap-path-finish">
        <span>Finish</span>
        <svg viewBox="0 0 72 48" aria-hidden="true">
          <rect x="8" y="22" width="56" height="22" fill="#7d6cff" />
          <polygon points="8,24 22,10 36,24" fill="#ff5c45" />
          <polygon points="36,24 50,8 64,24" fill="#ffb20a" />
          <rect x="46" y="4" width="3" height="14" fill="#2c2644" />
          <polygon points="49,4 62,8 49,12" fill="#ff5c45" />
          <rect x="30" y="30" width="12" height="14" fill="#ffd15a" />
        </svg>
        {!next && completed.length >= 100 ? (
          <span className="snap-token" data-token="finish">
            <MascotFace id={mascot} />
          </span>
        ) : null}
      </div>
    </div>
  );
}