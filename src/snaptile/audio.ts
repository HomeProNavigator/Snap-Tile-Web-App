let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(next: boolean) {
  muted = next;
}

export function playTone(kind: "place" | "win" | "tap" | "no") {
  if (muted || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  ctx ??= new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  const notes = kind === "win" ? [523, 659, 784] : kind === "no" ? [196] : kind === "tap" ? [440] : [587];
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02 + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18 + i * 0.08);
    osc.connect(gain);
    gain.connect(ctx!.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + 0.22 + i * 0.08);
  });
}
