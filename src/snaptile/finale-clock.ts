/** Ephemeral celebration flags read by the 3D scene every frame. Not saved. */
export const clock = {
  on: false,
  punch: false,
  flashUntil: 0,
  lit: 0,
  stage: false,
  spin: false,
  pedestal: "#ffb20a",
  floor: 1,
  clear: false,
  reduced: false,
};

export function armWin(opts: { punch: boolean }) {
  clock.on = true;
  clock.punch = opts.punch;
  clock.flashUntil = 0;
  clock.lit = 0;
  clock.stage = false;
  clock.spin = false;
  clock.floor = 1;
  clock.clear = false;
  clock.reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resetClock() {
  clock.on = false;
  clock.punch = false;
  clock.flashUntil = 0;
  clock.lit = 0;
  clock.stage = false;
  clock.spin = false;
  clock.pedestal = "#ffb20a";
  clock.floor = 1;
  clock.clear = false;
  clock.reduced = false;
}
