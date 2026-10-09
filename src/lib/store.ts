import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import * as api from './api';
import type { PickedFile, Sound } from './api';
import { dropLocal, PlayMode, prefetch, pruneLocal, stopAll } from './audio';

export type Filter = 'todos' | 'favoritos' | 'meus' | 'publicos' | 'privados';
export type SortKey = 'recentes' | 'az';

export type Overlay =
  | null
  | { kind: 'upload' }
  | { kind: 'form'; mode: 'new'; file: PickedFile }
  | { kind: 'form'; mode: 'edit'; soundId: string }
  | { kind: 'actions'; soundId: string }
  | { kind: 'delete'; soundId: string };

type State = {
  user: User | null;
  authReady: boolean;
  setUser: (u: User | null) => void;

  sounds: Sound[];
  favorites: Set<string>;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addSound: (s: Sound) => void;
  patchSound: (id: string, patch: Partial<Sound>) => void;
  removeSound: (s: Sound) => void;
  toggleFavorite: (id: string) => Promise<void>;

  mode: PlayMode;
  setMode: (m: PlayMode) => void;
  loadMode: () => Promise<void>;

  query: string;
  filter: Filter;
  sort: SortKey;
  set: (p: Partial<Pick<State, 'query' | 'filter' | 'sort'>>) => void;

  overlay: Overlay;
  openOverlay: (o: Overlay) => void;

  toast: { id: number; msg: string } | null;
  showToast: (msg: string) => void;
};

let toastSeq = 0;

export const useStore = create<State>((set, get) => ({
  user: null,
  authReady: false,
  setUser: (user) => {
    if (!user) {
      stopAll();
      set({ sounds: [], favorites: new Set(), overlay: null });
    }
    set({ user, authReady: true });
  },

  sounds: [],
  favorites: new Set(),
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const { sounds, favorites } = await api.fetchAll();
      set({ sounds, favorites, loading: false });
      pruneLocal(sounds);
      prefetch(sounds);
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'Erro ao carregar' });
    }
  },
  addSound: (s) => {
    const name = get().user?.user_metadata?.name as string | undefined;
    set((st) => ({ sounds: [{ ...s, owner_name: name }, ...st.sounds] }));
  },
  patchSound: (id, patch) =>
    set((st) => ({
      sounds: st.sounds.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),
  removeSound: (s) => {
    dropLocal(s);
    set((st) => {
      const favorites = new Set(st.favorites);
      favorites.delete(s.id);
      return { sounds: st.sounds.filter((x) => x.id !== s.id), favorites };
    });
  },
  toggleFavorite: async (id) => {
    const user = get().user;
    if (!user) return;
    const on = !get().favorites.has(id);
    const next = new Set(get().favorites);
    on ? next.add(id) : next.delete(id);
    set({ favorites: next });
    get().showToast(on ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    try {
      await api.setFavorite(user.id, id, on);
    } catch {
      const back = new Set(get().favorites);
      on ? back.delete(id) : back.add(id);
      set({ favorites: back });
      get().showToast('Não foi possível salvar o favorito');
    }
  },

  mode: 'caos',
  setMode: (mode) => {
    stopAll();
    set({ mode });
    AsyncStorage.setItem('mode', mode).catch(() => {});
    get().showToast(
      mode === 'caos'
        ? 'Modo caos ligado — vai ter eco'
        : 'Modo play/pause — um áudio por vez',
    );
  },
  loadMode: async () => {
    const m = await AsyncStorage.getItem('mode').catch(() => null);
    if (m === 'caos' || m === 'playpause') set({ mode: m });
  },

  query: '',
  filter: 'todos',
  sort: 'recentes',
  set: (p) => set(p),

  overlay: null,
  openOverlay: (overlay) => set({ overlay }),

  toast: null,
  showToast: (msg) => set({ toast: { id: ++toastSeq, msg } }),
}));
