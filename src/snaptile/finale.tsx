import { useEffect, useRef, useState } from "react";
import { ArrowBigRight, Home, Map, RotateCcw } from "lucide-react";
import { nextBuddy } from "./badges";
import { playSfx, speakClip, speakPraise, stopVoice } from "./audio";
import { clock } from "./finale-clock";
import { haptic } from "./haptics";
import { zoneFor } from "./zones";
import { PUZZLES } from "./puzzles";
import { STICKER_NAMES } from "./stickers";
import { useSnap, type Win } from "./store";

function stickerFor(puzzleId: number) {
  return STICKER_NAMES[(puzzleId - 1) % STICKER_NAMES.length]!;
}

type Burst = { id: number; kind: "fan" | "sides" | "buddy" | "soft" | "small" };

export type FinaleShow = {
  hudOut: boolean;
  stage: boolean;
  banner: boolean;
  mascot: boolean;
  idle: boolean;
  reward: boolean;
  buddy: boolean;
  castle: boolean;
  buttons: boolean;
  fireworks: boolean;
  skippable: boolean;
  swept: boolean;
  bursts: Burst[];
};

const BLANK: FinaleShow = {
  hudOut: false,
  stage: false,
  banner: false,
  mascot: false,
  idle: false,
  reward: false,
  buddy: false,
  castle: false,
  buttons: false,
  fireworks: false,
  skippable: false,
  swept: false,
  bursts: [],
};

function base() {
  return import.meta.env.BASE_URL;
}

function pal(id: string) {
  return id === "cub" ? `${base()}mascots/cub.webp` : `${base()}map/pals/${id}.webp`;
}

export function useFinale(win: Win | null) {
  const [show, setShow] = useState<FinaleShow>(BLANK);
  const skipRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!win) {
      setShow(BLANK);
      stopVoice();
      skipRef.current = () => undefined;
      return;
    }
    const reduced = clock.reduced;
    const zone = zoneFor(win.puzzleId ?? 1);
    clock.pedestal = win.kind === "puzzle" ? zone.tone : "#ffb20a";
    const urls = [`${base()}celebrate/banner.webp`, `${base()}celebrate/medal.webp`, `${base()}celebrate/sparkle.webp`, pal(useSnap.getState().mascot)];
    if (win.kind === "puzzle") urls.push(zone.src, `${base()}celebrate/stickers/${stickerFor(win.puzzleId ?? 1)}.webp`);
    if (win.buddy) urls.push(`${base()}map/house-on.webp`, pal(win.buddy), pal(win.from));
    if (win.puzzleId === 100) urls.push(`${base()}map/landmark-castle.webp`);
    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }

    const timers: number[] = [];
    let burstId = 0;
    let skipped = false;
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, reduced ? Math.round(ms * 0.65) : ms));
    };
    const burst = (kind: Burst["kind"]) => {
      if (skipped) return;
      const next = reduced ? "soft" : kind;
      burstId += 1;
      const item = { id: burstId, kind: next };
      setShow((prev) => ({ ...prev, bursts: [...prev.bursts, item] }));
    };
    const patch = (partial: Partial<FinaleShow>) => {
      if (skipped) return;
      setShow((prev) => ({ ...prev, ...partial }));
    };

    const settled = (): FinaleShow => ({
      hudOut: true,
      stage: true,
      banner: true,
      mascot: win.kind === "free" || !win.replay,
      idle: true,
      reward: win.kind === "puzzle" && !win.replay,
      buddy: Boolean(win.buddy),
      castle: win.puzzleId === 100 && !win.replay,
      buttons: true,
      fireworks: false,
      skippable: false,
      swept: true,
      bursts: [],
    });

    const showLive = { skippable: false, buttons: false };
    const finish = () => {
      clock.stage = true;
      clock.clear = true;
      clock.floor = 0;
      clock.lit = 999;
      clock.punch = false;
      clock.spin = !reduced;
      setShow((prev) => ({ ...settled(), bursts: prev.bursts, swept: false }));
    };
    skipRef.current = () => {
      if (skipped || !showLive.skippable || showLive.buttons) return;
      skipped = true;
      for (const id of timers) window.clearTimeout(id);
      stopVoice();
      clock.flashUntil = 0;
      setShow(settled());
      clock.stage = true;
      clock.clear = true;
      clock.floor = 0;
      clock.lit = 999;
      clock.punch = false;
      clock.spin = !reduced;
    };

    if (win.kind === "free") {
      at(80, () => {
        clock.stage = true;
        clock.clear = true;
        clock.floor = 0;
        patch({ hudOut: true, stage: true, skippable: true });
        showLive.skippable = true;
        playSfx("whoosh");
      });
      at(280, () => {
        clock.lit = 999;
        burst("small");
      });
      at(460, () => patch({ banner: true }));
      at(700, () => patch({ mascot: true }));
      at(reduced ? 1100 : 1500, () => patch({ idle: true }));
      at(reduced ? 1300 : 1800, () => {
        showLive.buttons = true;
        finish();
      });
    } else if (win.replay) {
      at(220, () => {
        if (!reduced) clock.flashUntil = performance.now() + 120;
        haptic("strong");
        playSfx("bigSnap");
      });
      at(360, () => {
        clock.floor = 0;
        patch({ hudOut: true });
        playSfx("whoosh");
      });
      at(560, () => {
        clock.stage = true;
        clock.clear = true;
        patch({ stage: true, skippable: true });
        showLive.skippable = true;
      });
      at(760, () => {
        clock.lit = 999;
        burst("small");
      });
      at(900, () => patch({ banner: true }));
      at(reduced ? 1400 : 2000, () => {
        showLive.buttons = true;
        finish();
      });
    } else {
      const count = Math.max(1, useSnap.getState().placed.length);
      at(220, () => {
        if (!reduced) clock.flashUntil = performance.now() + 120;
        haptic("strong");
        playSfx("bigSnap");
      });
      at(360, () => {
        clock.floor = 0;
        patch({ hudOut: true });
        playSfx("whoosh");
      });
      at(600, () => {
        clock.stage = true;
        clock.clear = true;
        patch({ stage: true, skippable: true });
        showLive.skippable = true;
      });
      const step = Math.min(140, 700 / count);
      for (let i = 0; i < count; i++) {
        at(700 + i * step, () => {
          clock.lit = i + 1;
          playSfx("tileNote", { note: i });
        });
      }
      at(1400, () => {
        clock.lit = count;
        speakPraise(useSnap.getState().name);
        playSfx("fanfare");
        burst("fan");
      });
      at(1600, () => {
        patch({ banner: true });
        playSfx("whoosh");
      });
      at(2000, () => {
        patch({ mascot: true });
        burst("sides");
        if (win.hintFree) speakClip("nohint", "And you did it all by yourself!");
      });
      at(2700, () => patch({ idle: true }));
      at(2800, () => {
        patch({ reward: true, buddy: Boolean(win.buddy) });
        playSfx("thunk");
        haptic("light");
        if (win.hintFree) playSfx("shimmer");
        if (win.buddy) {
          burst("buddy");
          speakClip("buddy", "You found a new buddy!");
          playSfx("fanfare", { size: "big" });
        }
      });
      let settleAt = win.buddy ? 5300 : 3800;
      if (win.puzzleId === 100) {
        const castleAt = settleAt;
        at(castleAt, () => {
          patch({ castle: true, fireworks: !reduced });
          playSfx("fanfare", { size: "long" });
          speakClip("finale", "You finished the whole Tile Trail! You're a Master Builder!");
        });
        settleAt = castleAt + (reduced ? 800 : 4000);
      }
      at(settleAt, () => {
        showLive.buttons = true;
        finish();
      });
    }

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [win]);

  return { show, skip: () => skipRef.current() };
}

const COLORS = ["#ff5c45", "#ffb20a", "#2fce78", "#3aa0ff", "#a86bff", "#ff62b3"];

type Bit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  s: number;
  color: string;
  tri: boolean;
  life: number;
  max: number;
  grav: number;
};

function pushBurst(bits: Bit[], kind: string, w: number, h: number) {
  const soft = kind === "soft";
  const count = Math.min(80 - bits.length, soft ? 8 : kind === "sides" ? 25 : kind === "buddy" ? 40 : kind === "small" ? 25 : 50);
  for (let i = 0; i < count; i++) {
    const side = kind === "sides";
    const fromLeft = i < count / 2;
    const fan = (i / Math.max(1, count) - 0.5) * 2;
    const speed = soft ? 50 + Math.random() * 40 : 260 + Math.random() * 380;
    bits.push({
      x: side ? (fromLeft ? 18 : w - 18) : w * 0.5 + fan * w * 0.12,
      y: h * (side ? 0.46 : 0.4),
      vx: side ? (fromLeft ? 1 : -1) * (70 + Math.random() * 200) : fan * speed * 0.8,
      vy: soft ? -20 - Math.random() * 30 : -speed * (0.45 + Math.random() * 0.45),
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * (soft ? 1.5 : 7),
      s: soft ? 9 : [11, 16, 22][i % 3]!,
      color: COLORS[i % COLORS.length]!,
      tri: i % 2 === 0,
      life: 0,
      max: soft ? 2.4 : 2.5 + Math.random() * 0.4,
      grav: soft ? 30 : 920,
    });
  }
}

function boom(bits: Bit[], w: number, h: number) {
  const x = w * (0.18 + Math.random() * 0.64);
  const y = h * (0.12 + Math.random() * 0.32);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
  for (let i = 0; i < 8 && bits.length < 80; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.2;
    const speed = 90 + Math.random() * 150;
    bits.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: 0,
      vr: (Math.random() - 0.5) * 6,
      s: 7,
      color,
      tri: i % 2 === 0,
      life: 0,
      max: 1.15,
      grav: 180,
    });
  }
}

export function Confetti({ bursts, fireworks, swept }: { bursts: Burst[]; fireworks: boolean; swept: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bits = useRef<Bit[]>([]);
  const seen = useRef(0);
  const raf = useRef(0);
  const running = useRef(false);

  const pump = () => {
    if (running.current) return;
    running.current = true;
    let last = performance.now();
    const loop = (now: number) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        running.current = false;
        return;
      }
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const next: Bit[] = [];
      for (const bit of bits.current) {
        bit.life += dt;
        if (bit.life >= bit.max) continue;
        bit.vy += bit.grav * dt;
        bit.vx *= 1 - 0.9 * dt;
        bit.vy *= 1 - 0.25 * dt;
        bit.x += bit.vx * dt;
        bit.y += bit.vy * dt;
        bit.rot += bit.vr * dt;
        const fade = Math.max(0, 1 - bit.life / bit.max);
        ctx.save();
        ctx.translate(bit.x, bit.y);
        ctx.rotate(bit.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = bit.color;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (bit.tri) {
          ctx.moveTo(0, -bit.s);
          ctx.lineTo(bit.s * 0.9, bit.s * 0.72);
          ctx.lineTo(-bit.s * 0.9, bit.s * 0.72);
        } else {
          ctx.rect(-bit.s / 2, -bit.s / 2, bit.s, bit.s);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        next.push(bit);
      }
      bits.current = next;
      if (next.length) raf.current = requestAnimationFrame(loop);
      else running.current = false;
    };
    raf.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (swept) bits.current = [];
  }, [swept]);

  useEffect(() => {
    const fresh = bursts.slice(seen.current);
    seen.current = bursts.length;
    const canvas = ref.current;
    if (!fresh.length || !canvas) return;
    const w = canvas.clientWidth || 390;
    const h = canvas.clientHeight || 700;
    for (const item of fresh) pushBurst(bits.current, item.kind, w, h);
    pump();
  }, [bursts]);

  useEffect(() => {
    if (!fireworks) return;
    const id = window.setInterval(() => {
      const canvas = ref.current;
      boom(bits.current, canvas?.clientWidth || 390, canvas?.clientHeight || 700);
      pump();
    }, 340);
    const stop = window.setTimeout(() => window.clearInterval(id), 4000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [fireworks]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return <canvas ref={ref} className="finale-confetti" aria-hidden="true" />;
}

export function FinaleOverlay({ win, show, onSkip }: { win: Win; show: FinaleShow; onSkip: () => void }) {
  const name = useSnap((s) => s.name).trim();
  const startPuzzle = useSnap((s) => s.startPuzzle);
  const startFree = useSnap((s) => s.startFree);
  const clearWin = useSnap((s) => s.clearWin);
  const go = useSnap((s) => s.go);
  const puzzle = win.puzzleId ? PUZZLES.find((item) => item.id === win.puzzleId) : null;
  const next = puzzle && puzzle.id < 100 ? puzzle.id + 1 : null;
  const progress = win.kind === "puzzle" && puzzle && !win.replay && !win.buddy ? nextBuddy(puzzle.id) : null;
  const line1 = win.kind === "free" ? (name ? `Nice build, ${name}!` : "Nice build!") : puzzle ? `${puzzle.name}!` : "Nice build!";
  const line2 = win.kind === "free" ? "" : win.replay ? "Built again!" : name ? `Great job, ${name}!` : "You did it!";
  const hero = show.buttons && win.buddy ? win.buddy : win.from;
  const leaving = Boolean(show.buddy && win.buddy && !show.buttons);
  const buddyLine = win.buddyAnimal ?? "";

  return (
    <div className={`finale-overlay ${show.skippable && !show.buttons ? "is-live" : ""}`} onClick={onSkip}>
      <Confetti bursts={show.bursts} fireworks={show.fireworks} swept={show.swept} />
      {show.banner ? (
        <div className="finale-banner is-in">
          <img src={`${base()}celebrate/banner.webp`} alt="" />
          <div className="finale-banner-copy">
            <strong>{line1}</strong>
            {line2 ? <span>{line2}</span> : null}
            {show.buddy && buddyLine ? <em>{buddyLine}!</em> : null}
          </div>
        </div>
      ) : null}
      {show.mascot ? (
        <div className={`finale-mascot ${leaving ? "is-off" : show.idle ? "is-idle" : "is-in"}`}>
          <img src={pal(hero)} alt="" />
          {show.idle || leaving ? null : <i className="finale-dust" />}
        </div>
      ) : null}
      {show.reward ? (
        <div className="finale-rewards">
          {puzzle ? <img className="finale-sticker is-stamp" src={`${base()}celebrate/stickers/${stickerFor(puzzle.id)}.webp`} alt="" /> : null}
          {win.hintFree ? (
            <div className="finale-medal-wrap">
              <img className="finale-medal is-in" src={`${base()}celebrate/medal.webp`} alt="" />
              <em>All by yourself!</em>
            </div>
          ) : null}
          {show.buddy && win.buddy ? (
            <div className="finale-buddy">
              <img className="house" src={`${base()}map/house-on.webp`} alt="" />
              <img className="old" src={pal(win.from)} alt="" />
              <img className="next" src={pal(win.buddy)} alt="" />
            </div>
          ) : null}
          {progress ? (
            <div className="finale-progress">
              <img src={`${base()}map/pals/${progress.id}-sil.webp`} alt="" />
              <div className="finale-dots">
                {Array.from({ length: progress.to - progress.from + 1 }, (_, index) => {
                  const id = progress.from + index;
                  const on = puzzle ? id <= puzzle.id : false;
                  return <i key={id} className={on ? (puzzle && id === puzzle.id ? "is-pop" : "is-on") : ""} />;
                })}
              </div>
              <p>{progress.left} more to your next buddy</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {show.buttons ? (
        win.kind === "free" ? (
          <div className="finale-actions is-free" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="finale-btn" aria-label="Keep building" onClick={clearWin}>
              Keep building
            </button>
            <button type="button" className="finale-btn is-next" aria-label="New build" onClick={startFree}>
              New build
            </button>
            <button type="button" className="finale-btn" aria-label="Home" onClick={() => go("home")}>
              <Home />
            </button>
          </div>
        ) : (
          <div className="finale-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="finale-btn" aria-label="Replay" onClick={() => puzzle && startPuzzle(puzzle.id)}>
              <RotateCcw />
            </button>
            {next ? (
              <button type="button" className="finale-btn is-next" aria-label="Next puzzle" onClick={() => startPuzzle(next)}>
                <ArrowBigRight />
              </button>
            ) : (
              <button type="button" className="finale-btn is-next" aria-label="Home" onClick={() => go("home")}>
                <Home />
              </button>
            )}
            <button type="button" className="finale-btn" aria-label="Tile Trail" onClick={() => go("trail")}>
              <Map />
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
