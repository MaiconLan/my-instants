import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { create } from 'zustand';
import { signedUrl, Sound } from './api';
import { extOf, mimeOf, safeFileName } from './format';

export type PlayMode = 'caos' | 'playpause';

const MAX_LIVE = 8;

type Live = { soundId: string; player: AudioPlayer; sub: { remove(): void } };
const live: Live[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

type ActiveInfo = { count: number; progress: number };

export const useAudioStore = create<{
  active: Record<string, ActiveInfo>;
  total: number;
}>(() => ({ active: {}, total: 0 }));

setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
  () => {},
);

function sync() {
  const active: Record<string, ActiveInfo> = {};
  for (const l of live) {
    const prev = active[l.soundId];
    let progress = 0;
    try {
      const d = l.player.duration;
      progress = d > 0 ? Math.min(1, l.player.currentTime / d) : 0;
    } catch {}
    active[l.soundId] = { count: (prev?.count ?? 0) + 1, progress };
  }
  useAudioStore.setState({ active, total: live.length });
  if (live.length > 0 && !timer) timer = setInterval(sync, 120);
  if (live.length === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
}

function release(entry: Live) {
  const i = live.indexOf(entry);
  if (i >= 0) live.splice(i, 1);
  try {
    entry.sub.remove();
    entry.player.remove();
  } catch {}
  sync();
}

export function stopAll() {
  [...live].forEach(release);
}

// --- cache local ---------------------------------------------------------

const cacheDir = new Directory(Paths.cache, 'sounds');

export async function ensureLocal(sound: Sound): Promise<File> {
  if (!cacheDir.exists) cacheDir.create({ intermediates: true });
  const file = new File(cacheDir, `${sound.id}.${extOf(sound.file_path)}`);
  if (file.exists) return file;
  const url = await signedUrl(sound.file_path);
  return File.downloadFileAsync(url, file);
}

export function dropLocal(sound: Sound) {
  try {
    const f = new File(cacheDir, `${sound.id}.${extOf(sound.file_path)}`);
    if (f.exists) f.delete();
  } catch {}
}

// --- reprodução ------------------------------------------------------------

export async function playSound(sound: Sound, mode: PlayMode) {
  if (mode === 'playpause' && live.some((l) => l.soundId === sound.id)) {
    stopAll();
    return;
  }
  const file = await ensureLocal(sound);
  if (mode === 'playpause') stopAll();
  else if (live.length >= MAX_LIVE) release(live[0]);

  const player = createAudioPlayer({ uri: file.uri });
  const entry: Live = {
    soundId: sound.id,
    player,
    sub: player.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) release(entry);
    }),
  };
  live.push(entry);
  player.play();
  sync();
}

/** Duração em ms de um arquivo local (tenta por até ~3 s). */
export async function probeDuration(uri: string): Promise<number | null> {
  const player = createAudioPlayer({ uri });
  try {
    for (let i = 0; i < 30; i++) {
      if (player.duration > 0) return Math.round(player.duration * 1000);
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  } finally {
    player.remove();
  }
}

export async function shareSound(sound: Sound) {
  const file = await ensureLocal(sound);
  const ext = extOf(sound.file_path);
  const dir = new Directory(Paths.cache, 'share');
  if (!dir.exists) dir.create({ intermediates: true });
  const out = new File(dir, `${safeFileName(sound.name)}.${ext}`);
  if (out.exists) out.delete();
  file.copy(out);
  await Sharing.shareAsync(out.uri, { mimeType: mimeOf(ext), dialogTitle: sound.name });
}
