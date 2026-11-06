import { create } from "zustand";
import { buildBadges, earnedPuzzleBadges } from "./badges";
import { playTone, setMuted } from "./audio";
import { PUZZLES } from "./puzzles";
import { normalizePiece, occupancyKey, pieceKey, pieceLimit, puzzleCap, sameKind, samePiece, type Cutout, type Piece, type Shape, type Tier, type TileColor, type TileKind, type Turn } from "./tiles";
import type { Facing } from "./space";
import { isNativeApp, purchaseNative, restoreNative } from "./native";
import { TEST_UNLOCK } from "./test-mode";

const KEY = "snaptile-v1";

export type SavedBuild = { id: string; name: string; pieces: Piece[]; at: number };
export type View =
  | "onboarding"
  | "home"
  | "free"
  | "puzzles"
  | "play"
  | "celebrate"
  | "badges"
  | "account"
  | "paywall"
  | "privacy"
  | "terms";

type Persisted = {
  onboarded: boolean;
  name: string;
  tier: Tier;
  purchased: Tier | null;
  completed: number[];
  badges: string[];
  saved: SavedBuild[];
  freeBuilds: number;
  freeLimitHits: number;
  noHintStreak: number;
  sound: boolean;
};

type State = Persisted & {
  ready: boolean;
  view: View;
  docBack: View;
  puzzleId: number | null;
  placed: Piece[];
  trayShape: Shape;
  trayColor: TileColor;
  trayCutout: Cutout;
  trayRot: Turn;
  trayFacing: Facing;
  held: TileKind | null;
  selected: number | null;
  hintUsed: boolean;
  hintSpot: string | null;
  notice: string | null;
  fresh: string[];
  offer: "puzzles" | "build" | null;
  hydrate: () => void;
  setName: (name: string) => void;
  finishOnboarding: () => void;
  go: (view: View) => void;
  setSound: (on: boolean) => void;
  choosePlan: (tier: Tier) => void;
  restorePlan: () => void;
  applyNativeTier: (tier: Tier) => void;
  signOut: () => void;
  resetDevice: () => void;
  setTray: (patch: Partial<Pick<State, "trayShape" | "trayColor" | "trayCutout" | "trayRot" | "trayFacing">>) => void;
  setHeld: (held: TileKind | null) => void;
  rotateTray: () => void;
  startPuzzle: (id: number) => void;
  startFree: () => void;
  placeSocket: (piece: Piece) => void;
  placeTarget: (piece: Piece) => void;
  selectPiece: (index: number) => void;
  removeSelected: () => void;
  undoLast: () => void;
  useHint: () => void;
  finishFree: () => void;
  dismissFresh: () => void;
  dismissOffer: () => void;
  saveBuild: () => void;
  loadBuild: (id: string) => void;
  deleteBuild: (id: string) => void;
  clearNotice: () => void;
};

function blank(): Persisted {
  return {
    onboarded: false,
    name: "",
    tier: "free",
    purchased: null,
    completed: [],
    badges: [],
    saved: [],
    freeBuilds: 0,
    freeLimitHits: 0,
    noHintStreak: 0,
    sound: true,
  };
}

function persist(state: Persisted) {
  setMuted(!state.sound);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

function pick(state: State): Persisted {
  return {
    onboarded: state.onboarded,
    name: state.name,
    tier: state.tier,
    purchased: state.purchased,
    completed: state.completed,
    badges: state.badges,
    saved: state.saved,
    freeBuilds: state.freeBuilds,
    freeLimitHits: state.freeLimitHits,
    noHintStreak: state.noHintStreak,
    sound: state.sound,
  };
}

function mergeBadges(current: string[], extra: string[]): string[] {
  return [...new Set([...current, ...extra])];
}

function newcomers(before: string[], after: string[]) {
  return after.filter((id) => !before.includes(id));
}

export const useSnap = create<State>((set, get) => ({
  ...blank(),
  ready: false,
  view: "onboarding",
  docBack: "paywall",
  puzzleId: null,
  placed: [],
  trayShape: "square",
  trayColor: "coral",
  trayCutout: "none",
  trayRot: 0,
  trayFacing: "flat",
  held: null,
  selected: null,
  hintUsed: false,
  hintSpot: null,
  notice: null,
  fresh: [],
  offer: null,

  hydrate: () => {
    let data = blank();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        data = {
          ...blank(),
          ...parsed,
          freeLimitHits: parsed.freeLimitHits ?? 0,
          saved: (parsed.saved ?? []).map((build) => ({
            ...build,
            pieces: build.pieces.map((piece) => normalizePiece(piece)),
          })),
        };
      }
    } catch {
      data = blank();
    }
    setMuted(!data.sound);
    set({ ...data, ready: true, view: data.onboarded ? "home" : "onboarding" });
  },

  setName: (name) => {
    const next = name.slice(0, 16);
    set({ name: next });
    persist({ ...pick(get()), name: next });
  },

  finishOnboarding: () => {
    set({ onboarded: true, view: "home" });
    persist({ ...pick(get()), onboarded: true });
    playTone("tap");
  },

  go: (view) => set({ view, notice: null }),

  setSound: (on) => {
    set({ sound: on });
    persist({ ...pick(get()), sound: on });
  },

  choosePlan: (tier) => {
    const finish = (next: Tier) => {
      const label = next === "yearly" ? "Unlimited Yearly" : next === "master" ? "Master Builder" : next === "builder" ? "Builder" : "Free";
      set({ tier: next, purchased: next, view: "account", notice: `${label} is on for this device.` });
      persist({ ...pick(get()), tier: next, purchased: next });
      playTone("win");
    };
    if (tier !== "free" && isNativeApp()) {
      void purchaseNative(tier)
        .then(finish)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error ?? "");
          if (message.toLowerCase().includes("cancel")) return;
          set({ notice: "The App Store did not finish that purchase." });
        });
      return;
    }
    finish(tier);
  },

  restorePlan: () => {
    if (isNativeApp()) {
      void restoreNative()
        .then((restored) => {
          if (!restored || restored === "free") {
            set({ notice: "No Buildlings purchase was found on this Apple ID." });
            return;
          }
          set({ tier: restored, purchased: restored, notice: "Plan restored on this device." });
          persist({ ...pick(get()), tier: restored, purchased: restored });
        })
        .catch(() => set({ notice: "The App Store did not finish restoring." }));
      return;
    }
    const purchased = get().purchased;
    if (!purchased || purchased === "free") {
      set({ notice: "No plan is saved on this device yet." });
      return;
    }
    set({ tier: purchased, notice: "Plan restored on this device." });
    persist({ ...pick(get()), tier: purchased });
  },

  applyNativeTier: (tier) => {
    set({ tier, purchased: tier === "free" ? null : tier });
    persist({ ...pick(get()), tier, purchased: tier === "free" ? null : tier });
  },

  signOut: () => {
    set({ name: "", view: "onboarding", onboarded: false });
    persist({ ...pick(get()), name: "", onboarded: false });
  },

  resetDevice: () => {
    const fresh = blank();
    set({ ...fresh, ready: true, view: "onboarding", placed: [], puzzleId: null });
    persist(fresh);
  },

  setTray: (patch) => set(patch),

  setHeld: (held) => set({ held, notice: null }),

  rotateTray: () => {
    const current = get().trayRot;
    const steps = get().trayShape === "right" ? 8 : 4;
    set({ trayRot: ((current + 1) % steps) as Turn });
  },

  startPuzzle: (id) => {
    const { tier, completed } = get();
    if (!TEST_UNLOCK && id > puzzleCap(tier)) {
      get().go("paywall");
      return;
    }
    if (!TEST_UNLOCK && id > 1 && !completed.includes(id - 1) && !completed.includes(id)) {
      set({ notice: "Finish the puzzle just before this one first." });
      return;
    }
    set({
      view: "play",
      puzzleId: id,
      placed: [],
      selected: null,
      held: null,
      hintUsed: false,
      hintSpot: null,
      notice: null,
    });
  },

  startFree: () =>
    set({
      view: "free",
      puzzleId: null,
      placed: [],
      selected: null,
      held: null,
      trayFacing: "flat",
      trayShape: "square",
      hintUsed: false,
      hintSpot: null,
      notice: null,
    }),

  placeSocket: (piece) => {
    const state = get();
    if (state.puzzleId || state.trayShape === "right") return;
    const lid = piece.plane === "floor" && piece.y > 0;
    const shape = lid ? "square" : state.trayShape;
    const next = normalizePiece({
      ...piece,
      shape,
      color: state.trayColor,
      cutout: lid ? "none" : shape === "square" ? state.trayCutout : "none",
      rot: piece.plane === "roofx" || piece.plane === "roofz" ? 0 : state.trayRot,
    });
    if (state.placed.some((have) => occupancyKey(have) === occupancyKey(next))) {
      const index = state.placed.findIndex((have) => occupancyKey(have) === occupancyKey(next));
      set({ selected: index });
      return;
    }
    if (state.placed.length >= pieceLimit(state.tier)) {
      set({
        notice:
          state.tier === "master" || state.tier === "yearly"
            ? "This table is full. Take a tile off to add another."
            : "That is every tile in this plan.",
      });
      playTone("no");
      return;
    }
    const placed = [...state.placed, next];
    let freeLimitHits = state.freeLimitHits;
    let offer = state.offer;
    if (state.tier === "free" && pieceLimit(state.tier) === 10 && state.placed.length === 9) {
      freeLimitHits += 1;
      if (freeLimitHits % 5 === 0) offer = "build";
    }
    set({ placed, selected: null, notice: null, freeLimitHits, offer });
    if (freeLimitHits !== state.freeLimitHits) persist({ ...pick(get()), freeLimitHits });
    playTone("place");
  },

  placeTarget: (piece) => {
    const state = get();
    const puzzle = PUZZLES.find((item) => item.id === state.puzzleId);
    if (!puzzle) return;
    if (!state.held) {
      set({ notice: "Pick a tile first." });
      playTone("no");
      return;
    }
    if (!sameKind(state.held, piece)) {
      set({ notice: "That spot needs a different tile." });
      playTone("no");
      return;
    }
    const match = puzzle.pieces.find((target) => samePiece(target, piece));
    if (!match || state.placed.some((have) => samePiece(have, match))) {
      playTone("no");
      return;
    }
    const placed = [...state.placed, match];
    const more = puzzle.pieces.some((target) => sameKind(target, match) && !placed.some((have) => samePiece(have, target)));
    const hintSpot = state.hintSpot === pieceKey(match) ? null : state.hintSpot;
    if (placed.length === puzzle.pieces.length) {
      const completed = state.completed.includes(puzzle.id) ? state.completed : [...state.completed, puzzle.id];
      const noHintStreak = state.hintUsed ? 0 : state.noHintStreak + 1;
      let badges = mergeBadges(state.badges, earnedPuzzleBadges(completed));
      if (noHintStreak >= 3) badges = mergeBadges(badges, ["turtle"]);
      const fresh = newcomers(state.badges, badges);
      const offer = puzzle.id === 10 && !state.completed.includes(10) && state.tier === "free" ? "puzzles" : state.offer;
      set({ placed, held: null, completed, noHintStreak, badges, fresh, view: "celebrate", notice: null, offer });
      persist({ ...pick(get()), completed, noHintStreak, badges });
      playTone("win");
      return;
    }
    set({ placed, held: more ? state.held : null, notice: null, selected: null, hintSpot });
    playTone("place");
  },

  selectPiece: (index) => {
    set({ selected: index, notice: null });
    playTone("tap");
  },

  removeSelected: () => {
    const { selected, placed } = get();
    if (selected == null) return;
    set({ placed: placed.filter((_, i) => i !== selected), selected: null });
    playTone("tap");
  },

  undoLast: () => {
    const { placed } = get();
    if (placed.length === 0) return;
    set({ placed: placed.slice(0, -1), selected: null, notice: null });
    playTone("tap");
  },

  useHint: () => {
    const state = get();
    const puzzle = PUZZLES.find((item) => item.id === state.puzzleId);
    const next = puzzle?.pieces.find((target) => !state.placed.some((have) => samePiece(have, target)));
    if (!next) return;
    set({
      hintUsed: true,
      hintSpot: pieceKey(next),
      held: { shape: next.shape, color: next.color, cutout: next.cutout },
      notice: "That tile is selected. Tap its white spot.",
    });
    playTone("tap");
  },

  finishFree: () => {
    const state = get();
    if (state.placed.length < 3) {
      set({ notice: "Add at least 3 tiles first." });
      return;
    }
    const freeBuilds = state.freeBuilds + 1;
    let badges = mergeBadges(state.badges, buildBadges(state.placed, state.tier));
    if (freeBuilds >= 5) badges = mergeBadges(badges, ["monkey"]);
    const fresh = newcomers(state.badges, badges);
    set({ freeBuilds, badges, fresh, view: "celebrate", puzzleId: null });
    persist({ ...pick(get()), freeBuilds, badges });
    playTone("win");
  },

  dismissFresh: () => set((state) => ({ fresh: state.fresh.slice(1) })),

  dismissOffer: () => set({ offer: null }),

  saveBuild: () => {
    const state = get();
    if (!TEST_UNLOCK && state.tier === "free") {
      get().go("paywall");
      return;
    }
    if (state.placed.length < 1) return;
    const saved: SavedBuild = {
      id: `${Date.now()}`,
      name: state.name ? `${state.name}'s build` : "My build",
      pieces: state.placed,
      at: Date.now(),
    };
    const next = [saved, ...state.saved].slice(0, 12);
    set({ saved: next, notice: "Saved on this device." });
    persist({ ...pick(get()), saved: next });
    playTone("tap");
  },

  loadBuild: (id) => {
    const found = get().saved.find((b) => b.id === id);
    if (!found) return;
    set({ view: "free", puzzleId: null, placed: found.pieces, selected: null, notice: null });
  },

  deleteBuild: (id) => {
    const saved = get().saved.filter((build) => build.id !== id);
    set({ saved });
    persist({ ...pick(get()), saved });
    playTone("tap");
  },

  clearNotice: () => set({ notice: null }),
}));
