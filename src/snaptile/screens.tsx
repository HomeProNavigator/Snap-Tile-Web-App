import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Award, Bookmark, Camera, Check, Hammer, Lightbulb, Lock, Puzzle, RotateCw, Trash2, Undo2, UserRound, Volume2, VolumeX } from "lucide-react";
import { BADGES, badgeJustFinished, badgeVisible } from "./badges";
import { orbitLock } from "./orbit";
import { PUZZLES, guideLabel } from "./puzzles";
import { useSnap } from "./store";
import { currentNative, isNativeApp } from "./native";
import { TEST_UNLOCK } from "./test-mode";
import { TILE_COLORS, TILE_HEX, kindKey, pieceLimit, pieceLimitLabel, puzzleCap, tierName, type Piece, type Tier } from "./tiles";

const TileCanvas = lazy(() => import("./TileCanvas").then((mod) => ({ default: mod.TileCanvas })));

function AnimalMark({ animal }: { animal: string }) {
  const ear = animal === "Bunny" || animal === "Cat" || animal === "Kitten" || animal === "Fox";
  return (
    <svg viewBox="0 0 64 64" className="snap-animal" aria-hidden="true">
      {ear ? (
        <>
          <path d="M18 30 14 10l14 12z" />
          <path d="M46 30 50 10 36 22z" />
        </>
      ) : null}
      {animal === "Giraffe" ? <rect x="28" y="6" width="8" height="16" rx="3" /> : null}
      <circle cx="32" cy="38" r="16" />
      <circle cx="26" cy="36" r="2" />
      <circle cx="38" cy="36" r="2" />
    </svg>
  );
}

function TileGlyph({ kind, size = 36 }: { kind: "square" | "triangle" | "flat" | "wall" | "roof" | "solid" | "window" | "door"; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 36 36", "aria-hidden": true as const };
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
  return (
    <svg {...props}>
      <rect x="5" y="5" width="26" height="26" rx="3" fill="currentColor" />
    </svg>
  );
}

function Gate({ onClose, onPass }: { onClose: () => void; onPass: () => void }) {
  const problem = useMemo(() => {
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 6 + Math.floor(Math.random() * 4);
    return { a, b, answer: String(a * b) };
  }, []);
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <div className="snap-modal" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form
        className="snap-sheet"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim() === problem.answer) onPass();
          else setWrong(true);
        }}
      >
        <h2 id="gate-title">Grown-ups only</h2>
        <p>What is {problem.a} × {problem.b}?</p>
        <input
          inputMode="numeric"
          autoComplete="off"
          aria-label="Answer"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setWrong(false);
          }}
        />
        {wrong ? <p className="snap-warn">That answer is not right yet.</p> : null}
        <div className="snap-row">
          <button type="button" className="snap-secondary" onClick={onClose}>
            Back
          </button>
          <button type="submit" className="snap-primary">
            Continue
          </button>
        </div>
      </form>
    </div>
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
    { title: "A grown-up helps", body: "Plans, privacy, and the account stay behind a grown-up question. Nothing here is shared." },
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
  const openGuarded = useSnap((s) => s.openGuarded);
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
        <button className="snap-choice" data-tone="mint" onClick={() => openGuarded("account")}>
          <span className="snap-choice-icon">
            <UserRound />
          </span>
          <strong>Account</strong>
          <em>For grown-ups</em>
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
  const [mounted, setMounted] = useState(false);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; active: boolean } | null>(null);
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
        {mode === "play" && puzzle && mounted && !picture ? (
          <div className="snap-goal">
            <span>Copy this</span>
            <Suspense fallback={null}>
              <TileCanvas yaw={yaw} pitch={pitch} preview={puzzle.pieces} />
            </Suspense>
          </div>
        ) : null}
      </div>
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
                  onClick={() => setTray({ trayFacing: facing, trayShape: shape, trayCutout: cutout })}
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
            <button
              className="snap-icon"
              aria-label={selected != null ? "Remove selected tile" : "Undo last tile"}
              disabled={placed.length === 0}
              onClick={() => (selected != null ? removeSelected() : undoLast())}
            >
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
              className={piece.shape === "triangle" ? "snap-mini is-tri" : "snap-mini"}
              style={
                piece.shape === "triangle"
                  ? { borderBottomColor: TILE_HEX[piece.color] }
                  : { background: TILE_HEX[piece.color] }
              }
            />
            <span>{left}</span>
            {piece.cutout === "window" || piece.cutout === "door" ? <TileGlyph kind={piece.cutout} size={22} /> : null}
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
  const puzzle = PUZZLES.find((p) => p.id === puzzleId);
  const next = puzzle && puzzle.id < 100 ? PUZZLES.find((p) => p.id === puzzle.id + 1) : null;
  const earned = puzzle ? badgeJustFinished(puzzle.id) : undefined;
  const showBadge = earned && completed.includes(puzzle!.id);
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
    </section>
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
              <AnimalMark animal={badge.animal} />
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
  { id: "builder", title: "Builder", price: "$7.99", detail: "50 tiles and 50 puzzles." },
  { id: "master", title: "Master Builder", price: "$10.99", detail: "Big castles and all 100 puzzles." },
  { id: "yearly", title: "Unlimited Yearly", price: "$49.99", detail: "The same big set for a year on this device." },
];

function Paywall() {
  const go = useSnap((s) => s.go);
  const choosePlan = useSnap((s) => s.choosePlan);
  const restorePlan = useSnap((s) => s.restorePlan);
  const tier = useSnap((s) => s.tier);
  return (
    <section className="snap-screen">
      <header className="snap-top">
        <button className="snap-icon" aria-label="Back" onClick={() => go("account")}>
          <ArrowLeft />
        </button>
        <div>
          <h1>Plans</h1>
          <p>{isNativeApp() ? "Ask a grown-up. Apple handles the payment." : "This device only. Not a real charge."}</p>
        </div>
      </header>
      {PLANS.map((plan) => (
        <button key={plan.id} className="snap-plan" onClick={() => choosePlan(plan.id)}>
          <strong>
            {plan.title} · {plan.price}
          </strong>
          <span>{plan.detail}</span>
          {tier === plan.id ? <span className="snap-plan-status">On this device</span> : null}
        </button>
      ))}
      <button className="snap-text" onClick={restorePlan}>
        Restore plan
      </button>
    </section>
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
  const signOut = useSnap((s) => s.signOut);
  const resetDevice = useSnap((s) => s.resetDevice);
  const openGuarded = useSnap((s) => s.openGuarded);
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
      <button className="snap-plan" onClick={() => openGuarded("paywall")}>
        <strong>Plans</strong>
        <span>
          {tierName(tier)} · {pieceLimitLabel(tier)} tiles
        </span>
      </button>
      {saved.length > 0 ? (
        <div className="snap-saved">
          {saved.map((build) => (
            <button key={build.id} onClick={() => loadBuild(build.id)}>
              {build.name} · {build.pieces.length} tiles
            </button>
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
  const gateOpen = useSnap((s) => s.gateOpen);
  const closeGate = useSnap((s) => s.closeGate);
  const passGate = useSnap((s) => s.passGate);
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
      {gateOpen ? <Gate onClose={closeGate} onPass={passGate} /> : null}
    </main>
  );
}
