type Sfx = "move" | "capture" | "check" | "castle" | "promote" | "end" | "illegal";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    master.gain.value = 0.9;
    sfxBus.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (master && ctx) {
    master.gain.setTargetAtTime(value ? 0.9 : 0, ctx.currentTime, 0.02);
  }
}

export function unlockAudio() {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume();
  }
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain = 0.12,
  delay = 0,
) {
  const audio = getCtx();
  if (!audio || !sfxBus || !enabled) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency * (0.97 + Math.random() * 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g);
  g.connect(sfxBus);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

export function playSfx(kind: Sfx) {
  if (!enabled) return;
  unlockAudio();
  switch (kind) {
    case "move":
      tone(190, 0.09, "triangle", 0.1);
      tone(820, 0.04, "sine", 0.04);
      break;
    case "capture":
      tone(110, 0.16, "square", 0.08);
      tone(70, 0.18, "sawtooth", 0.05);
      break;
    case "check":
      tone(520, 0.14, "sine", 0.08);
      tone(780, 0.16, "triangle", 0.06, 0.05);
      break;
    case "castle":
      tone(190, 0.08, "triangle", 0.08);
      tone(240, 0.1, "triangle", 0.08, 0.08);
      break;
    case "promote":
      tone(440, 0.12, "sine", 0.07);
      tone(660, 0.16, "triangle", 0.06, 0.06);
      tone(880, 0.18, "sine", 0.04, 0.12);
      break;
    case "end":
      tone(330, 0.28, "sine", 0.08);
      tone(392, 0.32, "triangle", 0.06, 0.04);
      tone(494, 0.4, "sine", 0.05, 0.1);
      break;
    case "illegal":
      tone(90, 0.12, "square", 0.05);
      break;
  }
}
