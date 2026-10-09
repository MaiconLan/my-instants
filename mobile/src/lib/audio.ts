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
  } catch {}
  // `remove()` libera o player, mas não garante que o som já em andamento pare:
  // pausar primeiro é o que de fato silencia.
  try {
    entry.player.pause();
  } catch {}
  try {
    entry.player.remove();
  } catch {}
  sync();
}

export function stopAll() {
  [...live].forEach(release);
}

// --- cache local ---------------------------------------------------------

// Paths.document, e não Paths.cache: a pasta de cache o Android esvazia quando falta
// espaço, e aqui o áudio precisa continuar lá depois de fechar e abrir o app.
const cacheDir = new Directory(Paths.document, "sounds");
const inflight = new Map<string, Promise<File>>();

function localFile(sound: Sound): File {
  return new File(cacheDir, `${sound.id}.${extOf(sound.file_path)}`);
}

function isValid(file: File): boolean {
  return file.exists && (file.size ?? 0) > 0;
}

export function ensureLocal(sound: Sound): Promise<File> {
  const file = localFile(sound);
  if (isValid(file)) return Promise.resolve(file);
  let job = inflight.get(sound.id);
  if (!job) {
    job = download(sound, file).finally(() => inflight.delete(sound.id));
    inflight.set(sound.id, job);
  }
  return job;
}

/** Baixa para um .part e só renomeia no fim: um download cortado nunca vira cache. */
async function download(sound: Sound, file: File): Promise<File> {
  if (!cacheDir.exists) cacheDir.create({ intermediates: true });
  if (file.exists) file.delete();
  const part = new File(cacheDir, `${sound.id}.part`);
  if (part.exists) part.delete();
  const url = await signedUrl(sound.file_path);
  const got = await File.downloadFileAsync(url, part);
  if ((got.size ?? 0) <= 0) {
    got.delete();
    throw new Error("O download do áudio veio vazio.");
  }
  await got.move(file);
  return file;
}

export function dropLocal(sound: Sound) {
  try {
    const f = localFile(sound);
    if (f.exists) f.delete();
  } catch {}
}

/** Baixa em segundo plano o que ainda não está no aparelho (3 de cada vez). */
export async function prefetch(sounds: Sound[]) {
  const todo = sounds.filter((s) => !isValid(localFile(s)));
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const s = todo[i++];
      try {
        await ensureLocal(s);
      } catch {}
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/** Apaga do aparelho o que não está mais na lista (excluído, ou virou privado de outro). */
export function pruneLocal(sounds: Sound[]) {
  try {
    if (!cacheDir.exists) return;
    const keep = new Set(sounds.map((s) => s.id));
    for (const entry of cacheDir.list()) {
      if (!(entry instanceof File)) continue;
      const id = entry.name.split(".")[0];
      // Um .part de download em andamento não se mexe.
      if (entry.name.endsWith(".part")) {
        if (inflight.size === 0) entry.delete();
      } else if (!keep.has(id)) {
        entry.delete();
      }
    }
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
