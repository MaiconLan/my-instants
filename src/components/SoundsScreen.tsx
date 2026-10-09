import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Sound } from '../lib/api';
import { playSound, shareSound, stopAll, useAudioStore } from '../lib/audio';
import { normalize } from '../lib/format';
import { Filter, useStore } from '../lib/store';
import { colors, fonts, SOUND_COLORS } from '../lib/theme';
import { SoundButton } from './SoundButton';
import { Icon, T } from './ui';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'favoritos', label: 'Favoritos' },
  { key: 'meus', label: 'Meus' },
  { key: 'publicos', label: 'Públicos' },
  { key: 'privados', label: 'Privados' },
];

type Item = Sound | { id: string; spacer: true };

export function SoundsScreen({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const insets = useSafeAreaInsets();
  const sounds = useStore((s) => s.sounds);
  const favorites = useStore((s) => s.favorites);
  const user = useStore((s) => s.user);
  const mode = useStore((s) => s.mode);
  const query = useStore((s) => s.query);
  const filter = useStore((s) => s.filter);
  const sort = useStore((s) => s.sort);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const set = useStore((s) => s.set);
  const load = useStore((s) => s.load);
  const openOverlay = useStore((s) => s.openOverlay);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const showToast = useStore((s) => s.showToast);
  const total = useAudioStore((s) => s.total);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    let list = sounds.filter((s) => {
      if (favoritesOnly && !favorites.has(s.id)) return false;
      if (!favoritesOnly) {
        if (filter === 'favoritos' && !favorites.has(s.id)) return false;
        if (filter === 'meus' && s.owner_id !== user?.id) return false;
        if (filter === 'publicos' && !s.is_public) return false;
        if (filter === 'privados' && s.is_public) return false;
      }
      return !q || normalize(s.name).includes(q);
    });
    if (sort === 'az') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return list;
  }, [sounds, favorites, user, query, filter, sort, favoritesOnly]);

  const data: Item[] = useMemo(
    () => (visible.length % 2 ? [...visible, { id: '__spacer', spacer: true }] : visible),
    [visible],
  );

  const onPress = useCallback(
    (s: Sound) => {
      playSound(s, mode).catch(() => showToast('Não foi possível tocar o áudio'));
    },
    [mode, showToast],
  );
  const onMore = useCallback(
    (s: Sound) => openOverlay({ kind: 'actions', soundId: s.id }),
    [openOverlay],
  );
  const onShare = useCallback(
    (s: Sound) => {
      shareSound(s).catch(() => showToast('Não foi possível compartilhar'));
    },
    [showToast],
  );
  const onFav = useCallback((s: Sound) => toggleFavorite(s.id), [toggleFavorite]);

  const emptyText = error
    ? error
    : favoritesOnly
      ? 'Toque no coração de um áudio pra ele aparecer aqui.'
      : query.trim()
        ? `Nada encontrado pra “${query.trim()}”.`
        : 'Nenhum áudio neste filtro.';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <T style={styles.title}>{favoritesOnly ? 'Favoritos' : 'My Instants'}</T>
          <Pressable
            onPress={() => useStore.getState().setMode(mode === 'caos' ? 'playpause' : 'caos')}
            style={[
              styles.modeChip,
              { backgroundColor: mode === 'caos' ? SOUND_COLORS[0] : colors.borderSoft },
            ]}
          >
            <Icon
              name={mode === 'caos' ? 'cyclone' : 'play-circle-outline'}
              size={20}
              color={mode === 'caos' ? colors.ink : colors.text}
            />
            <T
              style={[
                styles.modeLabel,
                { color: mode === 'caos' ? colors.ink : colors.text },
              ]}
            >
              {mode === 'caos' ? 'Caos' : 'Play/Pause'}
            </T>
          </Pressable>
        </View>

        <View style={styles.search}>
          <Icon name="search" size={22} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={(query) => set({ query })}
            placeholder="Buscar áudios"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => set({ query: '' })} hitSlop={8}>
              <Icon name="close" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {!favoritesOnly && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => set({ filter: f.key })}
                  style={[
                    styles.chip,
                    on
                      ? { backgroundColor: colors.text, borderColor: colors.text }
                      : { borderColor: colors.border },
                  ]}
                >
                  <T
                    style={[
                      styles.chipText,
                      { color: on ? colors.ink : colors.textSoft },
                    ]}
                  >
                    {f.label}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.meta}>
          <T style={styles.count}>
            {visible.length} {visible.length === 1 ? 'áudio' : 'áudios'}
          </T>
          <Pressable
            onPress={() => set({ sort: sort === 'recentes' ? 'az' : 'recentes' })}
            style={styles.sort}
          >
            <Icon name="swap-vert" size={18} color={colors.textSoft} />
            <T style={styles.sortText}>{sort === 'recentes' ? 'Recentes' : 'A–Z'}</T>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Icon
                name={favoritesOnly ? 'favorite-border' : 'search'}
                size={44}
                color={colors.textMuted}
              />
              <T style={styles.emptyText}>{emptyText}</T>
            </View>
          )
        }
        renderItem={({ item }) =>
          'spacer' in item ? (
            <View style={{ flex: 1 }} />
          ) : (
            <SoundButton
              sound={item}
              mode={mode}
              isFav={favorites.has(item.id)}
              onPress={onPress}
              onMore={onMore}
              onShare={onShare}
              onFav={onFav}
            />
          )
        }
      />

      {total > 0 && (
        <Pressable onPress={stopAll} style={styles.stop}>
          <Icon name="stop" size={22} color={colors.ink} />
          <T style={styles.stopText}>{total > 1 ? `Parar tudo (${total})` : 'Parar'}</T>
        </Pressable>
      )}

      {!favoritesOnly && (
        <Pressable
          onPress={() => openOverlay({ kind: 'upload' })}
          style={styles.fab}
          accessibilityLabel="Enviar áudio"
        >
          <Icon name="add" size={32} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: 6 },
  titleRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.54 },
  modeChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: { fontFamily: fonts.semibold, fontSize: 13 },
  search: {
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { height: 34, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  count: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  sortText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  list: { padding: 16, paddingBottom: 100, gap: 10, flexGrow: 1 },
  row: { gap: 10 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 24 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15 },
  stop: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 8,
  },
  stopText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
