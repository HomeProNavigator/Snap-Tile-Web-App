import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ZoomOut } from "lucide-react";
import { playTone } from "./audio";
import { haptic } from "./haptics";
import { MascotFace } from "./mascot";
import { StickerArt } from "./stickers";
import { useSnap } from "./store";
import { puzzleCap } from "./tiles";

const HOUSES: Record<number, string> = {
  5: "bunny",
  10: "zebra",
  15: "kitten",
  20: "puppy",
  25: "owl",
  30: "fox",
  40: "elephant",
  50: "bear",
  60: "tiger",
  75: "dragon",
  100: "lion",
};

const COLLECTION = ["turtle", "giraffe", "monkey", "cat", "wolf"];

type Panel = {
  id: string;
  src: string;
  ids: number[];
  tone: string;
  seam: string;
  clouds?: boolean;
  castle?: boolean;
  workshop?: boolean;
};

function nums(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

const PANELS: Panel[] = [
  { id: "sky3", src: "zone-sky-3.webp", ids: nums(93, 100), tone: "#ff62b3", seam: "#f7c6df", clouds: true, castle: true },
  { id: "sky2", src: "zone-sky-2.webp", ids: nums(85, 92), tone: "#ff62b3", seam: "#d9ecff", clouds: true },
  { id: "sky1", src: "zone-sky-1.webp", ids: nums(76, 84), tone: "#3aa0ff", seam: "#f7c6df" },
  { id: "dragon2", src: "zone-dragon-2.webp", ids: nums(69, 75), tone: "#a86bff", seam: "#d5c4f6" },
  { id: "dragon1", src: "zone-dragon-1.webp", ids: nums(61, 68), tone: "#a86bff", seam: "#e6d4fb" },
  { id: "jungle", src: "zone-jungle.webp", ids: nums(51, 60), tone: "#1fa86a", seam: "#b7ebe3" },
  { id: "peaks", src: "zone-peaks.webp", ids: nums(41, 50), tone: "#3aa0ff", seam: "#d7eef8", clouds: true },
  { id: "savanna", src: "zone-savanna.webp", ids: nums(31, 40), tone: "#ffb20a", seam: "#f0d48a" },
  { id: "woods", src: "zone-woods.webp", ids: nums(21, 30), tone: "#2fce78", seam: "#9fd9c4" },
  { id: "village", src: "zone-village.webp", ids: nums(11, 20), tone: "#ff5c45", seam: "#f3e6cf" },
  { id: "meadow", src: "zone-meadow.webp", ids: nums(1, 10), tone: "#2fce78", seam: "#c6efd4", workshop: true },
];

// Center-to-center pitch at the panel's minimum height. A 100px current stone
// beside a 78px stone then keeps at least 14px of road between them.
const PITCH = 108;
const EDGE = 62;

type Metric = { top: number; bottom: number; minH: number; base: number };

function padsFor(panel: Panel) {
  if (panel.workshop) return { top: EDGE, bottom: 292 };
  if (panel.castle) return { top: 318, bottom: EDGE };
  return { top: EDGE, bottom: EDGE };
}

const METRICS: Metric[] = (() => {
  const metrics: Metric[] = PANELS.map((panel) => {
    const pad = padsFor(panel);
    const span = Math.max(0, panel.ids.length - 1) * PITCH;
    return { ...pad, minH: pad.top + pad.bottom + span, base: 0 };
  });
  let y = 0;
  for (let i = PANELS.length - 1; i >= 0; i--) {
    metrics[i]!.base = y;
    y += metrics[i]!.minH;
  }
  return metrics;
})();

function xAt(globalFromBottom: number) {
  return 50 + 7.2 * Math.sin((globalFromBottom / 540) * Math.PI * 2);
}

function stoneSpot(panelIndex: number, i: number) {
  const metric = METRICS[panelIndex]!;
  const y = metric.minH - metric.bottom - i * PITCH;
  const global = metric.base + (metric.minH - y);
  return { x: xAt(global), y: (y / metric.minH) * 100 };
}

function roadD(panelIndex: number) {
  const metric = METRICS[panelIndex]!;
  let d = "";
  const steps = 56;
  for (let s = 0; s <= steps; s++) {
    const yFromTop = metric.minH - (metric.minH * s) / steps;
    const global = metric.base + (metric.minH - yFromTop);
    const x = xAt(global);
    const yp = (yFromTop / metric.minH) * 100;
    d += s === 0 ? `M ${x.toFixed(2)} ${yp.toFixed(2)}` : ` L ${x.toFixed(2)} ${yp.toFixed(2)}`;
  }
  return d;
}

function cursorOf(completed: number[], cap: number) {
  for (let id = 1; id <= cap; id++) {
    if (!completed.includes(id) && (id === 1 || completed.includes(id - 1))) return id;
  }
  if (completed.includes(100)) return 101;
  if (cap < 100 && completed.includes(cap)) return cap + 1;
  return 1;
}

function asset(file: string) {
  return `${import.meta.env.BASE_URL}map/${file}`;
}

function pal(id: string, sil = false) {
  return `${import.meta.env.BASE_URL}map/pals/${id}${sil ? "-sil" : ""}.webp`;
}

function panelIndex(spaceId: number) {
  const id = spaceId === 101 ? 100 : spaceId;
  return PANELS.findIndex((panel) => panel.ids.includes(id) || (spaceId === 101 && panel.castle));
}

export function TrailPreview() {
  const go = useSnap((s) => s.go);
  const frame = useRef<HTMLDivElement>(null);
  const cursor = useSnap((s) => cursorOf(s.completed, puzzleCap(s.tier)));
  const hop = useSnap((s) => s.hop);
  useLayoutEffect(() => {
    const root = frame.current;
    const token = root?.querySelector<HTMLElement>("[data-token]");
    const inner = root?.querySelector<HTMLElement>(".trail-shift");
    if (!root || !token || !inner) return;
    inner.style.transform = "translateY(0px)";
    const tr = token.getBoundingClientRect();
    const fr = root.getBoundingClientRect();
    const delta = tr.top + tr.height / 2 - (fr.top + fr.height / 2);
    inner.style.transform = `translateY(${-delta}px)`;
  }, [cursor, hop]);
  return (
    <div className="trail-preview" ref={frame}>
      <div className="trail-shift">
        <TrailWorld mode="peek" />
      </div>
      <button type="button" className="trail-preview-hit" aria-label="Open the tile trail" onClick={() => go("trail")} />
    </div>
  );
}

export function TrailScreen() {
  const go = useSnap((s) => s.go);
  const [far, setFar] = useState(false);
  const worldRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (far) {
      window.scrollTo(0, 0);
      return;
    }
    worldRef.current?.querySelector("[data-token]")?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [far]);
  return (
    <section className={far ? "trail-screen is-far" : "trail-screen"}>
      <button type="button" className="trail-back" aria-label="Back" onClick={() => go("home")}>
        <ArrowLeft />
      </button>
      {far ? null : (
        <button type="button" className="trail-zoom" aria-label="See the whole trail" onClick={() => setFar(true)}>
          <ZoomOut />
        </button>
      )}
      <div
        className="trail-clip"
        onClick={() => {
          if (far) setFar(false);
        }}
      >
        <TrailWorld mode="full" worldRef={worldRef} far={far} />
      </div>
    </section>
  );
}

function TrailWorld({
  mode,
  worldRef,
  far = false,
}: {
  mode: "full" | "peek";
  worldRef?: RefObject<HTMLDivElement | null>;
  far?: boolean;
}) {
  const completed = useSnap((s) => s.completed);
  const badges = useSnap((s) => s.badges);
  const tier = useSnap((s) => s.tier);
  const mascot = useSnap((s) => s.mascot);
  const hop = useSnap((s) => s.hop);
  const clearHop = useSnap((s) => s.clearHop);
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const cap = puzzleCap(tier);
  const cursor = cursorOf(completed, cap);
  const gate = cap < 100 ? cap + 1 : 0;
  const localWorld = useRef<HTMLDivElement>(null);
  const root = worldRef ?? localWorld;
  const [wiggle, setWiggle] = useState(false);
  const [shake, setShake] = useState(0);
  const focus = hop ? [hop.from, hop.to, cursor] : [cursor];
  const visible = new Set<number>();
  if (mode === "peek") {
    for (const id of focus) {
      const index = panelIndex(id);
      if (index >= 0) {
        visible.add(index);
        if (index > 0) visible.add(index - 1);
        if (index < PANELS.length - 1) visible.add(index + 1);
      }
    }
  }

  const placePawn = (spaceId: number) => {
    const world = root.current;
    const el = world?.querySelector<HTMLElement>(`[data-space="${spaceId}"]`);
    const pawn = world?.querySelector<HTMLElement>(".trail-pawn");
    if (!world || !el || !pawn) return;
    let x = el.offsetLeft + el.offsetWidth / 2;
    let y = el.offsetTop + el.offsetHeight / 2;
    let node = el.offsetParent as HTMLElement | null;
    while (node && node !== world) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    pawn.style.left = `${x}px`;
    pawn.style.top = `${y}px`;
    pawn.style.transform = "translate(-50%, -108%)";
  };

  useLayoutEffect(() => {
    placePawn(hop ? hop.from : cursor);
    // The pawn is measured from the stones, which do not change identity between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hop?.from, mode, far]);

  useEffect(() => {
    if (!hop) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      clearHop();
      return;
    }
    const world = root.current;
    const from = world?.querySelector<HTMLElement>(`[data-space="${hop.from}"]`);
    const to = world?.querySelector<HTMLElement>(`[data-space="${hop.to}"]`);
    const pawn = world?.querySelector<HTMLElement>(".trail-pawn");
    if (!world || !from || !to || !pawn) return;
    const wr = world.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const x0 = a.left - wr.left + a.width / 2;
    const y0 = a.top - wr.top + a.height / 2;
    const x1 = b.left - wr.left + b.width / 2;
    const y1 = b.top - wr.top + b.height / 2;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 450);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = x0 + (x1 - x0) * e;
      const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * t) * 32;
      const squash = t > 0.82 ? 1 + Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.16 : 1;
      pawn.style.left = `${x}px`;
      pawn.style.top = `${y}px`;
      pawn.style.transform = `translate(-50%, -108%) scale(1, ${squash.toFixed(3)})`;
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        playTone("place");
        haptic("light");
        clearHop();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hop, clearHop, root]);

  const wobbleGate = () => {
    setShake((n) => n + 1);
    playTone("no");
  };

  const onSpace = (id: number) => {
    if (mode === "peek" || far) return;
    if (id === gate || id > cap) {
      wobbleGate();
      return;
    }
    if (id === cursor || completed.includes(id)) {
      startPuzzle(id);
      return;
    }
    setWiggle(true);
    window.setTimeout(() => setWiggle(false), 420);
  };

  return (
    <div
      ref={root}
      className="trail-world"
      aria-hidden={mode === "peek" ? true : undefined}
    >
      {PANELS.map((panel, index) => {
        if (mode === "peek" && !visible.has(index)) return null;
        const near = Math.abs(index - panelIndex(cursor)) <= 1;
        const metric = METRICS[index]!;
        return (
          <section
            key={panel.id}
            className="trail-panel"
            style={{ ["--seam" as string]: panel.seam, ["--min-h" as string]: `${metric.minH}px` }}
          >
            <img className="trail-bg" src={asset(panel.src)} alt="" decoding="async" loading={near || mode === "peek" ? "eager" : "lazy"} />
            <svg className="trail-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d={roadD(index)} fill="none" stroke="#d9c09a" strokeWidth="72" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={roadD(index)} fill="none" stroke="#f6efe2" strokeWidth="58" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={roadD(index)} fill="none" stroke="#fffaf3" strokeWidth="52" strokeLinecap="butt" strokeDasharray="22 6" vectorEffect="non-scaling-stroke" />
              {panel.ids.map((id, i) => {
                const house = HOUSES[id];
                if (!house) return null;
                const spot = stoneSpot(index, i);
                const side = spot.x >= 50 ? -1 : 1;
                const hx = Math.min(84, Math.max(16, spot.x + side * 34));
                return (
                  <line
                    key={id}
                    x1={spot.x}
                    y1={spot.y}
                    x2={hx}
                    y2={spot.y}
                    stroke="#e7d7b8"
                    strokeWidth="14"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            {panel.clouds ? <img className="trail-cloud" src={asset(panel.id === "peaks" ? "cloud-2.webp" : "cloud-1.webp")} alt="" /> : null}
            {panel.castle ? (
              <div className="trail-castle-slot">
                <i className="trail-castle-glow" />
                <img className="trail-castle" src={asset("landmark-castle.webp")} alt="" />
                <span className="trail-castle-stand" data-space="101" />
              </div>
            ) : null}
            {panel.workshop ? (
              <>
                <img className="trail-tease" src={asset("landmark-castle.webp")} alt="" />
                <img className="trail-workshop" src={asset("landmark-workshop.webp")} alt="" />
                <div className="trail-collection" aria-label="Special badges">
                  {COLLECTION.map((id) => {
                    const on = badges.includes(id);
                    return (
                      <span key={id} className={on ? "is-on" : ""}>
                        <img src={pal(id, !on)} alt="" />
                      </span>
                    );
                  })}
                </div>
              </>
            ) : null}
            {panel.ids.map((id, i) => {
              const spot = stoneSpot(index, i);
              const done = completed.includes(id);
              const locked = id > cap;
              const isGate = id === gate;
              const current = id === cursor;
              const house = HOUSES[id];
              const side = spot.x >= 50 ? -1 : 1;
              const hx = Math.min(84, Math.max(16, spot.x + side * 34));
              const gloss = done
                ? `linear-gradient(160deg, rgb(255 255 255 / 58%), rgb(255 255 255 / 10%)), ${panel.tone}`
                : undefined;
              return (
                <div key={id}>
                  {mode === "peek" ? (
                    <div
                      className={stoneClass(done, current, locked)}
                      data-space={id}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%`, background: gloss }}
                    >
                      <StoneFace id={id} done={done} />
                      {isGate ? <img className="trail-gate" src={asset("gate.webp")} alt="" /> : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={stoneClass(done, current, locked)}
                      data-space={id}
                      aria-label={isGate ? "Locked gate" : current ? `Play puzzle ${id}` : done ? `Replay puzzle ${id}` : `Puzzle ${id}`}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%`, background: gloss }}
                      onClick={() => onSpace(id)}
                    >
                      <StoneFace id={id} done={done} />
                      {isGate ? <img key={shake} className={shake ? "trail-gate is-wobble" : "trail-gate"} src={asset("gate.webp")} alt="" /> : null}
                    </button>
                  )}
                  {house ? (
                    <div className={badges.includes(house) ? "trail-house" : "trail-house is-off"} style={{ left: `${hx}%`, top: `${spot.y}%` }}>
                      <img src={asset(badges.includes(house) ? "house-on.webp" : "house-off.webp")} alt="" />
                      <img className={badges.includes(house) ? "trail-house-pal" : "trail-house-sil"} src={pal(house, !badges.includes(house))} alt="" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        );
      })}
      <div
        className={wiggle ? "trail-pawn is-wiggle" : "trail-pawn"}
        data-token={cursor === 101 ? "finish" : cursor}
        role={mode === "full" ? "button" : undefined}
        tabIndex={mode === "full" ? 0 : undefined}
        aria-label={mode === "peek" ? undefined : cursor === 101 ? "Finish" : cursor === gate ? "Locked gate" : `Play puzzle ${cursor}`}
        onClick={() => {
          if (mode === "peek" || far) return;
          if (cursor === gate || cursor > cap) wobbleGate();
          else if (cursor <= 100) startPuzzle(cursor);
        }}
      >
        <i className="trail-shadow" />
        <svg className="trail-pedestal" viewBox="0 0 80 36" aria-hidden="true">
          <ellipse cx="40" cy="18" rx="34" ry="12" fill="#f4efe6" stroke="#d9c4a0" strokeWidth="4" />
          <ellipse cx="40" cy="16" rx="22" ry="7" fill="#fff" opacity="0.65" />
        </svg>
        <span className="trail-pawn-art">
          <MascotFace id={mascot} cut />
        </span>
      </div>
    </div>
  );
}

function stoneClass(done: boolean, current: boolean, locked: boolean) {
  return ["trail-stone", done ? "is-done" : "", current ? "is-now" : "", locked ? "is-locked" : ""].filter(Boolean).join(" ");
}

function StoneFace({ id, done }: { id: number; done: boolean }) {
  return (
    <>
      <em>{id}</em>
      {done ? (
        <span className="trail-stamp">
          <StickerArt puzzleId={id} />
          <i className="trail-spark" style={{ animationDelay: `${(id % 7) * 0.45}s` }} />
        </span>
      ) : null}
    </>
  );
}
