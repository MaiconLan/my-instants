import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { extOf, mimeOf } from './format';

export type Sound = {
  id: string;
  owner_id: string;
  name: string;
  file_path: string;
  color: string;
  duration_ms: number | null;
  is_public: boolean;
  created_at: string;
  owner_name?: string;
};

export type PickedFile = {
  uri: string;
  name: string;
  size: number;
  durationMs: number | null;
};

export async function fetchAll(): Promise<{
  sounds: Sound[];
  favorites: Set<string>;
}> {
  const [s, p, f] = await Promise.all([
    supabase.from('sounds').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,name'),
    supabase.from('favorites').select('sound_id'),
  ]);
  if (s.error) throw s.error;
  // profiles pode não existir ainda (002_profiles.sql); segue sem nome do dono
  const names = new Map<string, string>(
    (p.data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]),
  );
  const sounds = (s.data as Sound[]).map((x) => ({
    ...x,
    owner_name: names.get(x.owner_id),
  }));
  const favorites = new Set<string>(
    (f.data ?? []).map((r: { sound_id: string }) => r.sound_id),
  );
  return { sounds, favorites };
}

export async function setFavorite(userId: string, soundId: string, on: boolean) {
  const q = on
    ? supabase.from('favorites').insert({ user_id: userId, sound_id: soundId })
    : supabase.from('favorites').delete().eq('user_id', userId).eq('sound_id', soundId);
  const { error } = await q;
  if (error) throw error;
}

/**
 * Lê o arquivo escolhido. O `File.bytes()` do expo-file-system recusa caminhos fora das
 * pastas do app ("missing READ permission") — o que acontece com arquivos vindos do
 * seletor ou de outro app. O `fetch` lê file:// e content:// sem essa checagem.
 */
async function readBytes(uri: string): Promise<Uint8Array> {
  try {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return new File(uri).bytes();
  }
}

export async function uploadSound(
  userId: string,
  file: PickedFile,
  meta: { name: string; color: string; isPublic: boolean },
): Promise<Sound> {
  const ext = extOf(file.name);
  const path = `${userId}/${randomUUID()}.${ext}`;
  const bytes = await readBytes(file.uri);
  const up = await supabase.storage
    .from('audios')
    .upload(path, bytes, { contentType: mimeOf(ext) });
  if (up.error) throw up.error;

  const ins = await supabase
    .from('sounds')
    .insert({
      name: meta.name,
      file_path: path,
      color: meta.color,
      duration_ms: file.durationMs,
      is_public: meta.isPublic,
    })
    .select('*')
    .single();
  if (ins.error) {
    await supabase.storage.from('audios').remove([path]);
    throw ins.error;
  }
  return ins.data as Sound;
}

export async function updateSound(
  id: string,
  patch: { name: string; color: string; is_public: boolean },
) {
  const { data, error } = await supabase
    .from('sounds')
    .update(patch)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  // O RLS filtra em silêncio: sem linha de volta, nada foi alterado.
  if (!data?.length) throw new Error('Você não tem permissão para editar este áudio.');
}

export async function deleteSound(sound: Sound) {
  const del = await supabase.from('sounds').delete().eq('id', sound.id);
  if (del.error) throw del.error;
  await supabase.storage.from('audios').remove([sound.file_path]);
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('audios')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
