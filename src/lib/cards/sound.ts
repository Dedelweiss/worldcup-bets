/**
 * Sons synthétisés en Web Audio (aucun fichier à charger, < 0 ko, hors-ligne).
 * Déclenchés uniquement sur geste utilisateur (ouverture de pack), respecte le mute.
 */

const MUTE_KEY = "cards-muted";

let ctx: AudioContext | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isMuted(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

const muteListeners = new Set<() => void>();

export function setMuted(value: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Stockage indisponible : on ignore.
  }
  muteListeners.forEach((cb) => cb());
}

/** Abonnement pour useSyncExternalStore (toggle mute réactif). */
export function subscribeMuted(cb: () => void): () => void {
  muteListeners.add(cb);
  return () => {
    muteListeners.delete(cb);
  };
}

export function getMutedSnapshot(): boolean {
  return isMuted();
}

export function getMutedServerSnapshot(): boolean {
  return false;
}

function getCtx(): AudioContext | null {
  if (!isBrowser()) return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

let noiseBuffer: AudioBuffer | null = null;

function getNoise(audio: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(audio.sampleRate * 0.4);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function playNoise(
  audio: AudioContext,
  duration: number,
  freq: number,
  q: number,
  gain: number,
): void {
  const src = audio.createBufferSource();
  src.buffer = getNoise(audio);
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = audio.createGain();
  const now = audio.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(g).connect(audio.destination);
  src.start(now);
  src.stop(now + duration);
}

function playTone(
  audio: AudioContext,
  from: number,
  to: number,
  duration: number,
  gain: number,
): void {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  const now = audio.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/** À appeler dans le geste utilisateur (clic) pour débloquer l'audio mobile. */
export function primeSound(): void {
  if (isMuted()) return;
  const audio = getCtx();
  if (audio && audio.state === "suspended") void audio.resume();
}

export type CardSound = "burst" | "stick" | "shine" | "cash";

export function playSound(name: CardSound): void {
  if (isMuted()) return;
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  switch (name) {
    case "burst":
      playNoise(audio, 0.22, 320, 0.8, 0.22);
      break;
    case "stick":
      playNoise(audio, 0.08, 1800, 6, 0.18);
      break;
    case "shine":
      playTone(audio, 620, 1280, 0.18, 0.06);
      break;
    case "cash":
      playTone(audio, 880, 1320, 0.08, 0.07);
      playTone(audio, 520, 780, 0.12, 0.05);
      break;
  }
}
