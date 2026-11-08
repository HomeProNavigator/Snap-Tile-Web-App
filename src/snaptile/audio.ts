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

const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
const voiceFiles = import.meta.glob("../../public/voice/*.{m4a,mp3}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const sfxFiles = import.meta.glob("../../public/sfx/*.{m4a,mp3}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
let duck = 1;
let voiceStop: (() => void) | null = null;
let lastPraise = -1;

const PRAISE: [string, string][] = [
  ["praise-01", "You did it!"],
  ["praise-02", "Amazing building!"],
  ["praise-03", "Snap-tastic!"],
  ["praise-04", "Wow, look at that!"],
  ["praise-05", "Super builder!"],
  ["praise-06", "That's perfect!"],
  ["praise-07", "You're a building star!"],
  ["praise-08", "Hooray!"],
  ["praise-09", "What a build!"],
  ["praise-10", "Brilliant!"],
  ["praise-11", "Woo-hoo!"],
  ["praise-12", "Nailed it!"],
];

function setDuck(next: number) {
  duck = next;
}

function packed(map: Record<string, string>, name: string) {
  const hit = Object.entries(map).find(([path]) => path.endsWith(`/${name}.m4a`) || path.endsWith(`/${name}.mp3`));
  return hit?.[1] ?? null;
}

function noise(context: AudioContext, dur: number, vol: number, when: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * dur));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(380, when);
  filter.frequency.exponentialRampToValueAtTime(2400, when + dur * 0.8);
  const gain = context.createGain();
  gain.gain.setValueAtTime(vol, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(when);
  source.stop(when + dur + 0.02);
}

export function playSfx(name: "bigSnap" | "tileNote" | "fanfare" | "whoosh" | "thunk" | "shimmer", opts?: { note?: number; size?: "big" | "long" }) {
  const url = packed(sfxFiles, name);
  if (url) {
    const clip = new Audio(url);
    clip.volume = name === "fanfare" ? 0.7 * duck : 0.8;
    void clip.play().catch(() => undefined);
    return;
  }
  const context = audio();
  if (!context) return;
  const now = context.currentTime;
  if (name === "bigSnap") {
    tone(context, 2200, "square", 0.03, 0.035, now, 0.4);
    tone(context, 160, "triangle", 0.1, 0.05, now);
    tone(context, 78, "sine", 0.32, 0.1, now, 0.45);
    return;
  }
  if (name === "tileNote") {
    const freq = SCALE[(opts?.note ?? 0) % SCALE.length]!;
    tone(context, freq, "triangle", 0.16, 0.055, now);
    tone(context, freq * 2, "sine", 0.07, 0.018, now);
    return;
  }
  if (name === "whoosh") {
    noise(context, 0.32, 0.045, now);
    return;
  }
  if (name === "thunk") {
    tone(context, 196, "sine", 0.14, 0.08, now, 0.42);
    tone(context, 90, "triangle", 0.18, 0.04, now, 0.5);
    return;
  }
  if (name === "shimmer") {
    [1760, 2093, 2637, 3136].forEach((freq, i) => tone(context, freq, "sine", 0.18, 0.02, now + i * 0.045));
    return;
  }
  const level = (opts?.size === "big" ? 0.055 : 0.04) * duck;
  const hold = opts?.size === "long" ? 2.1 : opts?.size === "big" ? 1.5 : 1.05;
  const chord = opts?.size === "big" ? [392, 523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99, 1046.5];
  chord.forEach((freq, i) => tone(context, freq, "triangle", 0.22, level, now + i * 0.07));
  chord.forEach((freq) => tone(context, freq, "sine", hold, level * 0.7, now + 0.28));
}

function bestVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return (
    en.find((voice) => /premium/i.test(voice.name)) ??
    en.find((voice) => /enhanced/i.test(voice.name)) ??
    en.find((voice) => voice.lang.toLowerCase() === "en-us" && !/compact/i.test(voice.name)) ??
    en.find((voice) => voice.lang.toLowerCase() === "en-us") ??
    en[0] ??
    null
  );
}

function speak(line: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    setDuck(1);
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(line);
  utter.rate = 0.95;
  utter.pitch = 1.05;
  const voice = bestVoice();
  if (voice) utter.voice = voice;
  const done = () => setDuck(1);
  utter.onend = done;
  utter.onerror = done;
  voiceStop = () => {
    window.speechSynthesis?.cancel();
    setDuck(1);
  };
  window.speechSynthesis.speak(utter);
}

async function playVoice(file: string, line: string) {
  if (muted) {
    setDuck(1);
    return;
  }
  const url = packed(voiceFiles, file);
  if (url) {
    const clip = new Audio(url);
    clip.volume = 0.9;
    voiceStop = () => {
      clip.pause();
      setDuck(1);
    };
    clip.onended = () => setDuck(1);
    try {
      await clip.play();
      return;
    } catch {
      /* fall through to speech */
    }
  }
  speak(line);
}

export function stopVoice() {
  voiceStop?.();
  voiceStop = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  setDuck(1);
}

export function speakPraise(name: string) {
  if (muted) return;
  setDuck(0.6);
  let pick = Math.floor(Math.random() * PRAISE.length);
  if (pick === lastPraise) pick = (pick + 1) % PRAISE.length;
  lastPraise = pick;
  const [file, line] = PRAISE[pick]!;
  const spoken = name.trim() ? `Great job, ${name.trim()}!` : line;
  void playVoice(file, spoken);
}

export function speakClip(file: string, line: string) {
  if (muted) return;
  setDuck(0.6);
  void playVoice(file, line);
}