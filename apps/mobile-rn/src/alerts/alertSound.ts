import { Platform, Vibration } from 'react-native';
import { ALERT_BEEP_DATA_URI } from './beepData';

type AnyAudioContext = AudioContext;

let sharedCtx: AnyAudioContext | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let primed = false;
let lastError: string | null = null;
let lastStatus: string = 'idle';

function getAudioContextCtor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function ensureContext(): AnyAudioContext | null {
  const AC = getAudioContextCtor();
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Loud siren whoops (fallback when HTML WAV unavailable). */
function scheduleTones(ctx: AnyAudioContext): void {
  const now = ctx.currentTime;
  // 4 high-low bursts — emergency feel
  const bursts = [
    { f: 1500, start: 0.0, dur: 0.18 },
    { f: 900, start: 0.18, dur: 0.18 },
    { f: 1500, start: 0.4, dur: 0.18 },
    { f: 900, start: 0.58, dur: 0.18 },
    { f: 1600, start: 0.82, dur: 0.2 },
    { f: 850, start: 1.02, dur: 0.2 },
    { f: 1600, start: 1.28, dur: 0.22 },
    { f: 850, start: 1.5, dur: 0.22 },
  ];
  for (const t of bursts) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = t.f;
    const g0 = now + t.start;
    gain.gain.setValueAtTime(0, g0);
    gain.gain.linearRampToValueAtTime(0.9, g0 + 0.015);
    gain.gain.linearRampToValueAtTime(0.75, g0 + t.dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, g0 + t.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(g0);
    osc.stop(g0 + t.dur + 0.02);
  }
}

function ensureHtmlAudio(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  // Always rebuild so volume/src stay loud after updates
  try {
    htmlAudio = new Audio(ALERT_BEEP_DATA_URI);
    htmlAudio.preload = 'auto';
    htmlAudio.volume = 1;
    return htmlAudio;
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'HTMLAudio create failed';
    return null;
  }
}

function playHtmlInGesture(): boolean {
  const el = ensureHtmlAudio();
  if (!el) return false;
  try {
    el.pause();
    el.muted = false;
    el.volume = 1;
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      void p
        .then(() => {
          lastStatus = 'playing-html';
        })
        .catch((e: unknown) => {
          lastError = e instanceof Error ? e.message : 'HTMLAudio blocked';
          lastStatus = 'html-blocked';
        });
    } else {
      lastStatus = 'playing-html';
    }
    return true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'HTMLAudio failed';
    return false;
  }
}

/**
 * Call from a real user tap (no await). Keeps the browser gesture valid.
 */
export function unlockAlertAudio(): void {
  lastError = null;
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    primed = true;
    return;
  }
  try {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
    primed = true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'unlock failed';
  }
}

/**
 * Play alert from an onPress handler. Prefer sync paths; returns UI status.
 */
export function playAlertSoundNow(): string {
  lastError = null;
  primed = true;
  lastStatus = 'starting';

  try {
    // Stronger pattern for urgency
    Vibration.vibrate([0, 400, 120, 400, 120, 500]);
  } catch {
    /* web may ignore */
  }

  if (Platform.OS === 'web') {
    // Prefer the loud embedded siren WAV (clearest on phones).
    const htmlOk = playHtmlInGesture();

    // Also arm oscillator siren as backup / extra punch after resume.
    const ctx = ensureContext();
    if (ctx) {
      const kickOsc = () => {
        try {
          scheduleTones(ctx);
          lastStatus = htmlOk ? 'playing-siren' : 'playing-osc';
        } catch (e) {
          lastError = e instanceof Error ? e.message : 'oscillator failed';
        }
      };
      if (ctx.state === 'running') {
        kickOsc();
      } else {
        void ctx
          .resume()
          .then(() => kickOsc())
          .catch((e: unknown) => {
            lastError = e instanceof Error ? e.message : 'resume blocked';
          });
      }
    }

    if (htmlOk || ctx) {
      return 'Playing loud alert…';
    }
    return lastError ? `No sound: ${lastError}` : 'No sound — check media volume';
  }

  void playNativeExpoAv();
  return 'Playing…';
}

async function playNativeExpoAv(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require('expo-av') as typeof import('expo-av');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    // Prefer file asset; fall back to data URI via fetch blob if needed.
    try {
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../assets/missing-alert.wav'),
        { shouldPlay: true, volume: 1 },
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) void sound.unloadAsync();
      });
      lastStatus = 'playing-native';
      return;
    } catch {
      const { sound } = await Audio.Sound.createAsync(
        { uri: ALERT_BEEP_DATA_URI },
        { shouldPlay: true, volume: 1 },
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) void sound.unloadAsync();
      });
      lastStatus = 'playing-native-data';
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'expo-av failed';
    lastStatus = 'native-failed';
  }
}

/** Used by poller after audio was primed by a tap. */
export async function playMissingAlertSound(): Promise<void> {
  playAlertSoundNow();
}

export function isAlertAudioPrimed(): boolean {
  return primed;
}

export function getLastAlertSoundError(): string | null {
  return lastError;
}

export function getLastAlertSoundStatus(): string {
  return lastStatus;
}
