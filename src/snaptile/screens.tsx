import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Award, Bookmark, Camera, Check, Hammer, Lightbulb, Lock, Puzzle, RotateCw, Trash2, Undo2, UserRound, Volume2, VolumeX } from "lucide-react";
import { BADGES, badgeJustFinished, badgeVisible } from "./badges";
import { orbitLock } from "./orbit";
import { PUZZLES, guideLabel } from "./puzzles";
import { useSnap } from "./store";
import { currentNative, isNativeApp, manageSubscription, storePrices } from "./native";
import { LEGAL_UPDATED, PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "./legal";
import { TEST_UNLOCK } from "./test-mode";
import { TILE_COLORS, TILE_HEX, kindKey, pieceLimit, pieceLimitLabel, puzzleCap, tierName, type Piece, type Tier } from "./tiles";

const TileCanvas = lazy(() => import("./TileCanvas").then((mod) => ({ default: mod.TileCanvas })));

function BadgeArt({ id, earned }: { id: string; earned: boolean }) {
  return <img className={earned ? "snap-badge-art" : "snap-badge-art is-locked"} src={`${import.meta.env.BASE_URL}badges/${id}.jpg?v=3`} alt="" />;
}

function TileGlyph({ kind, size = 36 }: { kind: "square" | "triangle" | "right" | "flat" | "wall" | "roof" | "solid" | "window" | "door" | "arch" | "wheel"; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 36 36", "aria-hidden": true as const };
  if (kind === "right") {
    return (
      <svg {...props}>
        <path d="M6 30 30 30 6 6Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "triangle") {
    return (
      <svg {...props}>
        <path d="M18 4 33 32H3Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "flat") {
    return (
      <svg {...props}>
        <rect x="3" y="13" width="30" height="12" rx="2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "wall") {
    return (
      <svg {...props}>
        <rect x="11" y="3" width="14" height="30" rx="2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "roof") {
    return (
      <svg {...props}>
        <path d="M4 22 18 5l14 17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <rect x="8" y="22" width="20" height="9" rx="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "window") {
    return (
      <svg {...props}>
        <rect x="4" y="4" width="28" height="28" rx="3" fill="currentColor" />
        <rect x="11" y="11" width="14" height="14" rx="1" fill="#efeaff" />
        <path d="M18 11v14M11 18h14" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "door") {
    return (
      <svg {...props}>
        <rect x="4" y="4" width="28" height="28" rx="3" fill="currentColor" />
        <path d="M13 32V15h12v17" fill="#efeaff" />
        <circle cx="21" cy="24" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "arch") {
    return (
      <svg {...props}>
        <rect x="4" y="4" width="28" height="28" rx="3" fill="currentColor" />
        <path d="M12 32V18a6 6 0 0 1 12 0v14" fill="#efeaff" />
      </svg>
    );
  }
  if (kind === "wheel") {
    return (
      <svg {...props}>
        <circle cx="18" cy="18" r="12" fill="currentColor" />
        <circle cx="18" cy="18" r="4" fill="#efeaff" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect x="5" y="5" width="26" height="26" rx="3" fill="currentColor" />
    </svg>
  );
}

function Onboarding() {
  const [step, setStep] = useState(0);
  const name = useSnap((s) => s.name);
  const setName = useSnap((s) => s.setName);
  const finish = useSnap((s) => s.finishOnboarding);
  const pages = [
    { title: "Snap the tiles", body: "Squares and triangles click together. Build a castle, or follow a puzzle." },
    {
      title: "Up, down, and across",
      body: "Pick one tile. Choose flat, wall, or roof, then tap a single outline. One tap adds one piece.",
    },
    { title: "More tiles, more puzzles", body: "The first 10 puzzles and 10 tiles are free. Plans unlock the rest. Nothing here is shared." },
  ];
  if (step < 3) {
    const page = pages[step]!;
    return (
      <section className="snap-screen snap-center">
        <p className="snap-kicker">SnapTile</p>
        <h1>{page.title}</h1>
        <p className="snap-lead">{page.body}</p>
        <button className="snap-primary snap-wide" onClick={() => setStep(step + 1)}>
          {step === 2 ? "Almost there" : "Next"}
        </button>
      </section>
    );
  }
  return (
    <section className="snap-screen snap-center">
      <h1>What should we call you?</h1>
      <p className="snap-lead">A first name is enough. It stays on this device.</p>
      <input
        aria-label="First name"
        maxLength={16}
        value={name}
        placeholder="Your name"
        onChange={(event) => setName(event.target.value)}
      />
      <button className="snap-primary snap-wide" onClick={finish}>
        Start building
      </button>
    </section>
  );
}

function Home() {
  const name = useSnap((s) => s.name);
  const go = useSnap((s) => s.go);
  const startFree = useSnap((s) => s.startFree);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const completed = useSnap((s) => s.completed);
  const tier = useSnap((s) => s.tier);
  const sound = useSnap((s) => s.sound);
  const setSound = useSnap((s) => s.setSound);
  const next = PUZZLES.find(
    (puzzle) =>
      !completed.includes(puzzle.id) &&
      puzzle.id <= puzzleCap(tier) &&
      (puzzle.id === 1 || completed.includes(puzzle.id - 1)),
  );
  const progress = completed.length === 0 ? 0 : Math.round((completed.length / 100) * 100);
  return (
    <section className="snap-screen snap-home">
      <header className="snap-top">
        <div>
          <p className="snap-kicker">SnapTile</p>
          <h1>{name ? `Hi, ${name}` : "Hi, builder"}</h1>
        </div>
        <button className="snap-icon" aria-label={sound ? "Turn sound off" : "Turn sound on"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 /> : <VolumeX />}
        </button>
      </header>
      <button className="snap-hero" onClick={() => (next ? startPuzzle(next.id) : go("puzzles"))}>
        <span className="snap-stack" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <strong>{next ? next.name : "All built"}</strong>
          <em>{next ? `${next.pieces.length} tiles · ${guideLabel(next.id)}` : "100 puzzles finished"}</em>
        </span>
        <span className="snap-hero-go">{next ? "Play" : "See"}</span>
      </button>
      <div className="snap-meter" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="snap-meter-label">{completed.length} of 100 puzzles</p>
      <div className="snap-grid">
        <button className="snap-choice" data-tone="coral" onClick={startFree}>
          <span className="snap-choice-icon">
            <Hammer />
          </span>
          <strong>Free Build</strong>
          <em>Make your own</em>
        </button>
        <button className="snap-choice" data-tone="sky" onClick={() => go("puzzles")}>
          <span className="snap-choice-icon">
            <Puzzle />
          </span>
          <strong>Puzzles</strong>
          <em>Copy a build</em>
        </button>
        <button className="snap-choice" data-tone="gold" onClick={() => go("badges")}>
          <span className="snap-choice-icon">
            <Award />
          </span>
          <strong>Badges</strong>
          <em>Animals you earn</em>
        </button>
        <button className="snap-choice" data-tone="mint" onClick={() => go("account")}>
          <span className="snap-choice-icon">
            <UserRound />
          </span>
          <strong>Account</strong>
          <em>Name and plans</em>
        </button>
      </div>
    </section>
  );
}

function Puzzles() {
  const go = useSnap((s) => s.go);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const completed = useSnap((s) => s.completed);
  const tier = useSnap((s) => s.tier);
  const notice = useSnap((s) => s.notice);
  return (
    <section className="snap-screen">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go("home")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Puzzles</h1>
          <p>{completed.length} finished</p>
        </div>
      </header>
      {notice ? <p className="snap-note">{notice}</p> : null}
      <div className="snap-puzzle-grid">
        {PUZZLES.map((puzzle) => {
          const done = completed.includes(puzzle.id);
          const tierLocked = !TEST_UNLOCK && puzzle.id > puzzleCap(tier);
          const sequenceLocked = !TEST_UNLOCK && puzzle.id > 1 && !completed.includes(puzzle.id - 1) && !completed.includes(puzzle.id);
          const locked = tierLocked || sequenceLocked;
          const nextOpen = !done && !locked && (puzzle.id === 1 || completed.includes(puzzle.id - 1));
          return (
            <button
              key={puzzle.id}
              className={done ? "snap-puzzle is-done" : nextOpen ? "snap-puzzle is-next" : locked ? "snap-puzzle is-locked" : "snap-puzzle"}
              onClick={() => startPuzzle(puzzle.id)}
            >
              <span className="snap-puzzle-id">{locked ? <Lock /> : puzzle.id}</span>
              <strong>{puzzle.name}</strong>
              <span>
                {puzzle.pieces.length} tiles · {guideLabel(puzzle.id)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BuildChrome({ mode }: { mode: "free" | "play" }) {
  const [yaw, setYaw] = useState(0.75);
  const [pitch, setPitch] = useState(0.48);
  const [picture, setPicture] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalZoom, setGoalZoom] = useState(1);
  const [goalYaw, setGoalYaw] = useState(0.75);
  const [goalPitch, setGoalPitch] = useState(0.48);
  const [mounted, setMounted] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; active: boolean } | null>(null);
  const goalDrag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const goalPointers = useRef(new Map<number, { x: number; y: number }>());
  const goalPinch = useRef<{ distance: number; zoom: number } | null>(null);
  const go = useSnap((s) => s.go);
  const placed = useSnap((s) => s.placed);
  const puzzleId = useSnap((s) => s.puzzleId);
  const tier = useSnap((s) => s.tier);
  const notice = useSnap((s) => s.notice);
  const trayShape = useSnap((s) => s.trayShape);
  const trayColor = useSnap((s) => s.trayColor);
  const trayCutout = useSnap((s) => s.trayCutout);
  const trayFacing = useSnap((s) => s.trayFacing);
  const setTray = useSnap((s) => s.setTray);
  const removeSelected = useSnap((s) => s.removeSelected);
  const undoLast = useSnap((s) => s.undoLast);
  const selected = useSnap((s) => s.selected);
  const finishFree = useSnap((s) => s.finishFree);
  const saveBuild = useSnap((s) => s.saveBuild);
  const puzzle = PUZZLES.find((p) => p.id === puzzleId);
  const full = mode === "free" && placed.length >= pieceLimit(tier);
  const quiet = picture || full;
  useEffect(() => setMounted(true), []);

  return (
    <section className="snap-play">
      <header className="snap-top snap-float">
        <button className="snap-icon" aria-label="Back" onClick={() => go(mode === "free" ? "home" : "puzzles")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>{mode === "free" ? "Free Build" : puzzle?.name}</h1>
          <p>
            {mode === "play" && puzzle
              ? `${placed.length}/${puzzle.pieces.length} · ${guideLabel(puzzle.id)}`
              : `${placed.length}/${pieceLimitLabel(tier)} tiles`}
          </p>
        </div>
        <div className="snap-tools">
          <button
            className={picture ? "snap-icon is-on" : "snap-icon"}
            aria-label={picture ? "Show empty spots" : "Hide empty spots"}
            aria-pressed={picture}
            onClick={() => setPicture((on) => !on)}
          >
            <Camera />
          </button>
          <button className="snap-icon" aria-label="Turn the table" onClick={() => setYaw((value) => value + Math.PI / 4)}>
            <RotateCw />
          </button>
        </div>
      </header>
      <div className="snap-board">
      <div
        className="snap-stage"
        onPointerDown={(event) => {
          orbitLock.moved = false;
          drag.current = { x: event.clientX, y: event.clientY, yaw, pitch, active: true };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start?.active) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (dx * dx + dy * dy > 64) orbitLock.moved = true;
          if (!orbitLock.moved) return;
          setYaw(start.yaw - dx * 0.01);
          setPitch(Math.min(1.15, Math.max(0.22, start.pitch + dy * 0.007)));
        }}
        onPointerUp={() => {
          if (drag.current) drag.current.active = false;
        }}
        onPointerCancel={() => {
          if (drag.current) drag.current.active = false;
        }}
      >
        {mounted ? (
          <Suspense fallback={<p className="snap-note">Setting the table…</p>}>
            <TileCanvas yaw={yaw} pitch={pitch} quiet={quiet} />
          </Suspense>
        ) : null}
        {mode === "play" && puzzle && mounted && !picture && !goalOpen ? (
          <button
            type="button"
            className="snap-goal"
            aria-label="Make the picture bigger"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              setGoalZoom(1);
              setGoalOpen(true);
            }}
          >
            <span>Copy this</span>
            <Suspense fallback={null}>
              <TileCanvas yaw={yaw} pitch={pitch} preview={puzzle.pieces} />
            </Suspense>
          </button>
        ) : null}
      </div>
      {goalOpen && puzzle && mounted ? (
        <div className="snap-goal-big" role="dialog" aria-label="Finished puzzle">
          <div
            className="snap-goal-view"
            onPointerDown={(event) => {
              goalPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              event.currentTarget.setPointerCapture(event.pointerId);
              if (goalPointers.current.size === 2) {
                const [a, b] = [...goalPointers.current.values()];
                goalPinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: goalZoom };
                goalDrag.current = null;
              } else {
                goalDrag.current = { x: event.clientX, y: event.clientY, yaw: goalYaw, pitch: goalPitch };
              }
            }}
            onPointerMove={(event) => {
              if (!goalPointers.current.has(event.pointerId)) return;
              goalPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (goalPointers.current.size >= 2 && goalPinch.current) {
                const [a, b] = [...goalPointers.current.values()];
                const distance = Math.hypot(a.x - b.x, a.y - b.y);
                const next = goalPinch.current.zoom * (distance / Math.max(1, goalPinch.current.distance));
                setGoalZoom(Math.min(3.2, Math.max(0.7, next)));
                return;
              }
              const start = goalDrag.current;
              if (!start) return;
              setGoalYaw(start.yaw - (event.clientX - start.x) * 0.01);
              setGoalPitch(Math.min(1.15, Math.max(0.22, start.pitch + (event.clientY - start.y) * 0.007)));
            }}
            onPointerUp={(event) => {
              goalPointers.current.delete(event.pointerId);
              if (goalPointers.current.size < 2) goalPinch.current = null;
              if (goalPointers.current.size === 0) goalDrag.current = null;
            }}
            onPointerCancel={(event) => {
              goalPointers.current.delete(event.pointerId);
              goalPinch.current = null;
              goalDrag.current = null;
            }}
          >
            <Suspense fallback={null}>
              <TileCanvas yaw={goalYaw} pitch={goalPitch} zoom={goalZoom} preview={puzzle.pieces} />
            </Suspense>
          </div>
          <button type="button" className="snap-goal-x" aria-label="Close the picture" onClick={() => setGoalOpen(false)}>
            ×
          </button>
          <div className="snap-goal-zoom">
            <button type="button" aria-label="Zoom in" onClick={() => setGoalZoom((value) => Math.min(3.2, value + 0.4))}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => setGoalZoom((value) => Math.max(0.7, value - 0.4))}>
              −
            </button>
          </div>
        </div>
      ) : null}
      <div className="snap-side">
      {notice ? <p className="snap-note">{notice}</p> : null}
      {mode === "play" && puzzle ? (
        <PuzzleTray puzzlePieces={puzzle.pieces} />
      ) : (
        <div className="snap-tray">
          <div className="snap-kinds">
            {(
              [
                ["flat", "square", "none", "Floor"],
                ["wall", "square", "none", "Wall"],
                ["wall", "square", "window", "Window"],
                ["wall", "square", "door", "Door"],
                ["wall", "triangle", "none", "Triangle"],
                ["roof", "triangle", "none", "Roof"],
              ] as const
            ).map(([facing, shape, cutout, label]) => {
              const on = trayFacing === facing && trayShape === shape && trayCutout === cutout;
              return (
                <button
                  key={label}
                  className={on ? "snap-chip is-on" : "snap-chip"}
                  aria-label={label}
                  onClick={() => setTray({ trayFacing: facing, trayShape: shape, trayCutout: cutout, trayRot: 0 })}
                >
                  <TileGlyph kind={cutout === "none" ? (facing === "flat" ? "flat" : facing === "roof" ? "roof" : shape === "triangle" ? "triangle" : "wall") : cutout} />
                </button>
              );
            })}
          </div>
          <div className="snap-colors">
            {TILE_COLORS.map((color) => (
              <button
                key={color.id}
                aria-label={color.label}
                className={trayColor === color.id ? "snap-swatch is-on" : "snap-swatch"}
                data-color={color.id}
                onClick={() => setTray({ trayColor: color.id })}
              />
            ))}
          </div>
          {full || picture ? (
            <p>
              {full ? "Every tile is used. Undo one to keep building." : "Empty spots are hidden. Tap the camera to bring them back."}
            </p>
          ) : null}
          <div className="snap-row">
            <button className="snap-icon" aria-label="Undo last tile" disabled={placed.length === 0} onClick={() => (selected != null ? removeSelected() : undoLast())}>
              {selected != null ? <Trash2 /> : <Undo2 />}
            </button>
            <button className="snap-secondary" aria-label="Save" onClick={saveBuild}>
              <Bookmark />
            </button>
            <button className="snap-primary" aria-label="I'm done" onClick={finishFree}>
              <Check />
            </button>
          </div>
        </div>
      )}
      </div>
      </div>
    </section>
  );
}

function PuzzleTray({ puzzlePieces }: { puzzlePieces: Piece[] }) {
  const placed = useSnap((s) => s.placed);
  const held = useSnap((s) => s.held);
  const setHeld = useSnap((s) => s.setHeld);
  const undoLast = useSnap((s) => s.undoLast);
  const useHint = useSnap((s) => s.useHint);
  const picks = useMemo(() => {
    const order: Piece[] = [];
    for (const piece of puzzlePieces) {
      if (!order.some((have) => kindKey(have) === kindKey(piece))) order.push(piece);
    }
    return order.map((piece) => {
      const key = kindKey(piece);
      const need = puzzlePieces.filter((item) => kindKey(item) === key).length;
      const have = placed.filter((item) => kindKey(item) === key).length;
      return { piece, key, left: need - have };
    });
  }, [puzzlePieces, placed]);
  return (
    <div className="snap-tray">
      <div className="snap-picks">
        {picks.map(({ piece, key, left }) => (
          <button
            key={key}
            className={held && kindKey(held) === key ? "snap-pick is-on" : "snap-pick"}
            disabled={left <= 0}
            onClick={() => setHeld({ shape: piece.shape, color: piece.color, cutout: piece.cutout })}
          >
            <span
              className={piece.shape === "triangle" ? "snap-mini is-tri" : piece.shape === "wheel" ? "snap-mini is-wheel" : piece.shape === "right" ? "snap-mini is-right" : "snap-mini"}
              style={
                piece.shape === "triangle"
                  ? { borderBottomColor: TILE_HEX[piece.color] }
                  : { background: TILE_HEX[piece.color] }
              }
            />
            <span>{left}</span>
            {piece.shape === "wheel" ? <TileGlyph kind="wheel" size={22} /> : piece.cutout === "window" || piece.cutout === "door" || piece.cutout === "arch" ? <TileGlyph kind={piece.cutout} size={22} /> : null}
          </button>
        ))}
      </div>
      <div className="snap-row">
        <button className="snap-secondary" aria-label="Undo" onClick={undoLast} disabled={placed.length === 0}>
          <Undo2 />
        </button>
        <button className="snap-secondary" aria-label="Extra help" onClick={useHint}>
          <Lightbulb />
        </button>
      </div>
    </div>
  );
}

function Celebrate() {
  const go = useSnap((s) => s.go);
  const puzzleId = useSnap((s) => s.puzzleId);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const completed = useSnap((s) => s.completed);
  const fresh = useSnap((s) => s.fresh);
  const dismissFresh = useSnap((s) => s.dismissFresh);
  const puzzle = PUZZLES.find((p) => p.id === puzzleId);
  const next = puzzle && puzzle.id < 100 ? PUZZLES.find((p) => p.id === puzzle.id + 1) : null;
  const earned = puzzle ? badgeJustFinished(puzzle.id) : undefined;
  const showBadge = earned && completed.includes(puzzle!.id);
  const popped = fresh[0] ? BADGES.find((badge) => badge.id === fresh[0]) : undefined;
  return (
    <section className="snap-screen snap-center">
      <p className="snap-kicker">Great Build!</p>
      <h1>{puzzle ? puzzle.name : "Nice building"}</h1>
      <p className="snap-lead">
        {showBadge ? `You earned ${earned.name}.` : puzzle ? `${completed.length} of 100 puzzles finished.` : "That build stays on this device if you saved it."}
      </p>
      <div className="snap-row">
        <button className="snap-secondary" onClick={() => go(puzzle ? "puzzles" : "home")}>
          Back
        </button>
        {next ? (
          <button className="snap-primary" onClick={() => startPuzzle(next.id)}>
            Next
          </button>
        ) : (
          <button className="snap-primary" onClick={() => go("home")}>
            Home
          </button>
        )}
      </div>
      {popped ? <BadgePop badgeId={popped.id} name={popped.name} animal={popped.animal} onDone={dismissFresh} /> : null}
    </section>
  );
}

function BadgePop({ badgeId, name, animal, onDone }: { badgeId: string; name: string; animal: string; onDone: () => void }) {
  return (
    <div className="snap-pop" role="dialog" aria-label={`New badge, ${name}`}>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="snap-confetti" style={{ left: `${(i * 17) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, background: ["#ff5a7a", "#ffd15a", "#5ad1ff", "#7d5cff", "#3ddc97", "#ff8a3d"][i % 6] }} />
      ))}
      <p className="snap-kicker">New badge!</p>
      <img className="snap-pop-art" src={`${import.meta.env.BASE_URL}badges/${badgeId}.jpg?v=3`} alt="" />
      <h1>{name}</h1>
      <p>{animal}</p>
      <button className="snap-primary" onClick={onDone}>
        Yay!
      </button>
    </div>
  );
}

function BadgesScreen() {
  const go = useSnap((s) => s.go);
  const badges = useSnap((s) => s.badges);
  const tier = useSnap((s) => s.tier);
  return (
    <section className="snap-screen">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go("home")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Badges</h1>
          <p>{badges.length} earned</p>
        </div>
      </header>
      <div className="snap-badge-grid">
        {BADGES.filter((badge) => badgeVisible(badge, tier)).map((badge) => {
          const on = badges.includes(badge.id);
          return (
            <article key={badge.id} className={on ? "snap-badge is-on" : "snap-badge"}>
              <BadgeArt id={badge.id} earned={on} />
              <strong>{badge.name}</strong>
              <span>{on ? badge.detail : "Not yet"}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const PLANS: { id: Tier; title: string; price: string; detail: string }[] = [
  { id: "free", title: "Free", price: "$0", detail: "10 tiles and the first 10 puzzles." },
  { id: "builder", title: "Builder", price: "$7.99/month", detail: "50 tiles and 50 puzzles." },
  { id: "master", title: "Master Builder", price: "$10.99/month", detail: "80 tiles and all 100 puzzles." },
  { id: "yearly", title: "Unlimited Yearly", price: "$49.99/year", detail: "80 tiles and all 100 puzzles for a year." },
];

function Paywall() {
  const go = useSnap((s) => s.go);
  const choosePlan = useSnap((s) => s.choosePlan);
  const restorePlan = useSnap((s) => s.restorePlan);
  const tier = useSnap((s) => s.tier);
  const [prices, setPrices] = useState<Partial<Record<Tier, string>> | null>(null);
  useEffect(() => {
    if (!isNativeApp()) return;
    void storePrices().then(setPrices);
  }, []);
  const openDoc = (doc: "privacy" | "terms") => {
    useSnap.setState({ docBack: "paywall", view: doc });
  };
  return (
    <section className="snap-screen">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go("account")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Plans</h1>
          <p>{isNativeApp() ? "Apple handles the payment." : "This device only. Not a real charge."}</p>
        </div>
      </header>
      {PLANS.map((plan) => {
        const live = plan.id === "free" ? plan.price : prices?.[plan.id];
        const price =
          plan.id === "free"
            ? plan.price
            : live
              ? `${live}${plan.id === "yearly" ? "/year" : "/month"}`
              : isNativeApp()
                ? prices
                  ? "App Store price"
                  : "Loading App Store price"
                : plan.price;
        return (
          <button key={plan.id} className="snap-plan" onClick={() => choosePlan(plan.id)}>
            <strong>
              {plan.title} · {price}
            </strong>
            <span>{plan.detail}</span>
            {tier === plan.id ? <span className="snap-plan-status">On this device</span> : null}
          </button>
        );
      })}
      <div className="snap-legal-note">
        <p>A paid plan renews until you cancel. Builder and Master Builder renew every month. Unlimited Yearly renews every year. You get the tiles and puzzles named on that plan for each period.</p>
        <p>Payment is charged to your Apple ID when you confirm. The plan renews for the same price and length unless you cancel at least 24 hours before the period ends. Apple charges the renewal within 24 hours before the period ends. You can manage or cancel in your Apple ID subscriptions. Deleting the app does not cancel the plan.</p>
      </div>
      <button className="snap-text" onClick={restorePlan}>
        Restore plan
      </button>
      <button className="snap-text" onClick={() => void manageSubscription()}>
        Manage or cancel
      </button>
      <div className="snap-row">
        <button className="snap-text" onClick={() => openDoc("privacy")}>
          Privacy Policy
        </button>
        <button className="snap-text" onClick={() => openDoc("terms")}>
          Terms of Use
        </button>
      </div>
    </section>
  );
}

function PrivacyPolicy() {
  const go = useSnap((s) => s.go);
  const back = useSnap((s) => s.docBack);
  return (
    <section className="snap-screen snap-doc">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go(back)}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Privacy Policy</h1>
          <p>Effective {LEGAL_UPDATED}</p>
        </div>
      </header>
      <div className="snap-doc-body">
        <p>SnapTile is a puzzle and building game from SnapTile, Henderson, Nevada, United States. This policy explains what happens to information when you use the iPhone app.</p>
        <h2>What stays on your device</h2>
        <p>The app can store a first name, puzzle progress, badges, the sound setting, and saved builds. You do not have to enter a name. This information stays on the device. SnapTile does not receive it, does not sell it, and does not use it for advertising.</p>
        <h2>What we do not collect</h2>
        <p>SnapTile does not collect location, contacts, photos, advertising identifiers, or analytics. There is no account server and there are no ads.</p>
        <h2>Payments</h2>
        <p>Subscriptions are processed by Apple. Apple receives the payment details. SnapTile does not receive your card number or your Apple ID password.</p>
        <h2>Children</h2>
        <p>The game can be played by children with a parent. A name, if one is typed in, never leaves the device. We do not send personal information about a child to SnapTile, because the app does not send that information to us at all.</p>
        <h2>How to delete it</h2>
        <p>Open Account and tap Erase this device. That removes the name, progress, and saved builds from that device. Uninstalling the app removes them too. There is no server copy to delete.</p>
        <h2>Your rights</h2>
        <p>If you are in the European Economic Area or the United Kingdom, you can ask for access, correction, or deletion of personal data a company holds about you. SnapTile does not hold a copy. You erase the device yourself. Questions: {SUPPORT_EMAIL}.</p>
        <p>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            Open this policy on the web
          </a>
        </p>
      </div>
    </section>
  );
}

function TermsOfUse() {
  const go = useSnap((s) => s.go);
  const back = useSnap((s) => s.docBack);
  return (
    <section className="snap-screen snap-doc">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go(back)}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Terms of Use</h1>
          <p>Effective {LEGAL_UPDATED}</p>
        </div>
      </header>
      <div className="snap-doc-body">
        <p>These terms are an agreement between you and SnapTile, Henderson, Nevada, United States, not with Apple. Apple is not responsible for the app or its content.</p>
        <h2>The license</h2>
        <p>You receive a personal, non-transferable license to use SnapTile on Apple devices you own or control. You may not copy, sell, or reverse engineer the app except where the law allows it.</p>
        <h2>Plans</h2>
        <p>Free includes 10 tiles and puzzles 1 through 10. Builder renews every month and includes 50 tiles and puzzles 1 through 50. Master Builder renews every month and includes 80 tiles and all 100 puzzles. Unlimited Yearly renews every year and includes 80 tiles and all 100 puzzles. The price on the Plans screen is the price Apple charges in your currency.</p>
        <p>Payment is charged to your Apple ID when you confirm. A paid plan renews for the same length and price unless you cancel at least 24 hours before the period ends. Apple charges the renewal within 24 hours before the period ends. Manage or cancel in your Apple ID subscriptions. Deleting the app does not cancel a plan. The paid plans are one group, so only one can be active. When a plan ends, the app returns to Free. Refunds are handled by Apple.</p>
        <h2>Support</h2>
        <p>SnapTile, not Apple, is responsible for the app, for support, and for product claims. The app is provided as is. If it fails an applicable warranty, you may ask Apple for a refund of the app price. Apple has no other warranty duty for the app.</p>
        <h2>Apple</h2>
        <p>Apple and Apple's subsidiaries are third-party beneficiaries of these terms and may enforce them. Questions: {SUPPORT_EMAIL}. These terms follow the laws of the State of Nevada, except where the law where you live says otherwise.</p>
        <p>
          <a href={TERMS_URL} target="_blank" rel="noreferrer">
            Open these terms on the web
          </a>
        </p>
      </div>
    </section>
  );
}

function UpgradeOffer() {
  const offer = useSnap((s) => s.offer);
  const dismissOffer = useSnap((s) => s.dismissOffer);
  const go = useSnap((s) => s.go);
  if (!offer) return null;
  return (
    <div className="snap-pop" role="dialog" aria-label="Want more puzzles and free build pieces?">
      <p className="snap-kicker">More to build</p>
      <h1>Want more puzzles and free build pieces?</h1>
      <div className="snap-offer-plans">
        {PLANS.filter((plan) => plan.id !== "free").map((plan) => (
          <p key={plan.id}>
            <strong>
              {plan.title} · {plan.price}
            </strong>
            <span>{plan.detail}</span>
          </p>
        ))}
      </div>
      <button
        className="snap-primary"
        onClick={() => {
          dismissOffer();
          go("paywall");
        }}
      >
        See plans
      </button>
      <button className="snap-text" onClick={dismissOffer}>
        Not now
      </button>
    </div>
  );
}

function Account() {
  const go = useSnap((s) => s.go);
  const name = useSnap((s) => s.name);
  const setName = useSnap((s) => s.setName);
  const tier = useSnap((s) => s.tier);
  const sound = useSnap((s) => s.sound);
  const setSound = useSnap((s) => s.setSound);
  const saved = useSnap((s) => s.saved);
  const loadBuild = useSnap((s) => s.loadBuild);
  const deleteBuild = useSnap((s) => s.deleteBuild);
  const signOut = useSnap((s) => s.signOut);
  const resetDevice = useSnap((s) => s.resetDevice);
  const notice = useSnap((s) => s.notice);
  return (
    <section className="snap-screen">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go("home")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Account</h1>
          <p>{tierName(tier)}</p>
        </div>
        <button className="snap-icon" aria-label={sound ? "Turn sound off" : "Turn sound on"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 /> : <VolumeX />}
        </button>
      </header>
      {notice ? <p className="snap-note">{notice}</p> : null}
      <label className="snap-field">
        Name
        <input aria-label="First name" maxLength={16} value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button className="snap-plan" onClick={() => go("paywall")}>
        <strong>Plans</strong>
        <span>
          {tierName(tier)} · {pieceLimitLabel(tier)} tiles
        </span>
      </button>
      <div className="snap-row">
        <button className="snap-text" onClick={() => useSnap.setState({ docBack: "account", view: "privacy" })}>
          Privacy Policy
        </button>
        <button className="snap-text" onClick={() => useSnap.setState({ docBack: "account", view: "terms" })}>
          Terms of Use
        </button>
      </div>
      {saved.length > 0 ? (
        <div className="snap-saved">
          {saved.map((build) => (
            <div key={build.id} className="snap-saved-row">
              <button onClick={() => loadBuild(build.id)}>
                {build.name} · {build.pieces.length} tiles
              </button>
              <button className="snap-icon" aria-label={`Delete ${build.name}`} onClick={() => deleteBuild(build.id)}>
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p>Saved builds show up here.</p>
      )}
      <button className="snap-text" onClick={signOut}>
        Sign out
      </button>
      <button className="snap-text snap-danger" onClick={resetDevice}>
        Erase this device
      </button>
    </section>
  );
}

export function SnapApp() {
  const hydrate = useSnap((s) => s.hydrate);
  const applyNativeTier = useSnap((s) => s.applyNativeTier);
  const ready = useSnap((s) => s.ready);
  const view = useSnap((s) => s.view);
  const offer = useSnap((s) => s.offer);
  const fresh = useSnap((s) => s.fresh);
  useEffect(() => {
    hydrate();
    void currentNative().then((tier) => {
      if (tier) applyNativeTier(tier);
    });
  }, [hydrate, applyNativeTier]);
  if (!ready) return <main className="snap-app" />;
  return (
    <main className="snap-app">
      {view === "onboarding" ? <Onboarding /> : null}
      {view === "home" ? <Home /> : null}
      {view === "free" ? <BuildChrome mode="free" /> : null}
      {view === "puzzles" ? <Puzzles /> : null}
      {view === "play" ? <BuildChrome mode="play" /> : null}
      {view === "celebrate" ? <Celebrate /> : null}
      {view === "badges" ? <BadgesScreen /> : null}
      {view === "account" ? <Account /> : null}
      {view === "paywall" ? <Paywall /> : null}
      {view === "privacy" ? <PrivacyPolicy /> : null}
      {view === "terms" ? <TermsOfUse /> : null}
      {offer && fresh.length === 0 ? <UpgradeOffer /> : null}
    </main>
  );
}
