/**
 * Small, original Web Audio material palette for the duel stage.
 * Plays only after a user gesture unlocks AudioContext. No samples or network.
 */
export type DuelCue = "land" | "rise" | "gain" | "loss" | "impact" | "victory" | "defeat" | "draw";
let audio: AudioContext | null = null;

export function unlockDuelAudio(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    // Audio is optional; unavailable or blocked hardware must never block play.
  }
}

function note(ctx: AudioContext, time: number, from: number, to: number,
  duration: number, level: number, waveform: OscillatorType = "sine"): void {
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(from, time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), time + duration);
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(level, time + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(amp).connect(ctx.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
}

function material(ctx: AudioContext, time: number, duration: number,
  level: number, cutoff: number): void {
  const count = Math.max(1, Math.round(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let seed = 31891;
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    samples[i] = ((seed >>> 8) / 8388608 - 1) * (1 - i / count);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  amp.gain.setValueAtTime(Math.max(0.0001, level), time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start(time);
  source.stop(time + duration);
}

export function playDuelCue(cue: DuelCue, enabled: boolean): void {
  if (!enabled || !audio || audio.state !== "running") return;
  const ctx = audio;
  const t = ctx.currentTime + 0.008;
  try {
    switch (cue) {
      case "land":
        material(ctx, t, 0.095, 0.085, 480);
        note(ctx, t, 98, 52, 0.16, 0.11, "triangle");
        break;
      case "rise":
        note(ctx, t, 176, 222, 0.24, 0.022, "sine");
        break;
      case "gain":
        note(ctx, t, 440, 660, 0.36, 0.045, "sine");
        note(ctx, t + 0.07, 660, 880, 0.40, 0.022, "sine");
        break;
      case "loss":
        material(ctx, t, 0.14, 0.035, 420);
        note(ctx, t, 168, 76, 0.37, 0.065, "triangle");
        break;
      case "impact":
        material(ctx, t, 0.18, 0.095, 790);
        note(ctx, t, 146, 55, 0.32, 0.12, "triangle");
        break;
      case "victory":
        note(ctx, t, 330, 330, 0.31, 0.037);
        note(ctx, t + 0.12, 495, 495, 0.52, 0.042);
        break;
      case "defeat":
        note(ctx, t, 248, 184, 0.52, 0.048, "triangle");
        break;
      case "draw":
        note(ctx, t, 264, 264, 0.38, 0.026);
        note(ctx, t, 396, 396, 0.37, 0.013);
        break;
    }
  } catch {
    // Never let audio-device exceptions affect a match.
  }
}
