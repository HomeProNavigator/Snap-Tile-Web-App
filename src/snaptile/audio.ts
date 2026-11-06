let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(next: boolean) {
  muted = next;
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(context: AudioContext, freq: number, type: OscillatorType, dur: number, vol: number, when: number, slide = 1) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), when + dur);
  gain.gain.setValueAtTime(Math.max(0.0001, vol), when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playNotes(freqs: number[]) {
  const context = audio();
  if (!context) return;
  const now = context.currentTime;
  freqs.forEach((freq, i) => tone(context, freq, "sine", 0.16, 0.045, now + i * 0.12));
}

export function playTone(kind: "place" | "win" | "tap" | "no" | "pop") {
  const context = audio();
  if (!context) return;
  const now = context.currentTime;
  if (kind === "place") {
    tone(context, 1800, "square", 0.035, 0.03, now, 0.45);
    tone(context, 140, "sine", 0.09, 0.07, now);
    return;
  }
  if (kind === "pop") {
    tone(context, 880, "triangle", 0.08, 0.05, now, 1.6);
    return;
  }
  if (kind === "no") {
    tone(context, 180, "sine", 0.16, 0.04, now, 0.7);
    return;
  }
  const notes = kind === "win" ? [523, 659, 784] : [440];
  notes.forEach((freq, i) => tone(context, freq, "sine", 0.16, 0.04, now + i * 0.08));
}